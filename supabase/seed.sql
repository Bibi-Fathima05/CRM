-- FlowCRM Seed Data

-- Insert some dummy leads for L1
INSERT INTO public.leads (name, email, company, phone, status, current_level, score, enriched_data)
VALUES 
('Alex Rivera', 'alex@techflow.io', 'TechFlow Solutions', '+1 (555) 123-4567', 'new', 'l1', 85, '{"industry": "SaaS", "size": "50-200", "source": "LinkedIn"}'),
('Sarah Chen', 'sarah.chen@innovate.co', 'Innovate Global', '+1 (555) 987-6543', 'follow_up', 'l1', 92, '{"industry": "FinTech", "size": "500+", "source": "Referral"}'),
('Michael Scott', 'm.scott@dundermifflin.com', 'Dunder Mifflin', '+1 (555) 000-1111', 'new', 'l1', 45, '{"industry": "Paper", "size": "10-50", "source": "Cold Call"}'),
('Elena Rodriguez', 'elena@greenenergy.es', 'GreenEnergy Corp', '+34 912 345 678', 'qualified', 'l1', 78, '{"industry": "Energy", "size": "1000+", "source": "Inbound"}');

-- Insert some dummy leads for L2 (Pipeline)
INSERT INTO public.leads (name, email, company, status, current_level, score)
VALUES 
('James Wilson', 'j.wilson@heavyindustries.com', 'Wilson Heavy Industries', 'in_progress', 'l2', 88),
('Linda Park', 'linda@creativepulse.agency', 'CreativePulse Agency', 'proposal_sent', 'l2', 95);

-- Insert some dummy leads for L3 (Closing)
INSERT INTO public.leads (name, email, company, status, current_level, score)
VALUES 
('Robert Baratheon', 'king@sevenkingdoms.net', 'Baratheon Holdings', 'negotiation', 'l3', 99);

-- Insert interactions for the first lead
INSERT INTO public.interactions (lead_id, type, content)
SELECT id, 'note', 'Initial discovery call went well. Interested in enterprise tier.' FROM public.leads WHERE email = 'alex@techflow.io';

-- Insert a follow-up for Sarah Chen
INSERT INTO public.follow_ups (lead_id, title, due_at)
SELECT id, 'Send product roadmap', NOW() + INTERVAL '1 day' FROM public.leads WHERE email = 'sarah.chen@innovate.co';

-- Insert a deal for the L3 lead
INSERT INTO public.deals (lead_id, value, stage, probability, expected_close)
SELECT id, 50000.00, 'negotiation', 80, (CURRENT_DATE + 15) FROM public.leads WHERE email = 'king@sevenkingdoms.net';
