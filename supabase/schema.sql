-- FlowCRM Database Schema

-- 1. Users table (Extends Auth Users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'l1' CHECK (role IN ('l1', 'l2', 'l3', 'admin')),
  team_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  phone TEXT,
  status TEXT DEFAULT 'new',
  current_level TEXT DEFAULT 'l1' CHECK (current_level IN ('l1', 'l2', 'l3')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  score INTEGER DEFAULT 0,
  enriched_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Interactions table
CREATE TABLE IF NOT EXISTS public.interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'call', 'email', 'note', 'status_change'
  content TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Follow-ups table
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  value DECIMAL(12, 2) DEFAULT 0.00,
  stage TEXT DEFAULT 'discovery',
  probability INTEGER DEFAULT 0,
  expected_close DATE,
  status TEXT DEFAULT 'open', -- 'open', 'won', 'lost'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'lead', 'deal', 'user'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Basic - enable for all for now to facilitate dev)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.users;
CREATE POLICY "Allow all for authenticated" ON public.users FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.leads;
CREATE POLICY "Allow all for authenticated" ON public.leads FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.interactions;
CREATE POLICY "Allow all for authenticated" ON public.interactions FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.follow_ups;
CREATE POLICY "Allow all for authenticated" ON public.follow_ups FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.deals;
CREATE POLICY "Allow all for authenticated" ON public.deals FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.audit_logs;
CREATE POLICY "Allow all for authenticated" ON public.audit_logs FOR ALL TO authenticated USING (true);

-- Trigger to create a user record when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    COALESCE(new.raw_user_meta_data->>'role', 'l1')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

