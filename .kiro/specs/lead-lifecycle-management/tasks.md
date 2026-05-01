# Implementation Plan: Lead Lifecycle Management

## Overview

Implement the full lead lifecycle management feature incrementally, starting with the data layer (schema + seed), then the utility/logic layer (scoring, deduplication, normalisation, CSV parsing), then the hook layer (mutations, realtime), and finally the UI layer (LeadSheet component, page wiring). Each task builds directly on the previous ones so there is no orphaned code.

## Tasks

- [x] 1. Extend database schema with new columns, indexes, and score function
  - Add all new columns to `leads` table using `ALTER TABLE … ADD COLUMN IF NOT EXISTS` for: `job_title`, `website`, `linkedin_url`, `location`, `source_detail`, `capture_method` (with CHECK constraint), `captured_at`, `budget`, `requirement`, `timeline`, `decision_maker`, `company_size` (with CHECK constraint), `industry`, `qualified_at`, `converted_at`, `closed_at`, `rejection_reason`, `lost_reason`, `last_contacted_at`, `contact_attempts`, `next_follow_up_at`, `created_by`
  - Update the `status` CHECK constraint on `leads` to include `converted`, `closed_won`, `closed_lost`
  - Add `secret TEXT` column to `webhooks` table
  - Create all 8 indexes: `idx_leads_email`, `idx_leads_phone`, `idx_leads_status`, `idx_leads_current_level`, `idx_leads_assigned_to`, `idx_leads_created_at`, `idx_audit_entity_id`, `idx_interactions_lead`
  - Define `recalculate_lead_score()` SQL function that iterates all leads and updates `score` using the four-factor formula (profile 25 + interactions 25 + recency 25 + qualification 25)
  - _Requirements: 1.1–1.8, 14.1–14.3, 14.6_

- [x] 2. Update seed data with demo users and leads across all stages
  - Replace existing seed with 3 demo users inserted into `auth.users` and `public.users` (one each for l1, l2, l3 roles) with known UUIDs so subsequent inserts can reference them
  - Insert 10+ leads distributed across all `status` values (`new`, `contacted`, `follow_up`, `qualified`, `converted`, `closed_won`, `closed_lost`, `rejected`) and all `current_level` values (`l1`, `l2`, `l3`), populating all new first-class columns (not just `enriched_data`)
  - Insert sample `interactions` (at least one `call`, `email`, `meeting`, `note`) linked to leads, with `created_by` set to the demo user UUIDs
  - Insert sample `follow_ups` including at least one overdue and one upcoming, linked to leads
  - Insert at least one `deals` record with a linked `proposals` record (`status = 'sent'`) for the L3 lead
  - _Requirements: 14.4, 14.5_

- [x] 3. Implement lead scoring utility with four sub-scorers
  - Add `profileCompletenessScore(lead)` to `src/utils/scoring.js` — returns 0–25 based on non-null `email`, `phone`, `company`, `job_title`, `location` (5 pts each)
  - Add `interactionCountScore(count)` — returns `Math.min(count * 5, 25)`
  - Add `recencyScore(lastContactedAt)` — returns 25/18/10/5/0 based on hours since last contact (< 24h / < 48h / < 7d / < 30d / else)
  - Add `qualificationCompletenessScore(lead)` — returns `Math.min(populated / 4 * 25, 25)` for `budget`, `requirement`, `timeline`, `decision_maker`
  - Add `computeLeadScore(lead, interactionCount)` — sums all four sub-scorers, clamps to [0, 100], returns integer
  - Add `getScoreColour(score)` — returns `'green'` (≥ 75), `'amber'` (50–74), `'red'` (< 50)
  - _Requirements: 11.1, 11.4–11.7, 7.4_

  - [ ]* 3.1 Write property test: score is bounded [0, 100]
    - **Property 1: Lead score is bounded**
    - **Validates: Requirements 11.1**

  - [ ]* 3.2 Write property test: sub-scores are bounded and sum to total
    - **Property 2: Lead score sub-components are bounded and sum to total**
    - **Validates: Requirements 11.1, 11.4, 11.5, 11.6, 11.7**

  - [ ]* 3.3 Write property test: score colour indicator matches threshold
    - **Property 16: Score colour indicator matches threshold**
    - **Validates: Requirements 7.4**

