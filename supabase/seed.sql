-- ============================================================
-- FlowCRM Seed Data — v2
-- Run AFTER schema.sql
-- Creates 3 demo users + 10 leads across all stages + interactions
-- ============================================================

-- ── Demo users ───────────────────────────────────────────────
-- NOTE: These insert into public.users directly.
-- In a fresh Supabase project, create auth users via the dashboard
-- or Auth API first, then run this seed.
-- For local dev, you can use the Supabase CLI: supabase db seed

-- We use fixed UUIDs so subsequent inserts can reference them.
DO $$
BEGIN
  -- L1 agent
  INSERT INTO public.users (id, email, name, role)
  VALUES ('00000000-0000-0000-0000-000000000001', 'l1agent@flowcrm.dev', 'Arjun Sharma', 'l1')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

  -- L2 agent
  INSERT INTO public.users (id, email, name, role)
  VALUES ('00000000-0000-0000-0000-000000000002', 'l2agent@flowcrm.dev', 'Priya Nair', 'l2')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

  -- L3 agent
  INSERT INTO public.users (id, email, name, role)
  VALUES ('00000000-0000-0000-0000-000000000003', 'l3agent@flowcrm.dev', 'Rahul Mehta', 'l3')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;
END $$;

-- ── Leads across all stages ───────────────────────────────────
INSERT INTO public.leads (
  name, email, phone, company, job_title, location,
  source, source_detail, capture_method,
  status, current_level,
  budget, requirement, timeline, decision_maker, company_size, industry,
  score, contact_attempts, last_contacted_at,
  assigned_to, created_by, enriched_data
) VALUES

-- L1 — New
('Alex Rivera', 'alex@techflow.io', '+919876500001', 'TechFlow Solutions', 'CTO', 'Mumbai, Maharashtra',
 'linkedin', 'LinkedIn outreach campaign Q1', 'manual',
 'new', 'l1',
 NULL, NULL, NULL, FALSE, '51-200', 'SaaS',
 10, 0, NULL,
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '{"notes": "Interested in enterprise tier"}'::jsonb),

-- L1 — Contacted
('Sarah Chen', 'sarah.chen@innovate.co', '+919876500002', 'Innovate Global', 'VP Sales', 'Bangalore, Karnataka',
 'referral', 'Referred by Raj Kumar', 'manual',
 'contacted', 'l1',
 NULL, NULL, NULL, TRUE, '500+', 'FinTech',
 20, 1, NOW() - INTERVAL '2 days',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '{}'::jsonb),

-- L1 — Follow Up (overdue)
('Michael Scott', 'm.scott@dundermifflin.com', '+919876500003', 'Dunder Mifflin', 'Regional Manager', 'Delhi, NCR',
 'cold_call', NULL, 'manual',
 'follow_up', 'l1',
 NULL, NULL, NULL, FALSE, '11-50', 'Paper',
 15, 2, NOW() - INTERVAL '5 days',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '{}'::jsonb),

-- L1 — Qualified (ready for L2)
('Elena Rodriguez', 'elena@greenenergy.es', '+919876500004', 'GreenEnergy Corp', 'Director', 'Hyderabad, Telangana',
 'website', 'Contact form — homepage', 'manual',
 'qualified', 'l1',
 500000, 'CRM for 50-person sales team', 'Q2 2026', TRUE, '201-1000', 'Energy',
 72, 3, NOW() - INTERVAL '1 day',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '{}'::jsonb),

-- L2 — Contacted (just arrived from L1)
('James Wilson', 'j.wilson@heavyindustries.com', '+919876500005', 'Wilson Heavy Industries', 'CEO', 'Chennai, Tamil Nadu',
 'referral', 'Referred by Elena Rodriguez', 'manual',
 'contacted', 'l2',
 3000000, 'Full CRM suite with API integration', 'Q1 2026', TRUE, '1000+', 'Manufacturing',
 65, 4, NOW() - INTERVAL '12 hours',
 '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
 '{}'::jsonb),

