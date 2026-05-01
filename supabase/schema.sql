-- ============================================================
-- FlowCRM Database Schema — v2 (Lead Lifecycle Management)
-- Idempotent: safe to run against existing or blank database
-- ============================================================

-- ── 1. Users ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  avatar_url TEXT,
  role       TEXT DEFAULT 'l1' CHECK (role IN ('l1','l2','l3','admin')),
  team_id    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Leads ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Identity
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  company       TEXT,
  -- Lifecycle
  status        TEXT DEFAULT 'new',
  current_level TEXT DEFAULT 'l1' CHECK (current_level IN ('l1','l2','l3')),
  assigned_to   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  score         INTEGER DEFAULT 0,
  enriched_data JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- New identity columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS job_title    TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website      TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS location     TEXT;

-- Source / capture columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source        TEXT DEFAULT 'other';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_detail TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS capture_method TEXT DEFAULT 'manual'
  CHECK (capture_method IN ('manual','csv','paste','webhook','api','integration'));
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS captured_at  TIMESTAMPTZ DEFAULT NOW();

-- Qualification columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget         NUMERIC(14,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS requirement    TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS timeline       TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS decision_maker BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_size   TEXT
  CHECK (company_size IN ('1-10','11-50','51-200','201-1000','1000+'));
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS industry       TEXT;

-- Lifecycle timestamp columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS qualified_at    TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_at    TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closed_at       TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lost_reason      TEXT;

-- Engagement columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_attempts  INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;

-- Ownership
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Update status CHECK to include new terminal statuses
-- (DROP + recreate is idempotent via IF EXISTS)
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'new','contacted','follow_up','qualified',
    'converted','closed_won','closed_lost',
    'rejected','not_interested','duplicate'
  ));

-- ── 3. Interactions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interactions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id    UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('call','email','meeting','note','whatsapp','system')),
  content    TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Follow-ups ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id    UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  due_at     TIMESTAMPTZ NOT NULL,
  completed  BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Deals ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deals (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id        UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  value          NUMERIC(12,2) DEFAULT 0.00,
  stage          TEXT DEFAULT 'contacted',
  probability    INTEGER DEFAULT 0,
  health_score   INTEGER DEFAULT 50,
  risk_level     TEXT DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  expected_close DATE,
  status         TEXT DEFAULT 'open',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Proposals ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposals (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id    UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  content    JSONB DEFAULT '{}'::jsonb,
  status     TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Audit Logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}'::jsonb,
  actor_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. Webhooks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhooks (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT NOT NULL,
  url            TEXT NOT NULL,
  events         TEXT[] NOT NULL DEFAULT '{}',
  active         BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ,
  created_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.webhooks ADD COLUMN IF NOT EXISTS secret TEXT;

-- ── 9. Integrations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integrations (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id TEXT UNIQUE NOT NULL,
  connected      BOOLEAN DEFAULT FALSE,
  connected_as   TEXT,
  config         JSONB DEFAULT '{}'::jsonb,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY[
  'users','leads','interactions','follow_ups','deals',
  'proposals','audit_logs','webhooks','integrations'
]) LOOP
  EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%I', t);
  EXECUTE format('CREATE POLICY "Allow all for authenticated" ON public.%I FOR ALL TO authenticated USING (true)', t);
END LOOP; END $$;

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_email         ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone         ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status        ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_current_level ON public.leads(current_level);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to   ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at    ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity_id     ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_interactions_lead   ON public.interactions(lead_id);

-- ── Trigger: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_deals_updated_at ON public.deals;
CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger: auto-create user profile on signup ──────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id, new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    COALESCE(new.raw_user_meta_data->>'role', 'l1')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Function: recalculate_lead_score() ───────────────────────
-- Bulk-recalculates scores for all leads after migration.
-- Call manually: SELECT recalculate_lead_score();
CREATE OR REPLACE FUNCTION public.recalculate_lead_score()
RETURNS void AS $$
DECLARE
  lead_rec RECORD;
  interaction_count INTEGER;
  profile_score     INTEGER;
  interaction_score INTEGER;
  recency_score     INTEGER;
  qual_score        INTEGER;
  total_score       INTEGER;
  hours_since       NUMERIC;
  qual_fields       INTEGER;
BEGIN
  FOR lead_rec IN SELECT * FROM public.leads LOOP
    -- Profile completeness (5 pts each: email, phone, company, job_title, location)
    profile_score := 0;
    IF lead_rec.email       IS NOT NULL AND lead_rec.email       <> '' THEN profile_score := profile_score + 5; END IF;
    IF lead_rec.phone       IS NOT NULL AND lead_rec.phone       <> '' THEN profile_score := profile_score + 5; END IF;
    IF lead_rec.company     IS NOT NULL AND lead_rec.company     <> '' THEN profile_score := profile_score + 5; END IF;
    IF lead_rec.job_title   IS NOT NULL AND lead_rec.job_title   <> '' THEN profile_score := profile_score + 5; END IF;
    IF lead_rec.location    IS NOT NULL AND lead_rec.location    <> '' THEN profile_score := profile_score + 5; END IF;

    -- Interaction count (5 pts each, max 25)
    SELECT COUNT(*) INTO interaction_count FROM public.interactions WHERE lead_id = lead_rec.id;
    interaction_score := LEAST(interaction_count * 5, 25);

    -- Recency (hours since last contact)
    recency_score := 0;
    IF lead_rec.last_contacted_at IS NOT NULL THEN
      hours_since := EXTRACT(EPOCH FROM (NOW() - lead_rec.last_contacted_at)) / 3600;
      IF    hours_since < 24  THEN recency_score := 25;
      ELSIF hours_since < 48  THEN recency_score := 18;
      ELSIF hours_since < 168 THEN recency_score := 10;
      ELSIF hours_since < 720 THEN recency_score := 5;
      ELSE                         recency_score := 0;
      END IF;
    END IF;

    -- Qualification completeness (budget, requirement, timeline, decision_maker)
    qual_fields := 0;
    IF lead_rec.budget       IS NOT NULL                    THEN qual_fields := qual_fields + 1; END IF;
    IF lead_rec.requirement  IS NOT NULL AND lead_rec.requirement <> '' THEN qual_fields := qual_fields + 1; END IF;
    IF lead_rec.timeline     IS NOT NULL AND lead_rec.timeline    <> '' THEN qual_fields := qual_fields + 1; END IF;
    IF lead_rec.decision_maker = TRUE                       THEN qual_fields := qual_fields + 1; END IF;
    qual_score := LEAST((qual_fields::NUMERIC / 4) * 25, 25)::INTEGER;

    total_score := LEAST(profile_score + interaction_score + recency_score + qual_score, 100);

    UPDATE public.leads SET score = total_score WHERE id = lead_rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