- [x] 4. Create duplicate detection utility
  - Create `src/utils/duplicates.js`
  - Implement `normalisePhone(phone)` — strips spaces, dashes, parentheses, leading zeros; normalises to E.164 format (e.g. `+919876543210`); returns empty string for null/empty input
  - Implement `normaliseEmail(email)` — lowercases and trims; returns empty string for null/empty input
  - Implement `async findDuplicate(email, phone)` — queries Supabase `leads` table for a record matching normalised email (case-insensitive) OR normalised phone; returns the first matching lead or `null`
  - _Requirements: 1.9, 2.8, 12.1–12.5_

  - [ ]* 4.1 Write property test: phone normalisation is idempotent
    - **Property 3: Phone normalisation is idempotent**
    - **Validates: Requirements 2.4, 12.1**

  - [ ]* 4.2 Write property test: duplicate detection matches on normalised email and phone
    - **Property 4: Duplicate detection matches on normalised email and phone**
    - **Validates: Requirements 1.9, 12.1, 12.3**

- [x] 5. Create field normalisation utility
  - Create `src/utils/normalise.js`
  - Implement `normaliseLeadFields(raw)` — accepts a raw form/CSV/webhook payload object and returns a normalised lead fields object with: phone normalised to E.164 via `normalisePhone`, email lowercased via `normaliseEmail`, `source` coerced to a valid enum value (or `'other'`), `capture_method` defaulted to `'manual'` if absent, `captured_at` defaulted to `new Date().toISOString()` if absent, all string fields trimmed
  - _Requirements: 2.4, 2.6, 3.6, 4.4_

- [x] 6. Extend CSV parser with alias tables for all new fields
  - In `src/utils/csvParser.js`, add alias arrays for: `job_title`, `website`, `linkedin_url`, `location`, `source_detail`, `budget`, `requirement`, `timeline`, `industry`, `company_size` (using the alias tables from the design document)
  - Update `parseCSVText` to detect and map all new fields into the returned row objects
  - Update `getSampleCSV()` to include the new column headers in the sample template
  - Update the column guide in `L1Leads.jsx` import modal to list the new supported columns
  - _Requirements: 3.1, 3.2, 4.1_

  - [ ]* 6.1 Write property test: CSV round-trip preserves all mapped fields
    - **Property 5: CSV round-trip preserves all mapped fields**
    - **Validates: Requirements 3.1, 3.2, 4.1**

  - [ ]* 6.2 Write property test: rows missing name are excluded from parsed output
    - **Property 6: Rows missing name are excluded from parsed output**
    - **Validates: Requirements 3.4**

- [x] 7. Update constants with new status values and enums
  - In `src/lib/constants.js`, add to `LEAD_STATUS`: `CONVERTED: 'converted'`, `CLOSED_WON: 'closed_won'`, `CLOSED_LOST: 'closed_lost'`
  - Add `CAPTURE_METHOD` enum object: `MANUAL`, `CSV`, `PASTE`, `WEBHOOK`, `API`, `INTEGRATION`
  - Add `COMPANY_SIZE` enum object: `'1-10'`, `'11-50'`, `'51-200'`, `'201-1000'`, `'1000+'`
  - Add new entries to `STATUS_LABELS` and `STATUS_VARIANT` for `converted`, `closed_won`, `closed_lost`
  - Update `STATUS_FILTERS` array in `L1Leads.jsx` to include the new terminal statuses
  - Update `TRANSITION_RULES` to include the gate conditions from Requirements 9 and 10 (required fields, min score, interaction requirement)
  - _Requirements: 8.1, 8.5–8.7_

