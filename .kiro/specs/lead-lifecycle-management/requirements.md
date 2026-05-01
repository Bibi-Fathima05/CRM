# Requirements Document

## Introduction

FlowCRM's core function is lead capture and lifecycle management. Currently the system has a basic leads table and a 3-tier pipeline (L1 → L2 → L3) but lacks comprehensive lead capture from multiple sources, a full-detail lead sheet, and bulletproof lifecycle tracking. This feature redesigns the lead data model and all capture/management flows so that every lead — regardless of how it enters the system — carries complete customer information, a full interaction timeline, and moves through qualification and conversion stages with validated, auditable transitions. The result must be plug-and-play: runnable from a fresh Supabase project with a single migration and seed file, with no manual configuration required.

---

## Glossary

- **Lead**: A prospective customer record containing identity, contact, source, qualification, and lifecycle data.
- **Lead_Sheet**: The full-detail modal/panel view of a single lead showing all fields, lifecycle timeline, interactions, follow-ups, and deal data.
- **Lifecycle_Stage**: One of the defined stages a lead passes through: `new → contacted → follow_up → qualified → converted → closed_won / closed_lost / rejected`.
- **Pipeline_Level**: The team tier responsible for a lead: `l1` (Qualification), `l2` (Conversion), `l3` (Closure).
- **Transition**: A validated move of a lead from one Lifecycle_Stage or Pipeline_Level to the next, requiring all gate conditions to be met.
- **Capture_Source**: The origin channel through which a lead entered the system (manual form, CSV upload, Excel/Sheets paste, webhook, API, or integration).
- **Ingestion_Pipeline**: The server-side processing path that normalises, deduplicates, and persists leads from any Capture_Source.
- **Lead_Score**: A computed integer (0–100) reflecting lead quality based on profile completeness, engagement recency, and interaction depth.
- **Health_Score**: A computed integer (0–100) reflecting deal momentum for leads in L2/L3, based on recency, engagement, and stage age.
- **Duplicate**: A lead whose email or phone matches an existing lead record.
- **Enriched_Data**: The JSONB column on the leads table that stores qualification fields, custom attributes, and source metadata.
- **Audit_Log**: An immutable record of every state change, transition, and significant action on a lead or deal.
- **Webhook_Ingestion**: Receiving a lead payload via HTTP POST to a system-provided endpoint.
- **CSV_Import**: Uploading a `.csv` file or pasting tab/comma-separated text to bulk-create leads.
- **Migration**: A versioned SQL file that can be applied to a blank Supabase project to produce the full schema.
- **Seed**: A SQL file that populates demo users, sample leads across all stages, and integration stubs for immediate use after migration.

---

## Requirements

### Requirement 1: Extended Lead Data Model

**User Story:** As a system administrator, I want the leads table to capture all customer information fields, so that no lead data is ever lost or stored in an unstructured blob.

#### Acceptance Criteria

1. THE Lead_Sheet SHALL store the following identity fields: `id`, `name`, `email`, `phone`, `company`, `job_title`, `website`, `linkedin_url`, `location` (city, state, country).
2. THE Lead_Sheet SHALL store the following source fields: `source` (enum), `source_detail` (free text, e.g. campaign name or referral name), `capture_method` (enum: `manual`, `csv`, `paste`, `webhook`, `api`, `integration`), `captured_at` (timestamp of first entry).
3. THE Lead_Sheet SHALL store the following qualification fields: `budget` (numeric), `requirement` (text), `timeline` (text), `decision_maker` (boolean), `company_size` (enum), `industry` (text).
4. THE Lead_Sheet SHALL store the following lifecycle fields: `status` (enum), `current_level` (enum), `qualified_at` (timestamp), `converted_at` (timestamp), `closed_at` (timestamp), `rejection_reason` (text), `lost_reason` (text).
5. THE Lead_Sheet SHALL store the following engagement fields: `score` (integer 0–100), `last_contacted_at` (timestamp), `contact_attempts` (integer), `next_follow_up_at` (timestamp).
6. THE Lead_Sheet SHALL store `assigned_to` (user FK), `created_by` (user FK), `created_at`, and `updated_at` timestamps.
7. THE Lead_Sheet SHALL store `enriched_data` (JSONB) for arbitrary additional attributes without requiring a schema change.
8. WHEN a lead record is created or updated, THE System SHALL automatically set `updated_at` to the current timestamp via a database trigger.
9. IF a lead's `email` or `phone` matches an existing lead record, THEN THE Ingestion_Pipeline SHALL flag the incoming record as a Duplicate and surface it for review rather than silently overwriting.

---

