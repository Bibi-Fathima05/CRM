# FlowCRM

A role-based CRM built with React + Vite + Supabase. Three-tier sales pipeline: L1 (Qualification) → L2 (Conversion) → L3 (Closure), with an Admin layer for system management.

---

## Quick Start (Plug & Play)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd flowcrm
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Once created, go to **Project Settings → API**
3. Copy your **Project URL** and **anon public** key

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the Database Schema

In your Supabase project, go to **SQL Editor** and run:

1. **`supabase/schema.sql`** — creates all tables, RLS policies, and triggers
2. **`supabase/seed.sql`** — inserts sample leads, deals, and interactions

### 5. Create Your First User

In Supabase → **Authentication → Users → Add User**, create a user with email/password.

Then in **SQL Editor**, set their role:

```sql
UPDATE public.users SET role = 'admin', name = 'Your Name' WHERE email = 'your@email.com';
```

### 6. Start the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and log in.

---

## Roles & Access

| Role | Access | Default Route |
|------|--------|---------------|
| `l1` | Lead qualification, AI Copilot | `/l1` |
| `l2` | Pipeline, proposals, escalation | `/l2` |
| `l3` | Deal closure, approvals, forecast | `/l3` |
| `admin` | All of the above + user/webhook/integration management | `/admin` |

---

## Project Structure

```
src/
├── components/
│   ├── auth/          # ProtectedRoute
│   ├── layout/        # Sidebar, Topbar, Layout
│   └── ui/            # Design system components
├── context/
│   └── AuthContext.jsx
├── hooks/             # React Query data hooks
├── lib/               # Supabase client, constants, webhooks
├── pages/
│   ├── l1/            # L1 agent pages
│   ├── l2/            # L2 agent pages
│   ├── l3/            # L3 agent pages
│   └── admin/         # Admin pages
├── styles/            # CSS variables, global styles
└── utils/             # Formatters, scoring, transitions
supabase/
├── schema.sql         # Full DB schema — run this first
└── seed.sql           # Sample data
```

---

## Features

### L1 — Qualification Agent
- Lead list with search & status filters
- Lead detail with contact info, qualification data, interaction timeline
- Voice note input (Web Speech API)
- Qualify lead → transitions to L2 with required field validation
- Reject lead (invalid / not interested / duplicate)
- AI Call Copilot — scripts, objection handlers, qualification checklist, live call timer

### L2 — Conversion Agent
- Deal intelligence dashboard with probability gauge
- Kanban pipeline board (Contacted → Demo → Proposal → Negotiation → Ready to Close)
- Deal detail — meeting notes, AI message drafts, negotiation support panel
- Proposal builder — line items, PDF export, copy to clipboard, save to DB
- Escalate to L3 with readiness checklist

### L3 — Closure Agent
- Revenue closure dashboard — top deals, critical alerts, audit trail
- Deal management — close won/lost with notes, risk filtering
- Revenue forecast — monthly area chart, pipeline by stage, deal volume trend

### Admin
- System overview — team stats, role distribution, recently joined
- User management — search, filter by role, edit roles
- API Keys — generate, reveal, copy, revoke (scoped permissions)
- Webhooks — CRUD, toggle active/pause, 10 event types, persisted to DB
- Integrations — connect/disconnect (persisted to DB), Gmail, Calendly, Typeform, Slack, Zapier

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite |
| Routing | React Router v6 |
| State | TanStack Query v5 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| PDF | jsPDF + html2canvas |
| Styling | CSS Variables (no Tailwind) |
| Icons | Lucide React |
| Toasts | Sonner |

---

## Available Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
npm run format    # Prettier
```

---

## Webhooks

FlowCRM fires webhooks on these events:

| Event | Trigger |
|-------|---------|
| `lead.created` | New lead added |
| `lead.qualified` | Lead transitioned to next level |
| `lead.rejected` | Lead rejected |
| `deal.stage_changed` | Deal moved to new stage |
| `deal.escalated` | Deal escalated to L3 |
| `deal.closed_won` | Deal closed as won |
| `deal.closed_lost` | Deal closed as lost |
| `deal.risk_alert` | Deal risk level changed |
| `follow_up.overdue` | Follow-up past due date |
| `proposal.sent` | Proposal sent to client |

Configure endpoints in **Admin → Webhooks**.

---

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