- [ ] 8. Update useLeads hooks with duplicate check, audit logging, gate validation, and inline edit
  - Update `useCreateLead` in `src/hooks/useLeads.js`: call `normaliseLeadFields` on the payload, call `findDuplicate` before insert, throw a structured `{ isDuplicate: true, existing }` error if a duplicate is found, accept all new lead fields, set `capture_method` and `captured_at`, write `audit_logs` entry with `action = 'lead.created'` after successful insert, call `computeLeadScore` and update `score` after insert
  - Update `useUpdateLead`: after a successful update, write an `audit_logs` entry with `action = 'lead.field_updated'`, `metadata = { field, oldValue, newValue }`, and call `computeLeadScore` + update `score` when qualification fields or `last_contacted_at` change
  - Update `useTransitionLead`: enforce L1→L2 gate (budget, requirement, timeline, decision_maker populated; ≥ 1 call/email/meeting interaction; score ≥ 30) and L2→L3 gate (deal with value > 0; proposal with status sent/accepted; expected_close set; health_score ≥ 25); set `qualified_at` on L1→L2, `converted_at` on L2→L3; write `audit_logs` entry with `action = 'lead.level_transition'`; fire `lead.qualified` or `lead.converted` webhook
  - Update `useRejectLead`: write `rejection_reason` to the first-class column (not just `enriched_data`); require non-empty reason; write `audit_logs` entry
  - Update `useImportLeads`: call `normaliseLeadFields` on each row, set `capture_method = 'csv'`, accept all new fields
  - Add `useInlineUpdateField` mutation: accepts `{ leadId, field, oldValue, newValue }`, updates the single field on the lead, writes `audit_logs` entry with `action = 'lead.field_updated'`, invalidates `['leads', leadId]`
  - _Requirements: 1.8, 2.6–2.8, 7.6–7.7, 8.2–8.8, 9.1–9.5, 10.1–10.6, 11.2–11.3, 12.1–12.5_

  - [ ]* 8.1 Write property test: terminal status blocks all further transitions
    - **Property 7: Terminal status blocks all further transitions**
    - **Validates: Requirements 8.1, 8.3, 8.9**

  - [ ]* 8.2 Write property test: L1→L2 gate rejects leads missing any required field or interaction
    - **Property 8: L1→L2 gate rejects leads missing any required field or interaction**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

  - [ ]* 8.3 Write property test: milestone transitions set the correct lifecycle timestamp
    - **Property 9: Milestone transitions set the correct lifecycle timestamp**
    - **Validates: Requirements 8.5, 8.6, 8.7**

  - [ ]* 8.4 Write property test: rejection requires a non-empty reason
    - **Property 10: Rejection requires a non-empty reason**
    - **Validates: Requirements 8.8**

- [ ] 9. Checkpoint — verify data and logic layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Create useLeadSheet hook for global panel state
  - Create `src/hooks/useLeadSheet.js`
  - Implement using a module-level reactive store (Zustand-style with `useState` + context, or a simple exported signal) that holds `leadId: string | null`
  - Export `useLeadSheet()` returning `{ leadId, openLead(id), closeLead() }`
  - `openLead(id)` sets `leadId`; `closeLead()` sets `leadId` to `null`
  - _Requirements: 7.1_

- [x] 11. Create useLeadRealtime hook for per-lead subscriptions
  - Create `src/hooks/useLeadRealtime.js`
  - Subscribe to `postgres_changes` on `interactions` table filtered to `lead_id=eq.{leadId}` and on `follow_ups` table filtered to `lead_id=eq.{leadId}`
  - On any change, call `qc.invalidateQueries({ queryKey: ['leads', leadId] })`
  - Clean up both channels on unmount or when `leadId` changes
  - _Requirements: 15.2, 15.4_