### Requirement 2: Lead Capture — Manual Form

**User Story:** As an L1 agent, I want to create a lead using a form that captures all customer information, so that no data is missing from the moment a lead enters the system.

#### Acceptance Criteria

1. WHEN an agent opens the "Add Lead" form, THE Lead_Sheet SHALL display input fields for all identity, source, and qualification fields defined in Requirement 1.
2. THE Lead_Sheet SHALL require `name` (minimum 2 characters) before the form can be submitted.
3. WHEN `email` is provided, THE Lead_Sheet SHALL validate it against RFC 5322 format before submission.
4. WHEN `phone` is provided, THE Lead_Sheet SHALL accept international formats (E.164 and common local formats) and normalise to E.164 on save.
5. THE Lead_Sheet SHALL present `source` as a dropdown with values: `website`, `referral`, `linkedin`, `cold_call`, `typeform`, `google_forms`, `widget`, `csv`, `api`, `webhook`, `other`.
6. WHEN a form is submitted successfully, THE System SHALL create the lead with `status = new`, `current_level = l1`, `capture_method = manual`, and `created_by` set to the authenticated user's ID.
7. WHEN a form is submitted successfully, THE System SHALL fire the `lead.created` webhook event with the full lead payload.
8. IF a duplicate is detected on submission, THEN THE Lead_Sheet SHALL display a warning showing the existing lead's name, email, and creation date, and SHALL require the agent to explicitly confirm before saving.

---

### Requirement 3: Lead Capture — CSV Upload

**User Story:** As an L1 agent, I want to upload a CSV file to bulk-import leads, so that I can onboard large lists from any spreadsheet tool without manual data entry.

#### Acceptance Criteria

1. WHEN a CSV file is uploaded, THE Ingestion_Pipeline SHALL parse it and auto-detect column mappings using fuzzy header matching for all fields defined in Requirement 1 (not just name/email/phone/company/source).
2. THE Ingestion_Pipeline SHALL support comma-delimited and tab-delimited files.
3. WHEN parsing is complete, THE Lead_Sheet SHALL display a preview table showing all parsed rows with inline editing before import is confirmed.
4. WHEN a row is missing `name`, THE Ingestion_Pipeline SHALL mark it as invalid, display the row number and reason, and exclude it from import while allowing valid rows to proceed.
5. WHEN a row's email matches an existing lead, THE Ingestion_Pipeline SHALL flag it as a Duplicate in the preview table with a visual indicator.
6. WHEN import is confirmed, THE Ingestion_Pipeline SHALL set `capture_method = csv` and `source` from the parsed column (or a user-selected default) on each created lead.
7. WHEN import completes, THE System SHALL display a summary: total rows parsed, leads created, duplicates skipped, and rows with errors.
8. THE Ingestion_Pipeline SHALL process up to 1,000 rows per import batch without timeout or data loss.

---

### Requirement 4: Lead Capture — Excel / Google Sheets Paste

**User Story:** As an L1 agent, I want to paste copied cells from Excel or Google Sheets directly into the CRM, so that I can import leads without saving intermediate files.

#### Acceptance Criteria

1. WHEN tab-separated text is pasted into the import textarea, THE Ingestion_Pipeline SHALL parse it using the same column-mapping logic as CSV upload (Requirement 3, criterion 1).
2. WHEN the pasted data contains a header row, THE Ingestion_Pipeline SHALL use it for column mapping; WHEN no header row is detected, THE Lead_Sheet SHALL prompt the agent to map columns manually.
3. WHEN parsing is complete, THE Lead_Sheet SHALL display the same preview and editing experience as CSV upload (Requirement 3, criterion 3).
4. WHEN import is confirmed, THE Ingestion_Pipeline SHALL set `capture_method = paste` on each created lead.

---

### Requirement 5: Lead Capture — Webhook Ingestion

**User Story:** As a system administrator, I want external tools (Typeform, Google Forms, Zapier, n8n) to push leads via HTTP POST, so that lead capture is automated from any source without manual intervention.

#### Acceptance Criteria

