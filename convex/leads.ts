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
    job_title: v.optional(v.string()),
    website: v.optional(v.string()),
    linkedin_url: v.optional(v.string()),
    location: v.optional(v.string()),
    current_level: v.string(),
    status: v.string(),
    source: v.string(),
    capture_method: v.string(),
    source_detail: v.optional(v.string()),
    budget: v.optional(v.number()),
    requirement: v.optional(v.string()),
    timeline: v.optional(v.string()),
    decision_maker: v.optional(v.boolean()),
    assigned_to: v.optional(v.id("users")),
    created_by: v.optional(v.id("users")),
    enriched_data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leads", {
      ...args,
      decision_maker: args.decision_maker ?? false,
      score: 0,
      enriched_data: args.enriched_data ?? {},
      captured_at: Date.now(),
      contact_attempts: 0,
    });
  },
});

export const importLeads = mutation({
  args: {
    rows: v.array(v.object({
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      company: v.optional(v.string()),
      job_title: v.optional(v.string()),
      website: v.optional(v.string()),
      linkedin_url: v.optional(v.string()),
      location: v.optional(v.string()),
      source: v.string(),
      source_detail: v.optional(v.string()),
      capture_method: v.string(),
      budget: v.optional(v.number()),
      requirement: v.optional(v.string()),
      timeline: v.optional(v.string()),
      decision_maker: v.optional(v.boolean()),
      enriched_data: v.optional(v.any()),
    })),
    assignedTo: v.optional(v.id("users")),
    status: v.string(),
    current_level: v.string(),
  },
  handler: async (ctx, args) => {
    const ids: string[] = [];
    for (const row of args.rows) {
      const id = await ctx.db.insert("leads", {
        ...row,
        decision_maker: row.decision_maker ?? false,
        status: args.status,
        current_level: args.current_level,
        assigned_to: args.assignedTo,
        score: 0,
        enriched_data: row.enriched_data ?? {},
        captured_at: Date.now(),
        contact_attempts: 0,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const updateLead = mutation({
  args: {
    id: v.id("leads"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    job_title: v.optional(v.string()),
    website: v.optional(v.string()),
    linkedin_url: v.optional(v.string()),
    location: v.optional(v.string()),
    status: v.optional(v.string()),
    budget: v.optional(v.number()),
    requirement: v.optional(v.string()),
    timeline: v.optional(v.string()),
    decision_maker: v.optional(v.boolean()),
    score: v.optional(v.number()),
    rejection_reason: v.optional(v.string()),
    closed_at: v.optional(v.number()),
    next_follow_up_at: v.optional(v.number()),
    enriched_data: v.optional(v.any()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

export const transitionLead = mutation({
  args: {
    id: v.id("leads"),
    toLevel: v.string(),
    toStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const ts = Date.now();
    const updates: Record<string, unknown> = {
      current_level: args.toLevel,
      status: args.toStatus,
    };
    if (args.toLevel === "l2") updates.qualified_at = ts;
    if (args.toLevel === "l3") updates.converted_at = ts;
    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

export const rejectLead = mutation({
  args: {
    id: v.id("leads"),
    status: v.string(),
    rejection_reason: v.string(),
    enriched_data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      rejection_reason: args.rejection_reason,
      closed_at: Date.now(),
      enriched_data: args.enriched_data ?? {},
    });
    return await ctx.db.get(args.id);
  },
});

export const updateLeadStatus = mutation({
  args: {
    id: v.id("leads"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.status === "closed_won" || args.status === "closed_lost") {
      updates.closed_at = Date.now();
    }
    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
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

export const addFollowUp = mutation({
  args: {
    leadId: v.id("leads"),
    title: v.string(),
    dueAt: v.number(),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("follow_ups", {
      lead_id: args.leadId,
      title: args.title,
      due_at: args.dueAt,
      completed: false,
      created_by: args.createdBy,
      created_at: Date.now(),
    });
    await ctx.db.patch(args.leadId, { next_follow_up_at: args.dueAt });
    return id;
  },
});

export const completeFollowUp = mutation({
  args: { id: v.id("follow_ups") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { completed: true });
  },
});

export const addAuditLog = mutation({
  args: {
    entity_type: v.string(),
    entity_id: v.string(),
    action: v.string(),
    metadata: v.any(),
    actor_id: v.optional(v.id("users")),
    created_by: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("audit_logs", {
      ...args,
      created_at: Date.now(),
    });
  },
});