- [ ] 12. Create LeadSheet slide-over panel component
  - Create `src/components/leads/LeadSheet.jsx`
  - Render via `ReactDOM.createPortal` into `#lead-sheet-root` div
  - Accept props: `leadId: string | null`, `onClose: () => void`
  - Fetch lead data with `useLead(leadId)` and subscribe with `useLeadRealtime(leadId)`
  - Implement slide-in animation from the right using CSS `transform: translateX` transition; semi-transparent backdrop closes on click; Escape key closes
  - Section 1 — Identity & Contact: display and inline-edit `name`, `email`, `phone`, `company`, `job_title`, `website`, `linkedin_url`, `location`; clicking a field enters edit mode, blur/Enter saves via `useInlineUpdateField`
  - Section 2 — Source & Capture: display `source`, `source_detail`, `capture_method`, `captured_at` (read-only capture metadata)
  - Section 3 — Qualification Details: inline-edit `budget`, `requirement`, `timeline`, `decision_maker`, `company_size`, `industry`; show L1→L2 gate checklist with green/red indicators for each condition
  - Section 4 — Lifecycle Timeline: render chronological list (newest first) of all `audit_logs` entries and `interactions` for this lead, each showing actor name, timestamp, and description; paginate at 50 events
  - Section 5 — Interactions: list all interactions with type icon, content, actor, timestamp; include "Add Interaction" inline form (type selector + textarea + save button) that calls `useAddInteraction`
  - Section 6 — Follow-ups: list pending and completed follow-ups; include "Add Follow-up" inline form; mark-complete button calls `useCompleteFollowUp`
  - Section 7 — Deal Information (render only when `current_level` is `l2` or `l3`): display linked deal's stage, value, health score, expected close, and proposal status
  - Display `Lead_Score` and (for l2/l3) `Health_Score` at the top with colour-coded indicators using `getScoreColour` and `getHealthLabel`
  - Display stage progress indicator showing current position in the lifecycle sequence
  - Include "Qualify → L2" / "Qualify → L3" action button that calls `useTransitionLead` and shows gate checklist on failure
  - Include "Reject" action button that opens inline reject form requiring `rejection_reason`
  - _Requirements: 7.1–7.10, 8.1–8.9, 13.1–13.5_

  - [ ]* 12.1 Write property test: lifecycle timeline events are sorted reverse-chronologically
    - **Property 13: Lifecycle timeline events are sorted reverse-chronologically**
    - **Validates: Requirements 13.1**

  - [ ]* 12.2 Write property test: stage transition events include required display fields
    - **Property 14: Stage transition events include required display fields**
    - **Validates: Requirements 13.3**

- [ ] 13. Add #lead-sheet-root portal div and wire LeadSheet into App
  - In `index.html`, add `<div id="lead-sheet-root"></div>` after the `<div id="root">` element
  - In `src/App.jsx`, import `useLeadSheet` and `LeadSheet`
  - Render `<LeadSheet leadId={leadId} onClose={closeLead} />` inside the `<Router>` but outside `<Routes>`, so it is available on every page
  - Export `useLeadSheet` so any page can call `openLead(id)` without prop drilling
  - _Requirements: 7.1_

- [ ] 14. Update L1Leads to open LeadSheet instead of navigating
  - In `src/pages/l1/L1Leads.jsx`, import `useLeadSheet`
  - Replace `navigate(\`/l1/leads/${row.id}\`)` in `onRowClick` and the "View" button with `openLead(row.id)`
  - Replace the "Qualify" button's `navigate(\`/l1/leads/${row.id}?qualify=1\`)` with `openLead(row.id)` (the LeadSheet exposes the qualify action internally)
  - Keep the "Import Leads" and "Add Lead" buttons and their modals unchanged
  - Update the "Add Lead" form to use `normaliseLeadFields` before calling `createLead.mutateAsync`, and handle the `isDuplicate` error by showing a confirmation modal with the existing lead's details before re-submitting with a `force: true` flag
  - _Requirements: 2.8, 7.1, 12.2_

- [ ] 15. Update L1Dashboard to open LeadSheet for lead clicks
  - In `src/pages/l1/L1Dashboard.jsx`, import `useLeadSheet`
  - Replace all `navigate(\`/l1/leads/${lead.id}\`)` calls in the Priority Leads list and Follow-Up Queue with `openLead(lead.id)`
  - _Requirements: 7.1_

- [ ] 16. Checkpoint — verify full UI integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with Vitest
- The LeadSheet portal requires `#lead-sheet-root` in `index.html` (Task 13) before Task 12 can render correctly — implement Task 13 first
- The existing `L1LeadDetail` page and its route remain in place; the LeadSheet is an additive overlay. The route can be deprecated in a follow-up cleanup task
- `useInlineUpdateField` (added in Task 8) must exist before the LeadSheet inline-edit wiring in Task 12
- Seed data (Task 2) depends on the schema columns added in Task 1
