import { v } from "convex/values";
import { query } from "./_generated/server";

export const getAuditLogs = query({
  args: {
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    sinceTs: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("audit_logs")
      .order("desc")
      .collect();

    const filtered = logs.filter((log) => {
      if (args.entityType && log.entity_type !== args.entityType) return false;
      if (args.entityId && log.entity_id !== args.entityId) return false;
      if (args.sinceTs && log.created_at < args.sinceTs) return false;
      return true;
    });

    return filtered.slice(0, args.limit ?? 200);
  },
});