-- L2 — Proposal stage
('Linda Park', 'linda@creativepulse.agency', '+919876500006', 'CreativePulse Agency', 'Founder', 'Pune, Maharashtra',
 'linkedin', 'LinkedIn ad campaign', 'csv',
 'qualified', 'l2',
 800000, 'Lead management and pipeline tracking', 'Q2 2026', TRUE, '11-50', 'Marketing',
 78, 5, NOW() - INTERVAL '6 hours',
 '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
 '{}'::jsonb),

-- L3 — Negotiation
('Robert Baratheon', 'king@sevenkingdoms.net', '+919876500007', 'Baratheon Holdings', 'Chairman', 'Mumbai, Maharashtra',
 'website', 'Enterprise inquiry form', 'webhook',
 'converted', 'l3',
 5000000, 'Enterprise CRM with custom integrations', 'Immediate', TRUE, '1000+', 'Conglomerate',
 88, 8, NOW() - INTERVAL '3 hours',
 '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
 '{}'::jsonb),

-- L3 — Ready to close
('Daenerys Targaryen', 'dany@dragonstone.co', '+919876500008', 'Dragonstone Corp', 'CEO', 'Bangalore, Karnataka',
 'referral', 'Referred by Robert Baratheon', 'manual',
 'converted', 'l3',
 4000000, 'Full platform with AI features', 'Q1 2026', TRUE, '201-1000', 'Technology',
 92, 10, NOW() - INTERVAL '1 hour',
 '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
 '{}'::jsonb),

-- Closed Won
('Priya Sharma', 'priya@nexustech.in', '+919876500009', 'Nexus Technologies', 'CTO', 'Hyderabad, Telangana',
 'google_forms', 'Google Form — website', 'api',
 'closed_won', 'l3',
 2500000, 'Sales automation platform', 'Q4 2025', TRUE, '51-200', 'IT Services',
 95, 12, NOW() - INTERVAL '30 days',
 '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
 '{}'::jsonb),

-- Rejected
('Spam Lead', 'spam@fake.xyz', NULL, NULL, NULL, NULL,
 'website', NULL, 'webhook',
 'rejected', 'l1',
 NULL, NULL, NULL, FALSE, NULL, NULL,
 5, 1, NOW() - INTERVAL '10 days',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '{}'::jsonb)

ON CONFLICT DO NOTHING;