1. THE System SHALL expose a public HTTP POST endpoint at `/api/webhooks/leads/ingest` that accepts a JSON payload containing lead fields.
2. WHEN a webhook payload is received, THE Ingestion_Pipeline SHALL map incoming JSON keys to lead fields using a configurable field-mapping definition stored per integration.
3. WHEN a webhook payload is received, THE Ingestion_Pipeline SHALL validate that `name` is present; IF `name` is absent, THEN THE System SHALL return HTTP 422 with a descriptive error body.
4. WHEN a valid webhook payload is received, THE Ingestion_Pipeline SHALL create the lead with `capture_method = webhook`, `source` from the payload or integration config, and `created_at` set to the current server timestamp.
5. WHEN a webhook lead is created, THE System SHALL return HTTP 201 with the created lead's `id` and `status` in the response body.
6. THE System SHALL authenticate webhook requests using a per-integration secret token passed in the `X-FlowCRM-Token` header; IF the token is invalid or absent, THEN THE System SHALL return HTTP 401.
7. WHEN a webhook payload contains a duplicate email, THE Ingestion_Pipeline SHALL update the existing lead's `source_detail` and `enriched_data` rather than creating a duplicate, and SHALL return HTTP 200 with the existing lead's `id`.

---

### Requirement 6: Lead Capture — API Ingestion

**User Story:** As a developer integrating FlowCRM into another system, I want a REST API endpoint to create leads programmatically, so that any application can push leads without using the UI.

#### Acceptance Criteria

1. THE System SHALL expose an authenticated REST endpoint `POST /api/leads` that accepts a JSON body with all lead fields defined in Requirement 1.
2. WHEN a valid API request is received, THE Ingestion_Pipeline SHALL create the lead with `capture_method = api` and return HTTP 201 with the full lead object.
3. THE System SHALL authenticate API requests using Bearer tokens (Supabase service role key or a scoped API key); IF authentication fails, THEN THE System SHALL return HTTP 401.
4. WHEN the API request body fails validation, THE System SHALL return HTTP 422 with a JSON error object listing each invalid field and the reason.
5. THE System SHALL rate-limit API ingestion to 100 requests per minute per API key; WHEN the limit is exceeded, THE System SHALL return HTTP 429.

---

### Requirement 7: Lead Sheet — Comprehensive View

**User Story:** As any CRM user, I want to open a lead and see all of its information in one place, so that I never have to navigate multiple screens to understand a lead's full context.

#### Acceptance Criteria

1. WHEN a lead row is clicked anywhere in the system, THE Lead_Sheet SHALL open as a full-screen slide-over panel (not a separate page navigation) displaying all lead fields.
2. THE Lead_Sheet SHALL display the following sections: Identity & Contact, Source & Capture, Qualification Details, Lifecycle Timeline, Interactions, Follow-ups, and (for L2/L3 leads) Deal Information.
3. THE Lead_Sheet SHALL display the lead's current Lifecycle_Stage and Pipeline_Level prominently at the top with a visual stage progress indicator.
4. WHEN the Lead_Sheet is open, THE System SHALL display the Lead_Score and (for L2/L3) Health_Score as numeric values with colour-coded indicators (green ≥ 75, amber 50–74, red < 50).
5. THE Lead_Sheet SHALL display the complete Lifecycle_Timeline as a chronological list of all status changes, Pipeline_Level transitions, interactions, and follow-up completions, each with actor name, timestamp, and description.
6. WHEN a field in the Lead_Sheet is clicked by an authorised user, THE Lead_Sheet SHALL allow inline editing of that field and save on blur or Enter key.
7. WHEN an inline edit is saved, THE System SHALL write an Audit_Log entry recording the field name, old value, new value, actor ID, and timestamp.
8. THE Lead_Sheet SHALL display all scheduled and completed follow-ups with their due dates, completion status, and the agent who created them.
9. THE Lead_Sheet SHALL allow adding a new interaction (call, email, meeting, note, WhatsApp) directly from the sheet without closing it.
10. WHEN a new interaction is added, THE System SHALL update `last_contacted_at` and `contact_attempts` on the lead record and recalculate Lead_Score.

---

### Requirement 8: Lifecycle Stage Management

**User Story:** As a CRM user, I want lead stages to progress through a defined, validated sequence, so that no lead can skip stages or move backwards without an explicit override.

#### Acceptance Criteria

1. THE System SHALL enforce the following Lifecycle_Stage sequence: `new → contacted → follow_up → qualified → converted → closed_won` or `new → [any stage] → rejected` or `new → [any stage] → not_interested` or `new → [any stage] → duplicate`.
2. WHEN a stage transition is attempted, THE System SHALL validate that all gate conditions for the target stage are met before persisting the change (see Requirement 9 for gate conditions).
3. IF a gate condition is not met, THEN THE System SHALL return a descriptive error listing each unmet condition and SHALL NOT persist the transition.
4. WHEN a stage transition is persisted, THE System SHALL write an Audit_Log entry with `action = stage_transition`, the `from_stage`, `to_stage`, `actor_id`, and timestamp.
5. WHEN a lead is moved to `qualified`, THE System SHALL set `qualified_at` to the current timestamp.
6. WHEN a lead is moved to `converted`, THE System SHALL set `converted_at` to the current timestamp and automatically create a Deal record linked to the lead.
7. WHEN a lead is moved to `closed_won` or `closed_lost`, THE System SHALL set `closed_at` to the current timestamp and update the linked Deal's `status` accordingly.
8. WHEN a lead is moved to `rejected`, THE System SHALL require a `rejection_reason` text value before the transition is persisted.
9. WHILE a lead's `status` is `closed_won`, `closed_lost`, `rejected`, or `not_interested`, THE System SHALL prevent any further stage transitions unless an admin explicitly unlocks the lead.

