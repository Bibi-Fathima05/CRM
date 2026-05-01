import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    role: v.string(), // 'l1','l2','l3','admin'
    team_id: v.optional(v.string()),
    clerkId: v.optional(v.string()), // For auth migration if needed
  }).index("by_email", ["email"]),

  leads: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    status: v.string(),
    current_level: v.string(), // 'l1','l2','l3'
    assigned_to: v.optional(v.id("users")),
    score: v.number(),
    enriched_data: v.any(),
    job_title: v.optional(v.string()),
    website: v.optional(v.string()),
    linkedin_url: v.optional(v.string()),
    location: v.optional(v.string()),
    source: v.string(),
    source_detail: v.optional(v.string()),
    capture_method: v.string(),
    captured_at: v.number(), // timestamp
    budget: v.optional(v.number()),
    requirement: v.optional(v.string()),
    timeline: v.optional(v.string()),
    decision_maker: v.boolean(),
    company_size: v.optional(v.string()),
    industry: v.optional(v.string()),
    qualified_at: v.optional(v.number()),
    converted_at: v.optional(v.number()),
    closed_at: v.optional(v.number()),
    rejection_reason: v.optional(v.string()),
    lost_reason: v.optional(v.string()),
    last_contacted_at: v.optional(v.number()),
    contact_attempts: v.number(),
    next_follow_up_at: v.optional(v.number()),
    created_by: v.optional(v.id("users")),
  })
  .index("by_status", ["status"])
  .index("by_level", ["current_level"])
  .index("by_assigned", ["assigned_to"]),

  interactions: defineTable({
    lead_id: v.id("leads"),
    type: v.string(), // 'call','email','meeting','note','whatsapp','system'
    content: v.optional(v.string()),
    created_by: v.optional(v.id("users")),
    created_at: v.number(),
  }).index("by_lead", ["lead_id"]),

  follow_ups: defineTable({
    lead_id: v.id("leads"),
    title: v.string(),
    due_at: v.number(),
    completed: v.boolean(),
    created_by: v.optional(v.id("users")),
    created_at: v.number(),
  }).index("by_lead", ["lead_id"]),

  deals: defineTable({
    lead_id: v.id("leads"),
    assigned_to: v.optional(v.id("users")),
    value: v.number(),
    stage: v.string(),
    probability: v.number(),
    health_score: v.number(),
    risk_level: v.string(), // 'low','medium','high','critical'
    expected_close: v.optional(v.string()), // ISO date string
    status: v.string(), // 'open', 'won', 'lost'
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_lead", ["lead_id"]).index("by_assigned", ["assigned_to"]),

  proposals: defineTable({
    deal_id: v.id("deals"),
    content: v.any(),
    status: v.string(), // 'draft','sent','accepted','rejected'
    created_by: v.optional(v.id("users")),
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_deal", ["deal_id"]),

  audit_logs: defineTable({
    entity_type: v.string(),
    entity_id: v.string(), // Can't easily use v.id here since it could be multiple tables
    action: v.string(),
    metadata: v.any(),
    actor_id: v.optional(v.id("users")),
    created_by: v.optional(v.id("users")),
    created_at: v.number(),
  }).index("by_entity", ["entity_id"]),

  webhooks: defineTable({
    name: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    active: v.boolean(),
    last_triggered: v.optional(v.number()),
    created_by: v.optional(v.id("users")),
    created_at: v.number(),
    secret: v.optional(v.string()),
  }),

  integrations: defineTable({
    integration_id: v.string(),
    connected: v.boolean(),
    connected_as: v.optional(v.string()),
    config: v.any(),
    updated_at: v.number(),
  }).index("by_integration", ["integration_id"]),
});
