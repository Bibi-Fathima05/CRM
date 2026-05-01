import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getDeals = query({
  args: {
    assignedTo: v.optional(v.id("users")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("deals");
    
    if (args.assignedTo) {
      q = q.withIndex("by_assigned", (q) => q.eq("assigned_to", args.assignedTo));
    }

    const deals = await q.order("desc").collect();
    
    // Join with leads
    return await Promise.all(
      deals.map(async (deal) => {
        const lead = await ctx.db.get(deal.lead_id);
        const proposals = await ctx.db
          .query("proposals")
          .withIndex("by_deal", (q) => q.eq("deal_id", deal._id))
          .collect();
        return { ...deal, lead, proposals };
      })
    );
  },
});

export const getDeal = query({
  args: { id: v.id("deals") },
  handler: async (ctx, args) => {
    const deal = await ctx.db.get(args.id);
    if (!deal) return null;
    
    const lead = await ctx.db.get(deal.lead_id);
    const interactions = await ctx.db
      .query("interactions")
      .withIndex("by_lead", (q) => q.eq("lead_id", deal.lead_id))
      .order("desc")
      .collect();
    
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_deal", (q) => q.eq("deal_id", deal._id))
      .collect();

    return { ...deal, lead, interactions, proposals };
  },
});

export const createDeal = mutation({
  args: {
    lead_id: v.id("leads"),
    assigned_to: v.optional(v.id("users")),
    value: v.number(),
    stage: v.string(),
    expected_close: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dealId = await ctx.db.insert("deals", {
      ...args,
      probability: 10,
      health_score: 50,
      risk_level: "medium",
      status: "open",
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    return dealId;
  },
});

export const updateDealStage = mutation({
  args: {
    id: v.id("deals"),
    stage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      stage: args.stage,
      updated_at: Date.now(),
    });
  },
});

export const createProposal = mutation({
  args: {
    deal_id: v.id("deals"),
    content: v.any(),
    status: v.string(),
    created_by: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("proposals", {
      ...args,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  },
});

export const closeDeal = mutation({
  args: {
    id: v.id("deals"),
    won: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const status = args.won ? "won" : "lost";
    await ctx.db.patch(args.id, {
      status,
      updated_at: Date.now(),
    });
  },
});
