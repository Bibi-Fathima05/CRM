import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getLeads = query({
  args: {
    level: v.optional(v.string()),
    status: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("leads");
    
    if (args.level) {
      q = q.withIndex("by_level", (q) => q.eq("current_level", args.level!));
    } else if (args.status) {
      q = q.withIndex("by_status", (q) => q.eq("status", args.status!));
    } else if (args.assignedTo) {
      q = q.withIndex("by_assigned", (q) => q.eq("assigned_to", args.assignedTo));
    }

    return await q.order("desc").collect();
  },
});

export const getLead = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) return null;
    
    const interactions = await ctx.db
      .query("interactions")
      .withIndex("by_lead", (q) => q.eq("lead_id", args.id))
      .order("desc")
      .collect();
    
    const followUps = await ctx.db
      .query("follow_ups")
      .withIndex("by_lead", (q) => q.eq("lead_id", args.id))
      .collect();

    return { ...lead, interactions, followUps };
  },
});

export const createLead = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    current_level: v.string(),
    status: v.string(),
    source: v.string(),
    capture_method: v.string(),
  },
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert("leads", {
      ...args,
      score: 0,
      enriched_data: {},
      captured_at: Date.now(),
      contact_attempts: 0,
      decision_maker: false,
    });
    return leadId;
  },
});

export const addInteraction = mutation({
  args: {
    leadId: v.id("leads"),
    type: v.string(),
    content: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const interactionId = await ctx.db.insert("interactions", {
      lead_id: args.leadId,
      type: args.type,
      content: args.content,
      created_by: args.createdBy,
      created_at: Date.now(),
    });
    
    // Update lead contact stats
    const lead = await ctx.db.get(args.leadId);
    if (lead && ["call", "email", "meeting"].includes(args.type)) {
      await ctx.db.patch(args.leadId, {
        last_contacted_at: Date.now(),
        contact_attempts: (lead.contact_attempts || 0) + 1,
      });
    }
    
    return interactionId;
  },
});
