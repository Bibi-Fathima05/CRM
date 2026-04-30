-- ============================================================
-- FlowCRM Seed Data
-- Run this AFTER schema.sql
-- ============================================================

-- ── L1 Leads ─────────────────────────────────────────────────
INSERT INTO public.leads (name, email, company, phone, status, current_level, score, enriched_data)
VALUES
  ('Alex Rivera',      'alex@techflow.io',          'TechFlow Solutions',  '+91 98765 00001', 'new',        'l1', 85, '{"industry":"SaaS","size":"50-200","source":"LinkedIn","budget":"₹5L","requirement":"CRM Integration","timeline":"Q2"}'),
  ('Sarah Chen',       'sarah.chen@innovate.co',    'Innovate Global',     '+91 98765 00002', 'follow_up',  'l1', 92, '{"industry":"FinTech","size":"500+","source":"Referral","budget":"₹12L","requirement":"Sales Automation","timeline":"Q1"}'),
  ('Michael Scott',    'm.scott@dundermifflin.com', 'Dunder Mifflin',      '+91 98765 00003', 'new',        'l1', 45, '{"industry":"Paper","size":"10-50","source":"Cold Call"}'),
  ('Elena Rodriguez',  'elena@greenenergy.es',      'GreenEnergy Corp',    '+91 98765 00004', 'contacted',  'l1', 78, '{"industry":"Energy","size":"1000+","source":"Inbound","budget":"₹20L","requirement":"Pipeline Management","timeline":"Q3"}'),
  ('Priya Sharma',     'priya@nexustech.in',        'Nexus Technologies',  '+91 98765 00005', 'new',        'l1', 60, '{"industry":"IT Services","size":"200-500","source":"Website"}'),
  ('Rahul Mehta',      'rahul@buildfast.co',        'BuildFast Infra',     '+91 98765 00006', 'follow_up',  'l1', 55, '{"industry":"Construction","size":"100-200","source":"Referral"}');

-- ── L2 Leads ─────────────────────────────────────────────────
INSERT INTO public.leads (name, email, company, status, current_level, score, enriched_data)
VALUES
  ('James Wilson',  'j.wilson@heavyindustries.com', 'Wilson Heavy Industries', 'qualified', 'l2', 88, '{"budget":"₹30L","requirement":"Full CRM Suite","timeline":"Q1","deal_value":"3000000","stage":"demo"}'),
  ('Linda Park',    'linda@creativepulse.agency',   'CreativePulse Agency',    'qualified', 'l2', 95, '{"budget":"₹8L","requirement":"Lead Management","timeline":"Q2","deal_value":"800000","stage":"proposal"}');

-- ── L3 Leads ─────────────────────────────────────────────────
INSERT INTO public.leads (name, email, company, status, current_level, score, enriched_data)
VALUES
  ('Robert Baratheon', 'king@sevenkingdoms.net', 'Baratheon Holdings', 'qualified', 'l3', 99, '{"budget":"₹50L","requirement":"Enterprise Suite","timeline":"Immediate","deal_value":"5000000","stage":"negotiation"}'),
  ('Daenerys Targaryen','dany@dragonstone.co',   'Dragonstone Corp',   'qualified', 'l3', 97, '{"budget":"₹40L","requirement":"Full Platform","timeline":"Q1","deal_value":"4000000","stage":"ready_to_close"}');

-- ── Interactions ─────────────────────────────────────────────
INSERT INTO public.interactions (lead_id, type, content)
SELECT id, 'note', 'Initial discovery call went well. Interested in enterprise tier. Budget confirmed at ₹5L.'
FROM public.leads WHERE email = 'alex@techflow.io';

INSERT INTO public.interactions (lead_id, type, content)
SELECT id, 'call', 'Follow-up call scheduled. Decision maker is the CTO. Timeline is Q1.'
FROM public.leads WHERE email = 'sarah.chen@innovate.co';