---

### Requirement 9: Qualification Gate — L1 to L2 Transition

**User Story:** As an L1 qualification agent, I want the system to enforce that a lead is fully qualified before it moves to L2, so that the conversion team only receives leads that meet the minimum quality bar.

#### Acceptance Criteria

1. WHEN an L1 agent attempts to transition a lead to L2, THE System SHALL verify that the following fields are populated: `budget`, `requirement`, `timeline`, `decision_maker`.
2. WHEN an L1 agent attempts to transition a lead to L2, THE System SHALL verify that the lead has at least one logged interaction of type `call`, `email`, or `meeting`.
3. WHEN an L1 agent attempts to transition a lead to L2, THE System SHALL verify that `Lead_Score` is ≥ 30.
4. IF any gate condition in criteria 1–3 is unmet, THEN THE System SHALL display a checklist of unmet conditions and SHALL NOT perform the transition.
5. WHEN all gate conditions are met and the transition is confirmed, THE System SHALL set `current_level = l2`, `status = qualified`, `qualified_at = now()`, and fire the `lead.qualified` webhook event.
6. WHEN the transition to L2 is complete, THE System SHALL automatically assign the lead to an available L2 agent using round-robin assignment if no specific agent is selected.

---

### Requirement 10: Conversion Gate — L2 to L3 Transition

**User Story:** As an L2 conversion agent, I want the system to enforce that a deal is ready before it escalates to L3 closure, so that the closure team only handles deals with a proposal and confirmed value.

#### Acceptance Criteria

1. WHEN an L2 agent attempts to transition a lead to L3, THE System SHALL verify that a Deal record exists and has `value > 0`.
2. WHEN an L2 agent attempts to transition a lead to L3, THE System SHALL verify that a Proposal record exists with `status = sent` or `status = accepted`.
3. WHEN an L2 agent attempts to transition a lead to L3, THE System SHALL verify that the Deal's `expected_close` date is set.
4. WHEN an L2 agent attempts to transition a lead to L3, THE System SHALL verify that `Health_Score` is ≥ 25.
5. IF any gate condition in criteria 1–4 is unmet, THEN THE System SHALL display a checklist of unmet conditions and SHALL NOT perform the transition.
6. WHEN all gate conditions are met and the transition is confirmed, THE System SHALL set `current_level = l3`, `status = converted`, `converted_at = now()`, and fire the `lead.converted` webhook event.

---

### Requirement 11: Lead Scoring

**User Story:** As an L1 agent, I want each lead to have an automatically computed score, so that I can prioritise which leads to contact first without manual assessment.

#### Acceptance Criteria

1. THE Lead_Scorer SHALL compute Lead_Score as an integer from 0 to 100 using the following weighted factors: profile completeness (25 pts), interaction count (25 pts), recency of last contact (25 pts), and qualification field completeness (25 pts).
2. WHEN a lead is created, THE Lead_Scorer SHALL compute and store the initial Lead_Score.
3. WHEN any of the following events occur, THE Lead_Scorer SHALL recompute and persist the Lead_Score: a new interaction is added, a qualification field is updated, `last_contacted_at` is updated.
4. THE Lead_Scorer SHALL compute profile completeness as: 5 pts each for `email`, `phone`, `company`, `job_title`, `location` being non-null (max 25 pts).
5. THE Lead_Scorer SHALL compute interaction score as: min(interaction_count × 5, 25) pts.
6. THE Lead_Scorer SHALL compute recency score as: 25 pts if contacted within 24 h, 18 pts within 48 h, 10 pts within 7 days, 5 pts within 30 days, 0 pts otherwise.
7. THE Lead_Scorer SHALL compute qualification completeness as: min(populated_qualification_fields / 4 × 25, 25) pts, where qualification fields are `budget`, `requirement`, `timeline`, `decision_maker`.
8. WHEN Lead_Score changes, THE System SHALL update the `score` column on the leads table atomically.

---