-- ── Interactions ─────────────────────────────────────────────
INSERT INTO public.interactions (lead_id, type, content, created_by, created_at)
SELECT l.id, 'call', 'Initial discovery call — interested in enterprise tier. Budget TBD.', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'
FROM public.leads l WHERE l.email = 'alex@techflow.io' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.interactions (lead_id, type, content, created_by, created_at)
SELECT l.id, 'call', 'Follow-up call. CTO confirmed budget of ₹5L. Needs demo.', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days'
FROM public.leads l WHERE l.email = 'sarah.chen@innovate.co' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.interactions (lead_id, type, content, created_by, created_at)
SELECT l.id, 'email', 'Sent product brochure and pricing deck.', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '4 days'
FROM public.leads l WHERE l.email = 'sarah.chen@innovate.co' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.interactions (lead_id, type, content, created_by, created_at)
SELECT l.id, 'meeting', 'Demo completed. Very positive response. Proposal requested.', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days'
FROM public.leads l WHERE l.email = 'j.wilson@heavyindustries.com' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.interactions (lead_id, type, content, created_by, created_at)
SELECT l.id, 'call', 'Qualification call — budget ₹30L confirmed, timeline Q1.', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'
FROM public.leads l WHERE l.email = 'elena@greenenergy.es' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.interactions (lead_id, type, content, created_by, created_at)
SELECT l.id, 'email', 'Sent proposal v1. Awaiting feedback.', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day'
FROM public.leads l WHERE l.email = 'linda@creativepulse.agency' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.interactions (lead_id, type, content, created_by, created_at)
SELECT l.id, 'meeting', 'Negotiation meeting. Agreed on 10% discount. Contract review pending.', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '3 hours'
FROM public.leads l WHERE l.email = 'king@sevenkingdoms.net' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.interactions (lead_id, type, content, created_by, created_at)
SELECT l.id, 'note', 'Rejected — spam/invalid contact. No response to 3 attempts.', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '9 days'
FROM public.leads l WHERE l.email = 'spam@fake.xyz' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Follow-ups ───────────────────────────────────────────────
INSERT INTO public.follow_ups (lead_id, title, due_at, completed, created_by)
SELECT l.id, 'Send product roadmap', NOW() + INTERVAL '1 day', FALSE, '00000000-0000-0000-0000-000000000001'
FROM public.leads l WHERE l.email = 'sarah.chen@innovate.co' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.follow_ups (lead_id, title, due_at, completed, created_by)
SELECT l.id, 'Follow-up call — overdue', NOW() - INTERVAL '2 days', FALSE, '00000000-0000-0000-0000-000000000001'
FROM public.leads l WHERE l.email = 'm.scott@dundermifflin.com' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.follow_ups (lead_id, title, due_at, completed, created_by)
SELECT l.id, 'Schedule demo', NOW() + INTERVAL '3 days', FALSE, '00000000-0000-0000-0000-000000000001'
FROM public.leads l WHERE l.email = 'alex@techflow.io' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.follow_ups (lead_id, title, due_at, completed, created_by)
SELECT l.id, 'Send pricing deck', NOW() - INTERVAL '1 day', TRUE, '00000000-0000-0000-0000-000000000002'
FROM public.leads l WHERE l.email = 'j.wilson@heavyindustries.com' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Deals ────────────────────────────────────────────────────
INSERT INTO public.deals (lead_id, assigned_to, value, stage, probability, health_score, risk_level, expected_close)
SELECT l.id, '00000000-0000-0000-0000-000000000002', 3000000, 'demo', 25, 72, 'low', CURRENT_DATE + 30
FROM public.leads l WHERE l.email = 'j.wilson@heavyindustries.com' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.deals (lead_id, assigned_to, value, stage, probability, health_score, risk_level, expected_close)
SELECT l.id, '00000000-0000-0000-0000-000000000002', 800000, 'proposal', 45, 78, 'medium', CURRENT_DATE + 20
FROM public.leads l WHERE l.email = 'linda@creativepulse.agency' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.deals (lead_id, assigned_to, value, stage, probability, health_score, risk_level, expected_close)
SELECT l.id, '00000000-0000-0000-0000-000000000003', 5000000, 'negotiation', 65, 88, 'low', CURRENT_DATE + 10
FROM public.leads l WHERE l.email = 'king@sevenkingdoms.net' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.deals (lead_id, assigned_to, value, stage, probability, health_score, risk_level, expected_close)
SELECT l.id, '00000000-0000-0000-0000-000000000003', 4000000, 'ready_to_close', 85, 92, 'low', CURRENT_DATE + 5
FROM public.leads l WHERE l.email = 'dany@dragonstone.co' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.deals (lead_id, assigned_to, value, stage, probability, health_score, risk_level, expected_close)
SELECT l.id, '00000000-0000-0000-0000-000000000003', 2500000, 'closed_won', 100, 95, 'low', CURRENT_DATE - 30
FROM public.leads l WHERE l.email = 'priya@nexustech.in' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Proposals ────────────────────────────────────────────────
INSERT INTO public.proposals (deal_id, status, created_by)
SELECT d.id, 'sent', '00000000-0000-0000-0000-000000000002'
FROM public.deals d
JOIN public.leads l ON l.id = d.lead_id
WHERE l.email = 'linda@creativepulse.agency' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.proposals (deal_id, status, created_by)
SELECT d.id, 'accepted', '00000000-0000-0000-0000-000000000003'
FROM public.deals d
JOIN public.leads l ON l.id = d.lead_id
WHERE l.email = 'king@sevenkingdoms.net' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Recalculate all scores ────────────────────────────────────
SELECT recalculate_lead_score();