INSERT INTO public.interactions (lead_id, type, content)
SELECT id, 'email', 'Sent product brochure and pricing deck.'
FROM public.leads WHERE email = 'j.wilson@heavyindustries.com';

INSERT INTO public.interactions (lead_id, type, content)
SELECT id, 'meeting', 'Demo completed. Very positive response. Proposal requested.'
FROM public.leads WHERE email = 'linda@creativepulse.agency';

-- ── Follow-ups ───────────────────────────────────────────────
INSERT INTO public.follow_ups (lead_id, title, due_at)
SELECT id, 'Send product roadmap', NOW() + INTERVAL '1 day'
FROM public.leads WHERE email = 'sarah.chen@innovate.co';

INSERT INTO public.follow_ups (lead_id, title, due_at)
SELECT id, 'Check in after demo', NOW() + INTERVAL '2 days'
FROM public.leads WHERE email = 'alex@techflow.io';

INSERT INTO public.follow_ups (lead_id, title, due_at)
SELECT id, 'Overdue: Send proposal', NOW() - INTERVAL '1 day'
FROM public.leads WHERE email = 'rahul@buildfast.co';

-- ── Deals ────────────────────────────────────────────────────
INSERT INTO public.deals (lead_id, value, stage, probability, health_score, risk_level, expected_close)
SELECT id, 3000000.00, 'demo', 25, 72, 'low', (CURRENT_DATE + 30)
FROM public.leads WHERE email = 'j.wilson@heavyindustries.com';

INSERT INTO public.deals (lead_id, value, stage, probability, health_score, risk_level, expected_close)
SELECT id, 800000.00, 'proposal', 45, 58, 'medium', (CURRENT_DATE + 20)
FROM public.leads WHERE email = 'linda@creativepulse.agency';

INSERT INTO public.deals (lead_id, value, stage, probability, health_score, risk_level, expected_close)
SELECT id, 5000000.00, 'negotiation', 65, 40, 'high', (CURRENT_DATE + 15)
FROM public.leads WHERE email = 'king@sevenkingdoms.net';

INSERT INTO public.deals (lead_id, value, stage, probability, health_score, risk_level, expected_close)
SELECT id, 4000000.00, 'ready_to_close', 85, 88, 'low', (CURRENT_DATE + 7)
FROM public.leads WHERE email = 'dany@dragonstone.co';

-- ── Closed deals (for forecast charts) ───────────────────────
INSERT INTO public.leads (name, email, company, status, current_level, score)
VALUES ('Won Deal Jan', 'won1@example.com', 'Alpha Corp', 'qualified', 'l3', 90);

INSERT INTO public.deals (lead_id, value, stage, probability, health_score, risk_level, expected_close, created_at)
SELECT id, 1500000.00, 'closed_won', 100, 95, 'low', CURRENT_DATE,
       (NOW() - INTERVAL '3 months')
FROM public.leads WHERE email = 'won1@example.com';

INSERT INTO public.leads (name, email, company, status, current_level, score)
VALUES ('Won Deal Feb', 'won2@example.com', 'Beta Ltd', 'qualified', 'l3', 88);

INSERT INTO public.deals (lead_id, value, stage, probability, health_score, risk_level, expected_close, created_at)
SELECT id, 2200000.00, 'closed_won', 100, 92, 'low', CURRENT_DATE,
       (NOW() - INTERVAL '2 months')
FROM public.leads WHERE email = 'won2@example.com';

INSERT INTO public.leads (name, email, company, status, current_level, score)
VALUES ('Won Deal Mar', 'won3@example.com', 'Gamma Inc', 'qualified', 'l3', 91);

INSERT INTO public.deals (lead_id, value, stage, probability, health_score, risk_level, expected_close, created_at)
SELECT id, 3100000.00, 'closed_won', 100, 89, 'low', CURRENT_DATE,
       (NOW() - INTERVAL '1 month')
FROM public.leads WHERE email = 'won3@example.com';