### Requirement 12: Duplicate Detection

**User Story:** As an L1 agent, I want the system to detect duplicate leads automatically, so that the same contact is never worked twice by different agents.

#### Acceptance Criteria

1. WHEN a lead is created or imported, THE Ingestion_Pipeline SHALL check for existing leads with a matching `email` (case-insensitive) or matching `phone` (normalised E.164).
2. WHEN a duplicate is detected during manual creation, THE Lead_Sheet SHALL display a modal warning with the existing lead's name, email, phone, current status, and assigned agent before allowing the user to proceed.
3. WHEN a duplicate is detected during CSV/paste import, THE Ingestion_Pipeline SHALL mark the row with a `DUPLICATE` flag in the preview table and exclude it from the default import selection.
4. WHEN a duplicate is detected during webhook or API ingestion, THE Ingestion_Pipeline SHALL merge the incoming `source_detail` and `enriched_data` into the existing lead record and SHALL NOT create a new record.
5. THE Ingestion_Pipeline SHALL log every duplicate detection event in `audit_logs` with `action = duplicate_detected` and the matched field (`email` or `phone`).

---

### Requirement 13: Lifecycle Timeline

**User Story:** As any CRM user, I want to see a complete, chronological history of everything that has happened to a lead, so that I can understand the full context without asking colleagues.

#### Acceptance Criteria

1. THE Lifecycle_Timeline SHALL display every event in reverse-chronological order (newest first) with a timestamp, actor name, and event description.
2. THE Lifecycle_Timeline SHALL include the following event types: lead created, field updated (showing old → new value), stage transition, Pipeline_Level transition, interaction logged, follow-up created, follow-up completed, duplicate detected, webhook received, and deal created.
3. WHEN a stage transition event is displayed, THE Lifecycle_Timeline SHALL show the `from_stage`, `to_stage`, and the name of the agent who performed the transition.
4. THE Lifecycle_Timeline SHALL be sourced from the `audit_logs` and `interactions` tables, joined and sorted by `created_at`.
5. WHEN the Lifecycle_Timeline contains more than 50 events, THE Lead_Sheet SHALL paginate or virtualise the list to maintain render performance.

---

### Requirement 14: Plug-and-Play Setup

**User Story:** As a developer deploying FlowCRM to a new environment, I want a single migration file and seed file that set up the complete schema and demo data, so that the system is fully operational immediately after running two SQL commands.

#### Acceptance Criteria

1. THE Migration SHALL be a single idempotent SQL file (`supabase/schema.sql`) that creates all tables, indexes, triggers, RLS policies, and functions required by this feature without requiring any manual steps.
2. THE Migration SHALL add all new columns to the `leads` table using `ALTER TABLE … ADD COLUMN IF NOT EXISTS` so that it is safe to run against an existing database.
3. THE Migration SHALL create the following indexes: `leads(email)`, `leads(phone)`, `leads(status)`, `leads(current_level)`, `leads(assigned_to)`, `leads(created_at)`, `audit_logs(entity_id)`, `interactions(lead_id)`.
4. THE Seed SHALL create at least 3 demo users (one per role: l1, l2, l3) and at least 10 sample leads distributed across all Lifecycle_Stages and Pipeline_Levels.
5. THE Seed SHALL create sample interactions, follow-ups, and at least one deal record so that every UI section renders with data on first load.
6. THE Migration SHALL define a `recalculate_lead_score()` database function that can be called to recompute scores for all existing leads after migration.
7. WHEN the `.env.example` file is copied to `.env.local` and the two required variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are set, THE System SHALL start without errors and all features SHALL be functional.
8. THE System SHALL include a `README.md` section titled "Quick Start" with the exact commands to run migration, seed, and start the dev server.

---

### Requirement 15: Real-time Updates

**User Story:** As a CRM user, I want lead data to update in real time across all open browser tabs, so that I always see the current state without manually refreshing.

#### Acceptance Criteria

1. WHEN a lead's `status`, `current_level`, `score`, or `assigned_to` changes in the database, THE System SHALL push the update to all connected clients subscribed to that lead via Supabase Realtime within 2 seconds.
2. WHEN a new interaction is added to a lead, THE System SHALL update the Lifecycle_Timeline in all open Lead_Sheet instances for that lead without requiring a page reload.
3. WHEN a new lead is created (by any Capture_Source), THE System SHALL add it to the leads list view in real time for all agents whose role and filter settings match the new lead.
4. WHILE a Lead_Sheet is open, THE System SHALL maintain a Supabase Realtime subscription on the `interactions` and `follow_ups` tables filtered to that lead's `id`.
