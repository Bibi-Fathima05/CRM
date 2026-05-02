import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listPromptConfigs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("prompt_configs").collect();
  },
});

export const getPromptConfig = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("prompt_configs")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
  },
});

export const upsertPromptConfig = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    template: v.string(),
    updated_by: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("prompt_configs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        description: args.description,
        template: args.template,
        updated_by: args.updated_by,
        updated_at: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("prompt_configs", { ...args, updated_at: now });
  },
});
