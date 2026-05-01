import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LEAD_STATUS, TERMINAL_STATUSES, L1_GATE, L2_GATE } from '@/lib/constants';
import { fireWebhooks } from '@/lib/webhooks';
import { normaliseLeadFields } from '@/utils/normalise';
import { findDuplicate } from '@/utils/duplicates';
import { computeLeadScore } from '@/utils/scoring';

const LEADS_KEY = 'leads';

// ── Fetch helpers ──────────────────────────────────────────────

async function fetchLeads({ level, status, assignedTo, search } = {}) {
  let q = supabase
    .from('leads')
    .select(`*, assigned_user:users!leads_assigned_to_fkey(name, avatar_url), follow_ups(*)`)
    .order('created_at', { ascending: false });

  if (level)      q = q.eq('current_level', level);
  if (status)     q = q.eq('status', status);
  if (assignedTo) q = q.eq('assigned_to', assignedTo);
  if (search)     q = q.ilike('name', `%${search}%`);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function fetchLead(id) {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      assigned_user:users!leads_assigned_to_fkey(id, name, avatar_url, role),
      interactions(*, actor:users!interactions_created_by_fkey(name, avatar_url)),
      follow_ups(*),
      deals(*, proposals(*))
    `)
    .eq('id', id)
    .order('created_at', { ascending: false, foreignTable: 'interactions' })
    .single();
  if (error) throw error;
  return data;
}

// ── Hooks ──────────────────────────────────────────────────────

export function useLeads(filters = {}) {
  return useQuery({
    queryKey: [LEADS_KEY, filters],
    queryFn: () => fetchLeads(filters),
  });
}

export function useLead(id) {
  return useQuery({
    queryKey: [LEADS_KEY, id],
    queryFn: () => fetchLead(id),
    enabled: !!id,
  });
}

// ── Create lead with duplicate check ──────────────────────────

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ force = false, ...rawPayload }) => {
      const payload = normaliseLeadFields(rawPayload, {
        captureMethod: rawPayload.capture_method || 'manual',
      });

      // Duplicate check (skip if force=true)
      if (!force && (payload.email || payload.phone)) {
        const existing = await findDuplicate(payload.email, payload.phone);
        if (existing) {
          const err = new Error('Duplicate lead detected');
          err.isDuplicate = true;
          err.existing = existing;
          throw err;
        }
      }

      const { data, error } = await supabase
        .from('leads')
        .insert({
          ...payload,
          status:        rawPayload.status        || LEAD_STATUS.NEW,
          current_level: rawPayload.current_level || 'l1',
          assigned_to:   rawPayload.assigned_to   || null,
          created_by:    rawPayload.created_by    || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateLead] Supabase error:', error);
        throw new Error(error.message || 'Failed to create lead');
      }

      // Compute and persist initial score
      const score = computeLeadScore(data, 0);
      await supabase.from('leads').update({ score }).eq('id', data.id);

      // Audit log
      await supabase.from('audit_logs').insert({
        entity_type: 'lead', entity_id: data.id,
        action: 'lead.created',
        actor_id: rawPayload.created_by || null,
        created_by: rawPayload.created_by || null,
        metadata: { capture_method: payload.capture_method, source: payload.source },
      });

      return { ...data, score };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Lead created');
      fireWebhooks('lead.created', data);
    },
    onError: (e) => {
      if (!e.isDuplicate) {
        console.error('[useCreateLead] error:', e);
        toast.error(e.message || 'Failed to create lead');
      }
    },
  });
}

// ── Bulk import ───────────────────────────────────────────────

export function useImportLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, assignedTo, captureMethod = 'csv' }) => {
      const payload = rows
        .filter(r => r.name?.trim())
        .map(r => {
          const norm = normaliseLeadFields(r, { captureMethod });
          return {
            ...norm,
            status:        LEAD_STATUS.NEW,
            current_level: 'l1',
            assigned_to:   assignedTo || null,
            created_by:    assignedTo || null,
          };
        });

      if (payload.length === 0) throw new Error('No valid rows to import');

      // Insert in batches of 100
      let created = [];
      for (let i = 0; i < payload.length; i += 100) {
        const batch = payload.slice(i, i + 100);
        const { data, error } = await supabase.from('leads').insert(batch).select();
        if (error) throw new Error(error.message);
        created = created.concat(data);
      }
      return created;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success(`${data.length} lead${data.length !== 1 ? 's' : ''} imported`);
    },
    onError: (e) => toast.error(e.message || 'Import failed'),
  });
}

// ── Update lead with audit log ────────────────────────────────

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actorId, ...updates }) => {
      const { data, error } = await supabase
        .from('leads').update(updates).eq('id', id).select().single();
      if (error) throw error;

      // Recalculate score if relevant fields changed
      const scoreFields = ['email','phone','company','job_title','location',
        'budget','requirement','timeline','decision_maker','last_contacted_at'];
      if (scoreFields.some(f => f in updates)) {
        const { data: interactions } = await supabase
          .from('interactions').select('id').eq('lead_id', id);
        const score = computeLeadScore(data, interactions?.length ?? 0);
        await supabase.from('leads').update({ score }).eq('id', id);
      }

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADS_KEY] }),
    onError: (e) => toast.error(e.message),
  });
}

// ── Inline field update with audit log ───────────────────────

export function useInlineUpdateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, field, oldValue, newValue, actorId }) => {
      const { error } = await supabase
        .from('leads').update({ [field]: newValue }).eq('id', leadId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        entity_type: 'lead', entity_id: leadId,
        action: 'lead.field_updated',
        actor_id: actorId || null,
        created_by: actorId || null,
        metadata: { field, old_value: oldValue, new_value: newValue },
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY, vars.leadId] });
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
    onError: (e) => toast.error(e.message),
  });
}

// ── Add interaction ───────────────────────────────────────────

export function useAddInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, type, content, createdBy }) => {
      const { data, error } = await supabase
        .from('interactions')
        .insert({ lead_id: leadId, type, content, created_by: createdBy })
        .select('*, actor:users!interactions_created_by_fkey(name, avatar_url)')
        .single();
      if (error) throw error;

      // Update last_contacted_at and contact_attempts for call/email/meeting
      if (['call','email','meeting'].includes(type)) {
        const { data: lead } = await supabase
          .from('leads').select('contact_attempts').eq('id', leadId).single();
        await supabase.from('leads').update({
          last_contacted_at: new Date().toISOString(),
          contact_attempts: (lead?.contact_attempts || 0) + 1,
        }).eq('id', leadId);
      }

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY, vars.leadId] });
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Interaction saved');
    },
    onError: (e) => toast.error(e.message),
  });
}

// ── Add follow-up ─────────────────────────────────────────────

export function useAddFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, title, dueAt, createdBy }) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert({ lead_id: leadId, title, due_at: dueAt, created_by: createdBy })
        .select().single();
      if (error) throw error;

      // Update next_follow_up_at on lead
      await supabase.from('leads')
        .update({ next_follow_up_at: dueAt }).eq('id', leadId);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Follow-up scheduled');
    },
    onError: (e) => toast.error(e.message),
  });
}

// ── Complete follow-up ────────────────────────────────────────

export function useCompleteFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (followUpId) => {
      const { error } = await supabase
        .from('follow_ups').update({ completed: true }).eq('id', followUpId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Follow-up complete');
    },
    onError: (e) => toast.error(e.message),
  });
}

// ── Transition lead (L1→L2 or L2→L3) with gate validation ────

export function useTransitionLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lead, actorId }) => {
      // Terminal status check
      if (TERMINAL_STATUSES.includes(lead.status)) {
        throw new Error('This lead is in a terminal status and cannot be transitioned');
      }

      const isL1toL2 = lead.current_level === 'l1';
      const isL2toL3 = lead.current_level === 'l2';

      // ── L1 → L2 gate ──────────────────────────────────────
      if (isL1toL2) {
        const unmet = [];
        if (!lead.budget)      unmet.push('Budget is required');
        if (!lead.requirement) unmet.push('Requirement is required');
        if (!lead.timeline)    unmet.push('Timeline is required');

        // Check for at least 1 qualifying interaction
        const { data: interactions } = await supabase
          .from('interactions')
          .select('id, type')
          .eq('lead_id', lead.id)
          .in('type', ['call','email','meeting']);
        if (!interactions || interactions.length === 0) {
          unmet.push('At least one call, email, or meeting interaction is required');
        }

        if ((lead.score || 0) < L1_GATE.minScore) {
          unmet.push(`Lead score must be ≥ ${L1_GATE.minScore} (current: ${lead.score || 0})`);
        }

        if (unmet.length > 0) {
          const err = new Error('Gate conditions not met');
          err.gateErrors = unmet;
          throw err;
        }

        const { data, error } = await supabase
          .from('leads')
          .update({
            current_level: 'l2',
            status: LEAD_STATUS.QUALIFIED,
            qualified_at: new Date().toISOString(),
          })
          .eq('id', lead.id).select().single();
        if (error) throw error;

        await supabase.from('audit_logs').insert({
          entity_type: 'lead', entity_id: lead.id,
          action: 'lead.level_transition',
          actor_id: actorId || null, created_by: actorId || null,
          metadata: { from_level: 'l1', to_level: 'l2', from_status: lead.status, to_status: LEAD_STATUS.QUALIFIED },
        });

        fireWebhooks('lead.qualified', data);
        return data;
      }

      // ── L2 → L3 gate ──────────────────────────────────────
      if (isL2toL3) {
        const unmet = [];

        const { data: deals } = await supabase
          .from('deals').select('*, proposals(*)').eq('lead_id', lead.id).limit(1);
        const deal = deals?.[0];

        if (!deal || !deal.value || deal.value <= 0) {
          unmet.push('A deal with a value > 0 is required');
        }
        if (!deal?.expected_close) {
          unmet.push('Expected close date must be set on the deal');
        }
        const hasProposal = deal?.proposals?.some(p => ['sent','accepted'].includes(p.status));
        if (!hasProposal) {
          unmet.push('A proposal with status "sent" or "accepted" is required');
        }
        if ((deal?.health_score || 0) < L2_GATE.minHealthScore) {
          unmet.push(`Deal health score must be ≥ ${L2_GATE.minHealthScore}`);
        }

        if (unmet.length > 0) {
          const err = new Error('Gate conditions not met');
          err.gateErrors = unmet;
          throw err;
        }

        const { data, error } = await supabase
          .from('leads')
          .update({
            current_level: 'l3',
            status: LEAD_STATUS.CONVERTED,
            converted_at: new Date().toISOString(),
          })
          .eq('id', lead.id).select().single();
        if (error) throw error;

        await supabase.from('audit_logs').insert({
          entity_type: 'lead', entity_id: lead.id,
          action: 'lead.level_transition',
          actor_id: actorId || null, created_by: actorId || null,
          metadata: { from_level: 'l2', to_level: 'l3', from_status: lead.status, to_status: LEAD_STATUS.CONVERTED },
        });

        fireWebhooks('lead.converted', data);
        return data;
      }

      throw new Error('No valid transition available for this lead');
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success(`Lead moved to ${data.current_level.toUpperCase()} 🎉`);
    },
    onError: (e) => {
      if (!e.gateErrors) toast.error(e.message);
    },
  });
}

// ── Reject lead ───────────────────────────────────────────────

export function useRejectLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason, actorId, existingData }) => {
      if (!reason?.trim()) throw new Error('Rejection reason is required');

      const { data, error } = await supabase
        .from('leads')
        .update({
          status,
          rejection_reason: reason.trim(),
          closed_at: new Date().toISOString(),
          enriched_data: { ...(existingData || {}), rejection_reason: reason.trim() },
        })
        .eq('id', id).select().single();
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        entity_type: 'lead', entity_id: id,
        action: 'lead.rejected',
        actor_id: actorId || null, created_by: actorId || null,
        metadata: { status, reason },
      });

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Lead rejected');
      fireWebhooks('lead.rejected', data);
    },
    onError: (e) => toast.error(e.message),
  });
}

// ── Update lead status (simple) ───────────────────────────────

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, actorId }) => {
      if (TERMINAL_STATUSES.includes(status)) {
        // Allow setting terminal status directly (e.g. close won/lost from L3)
      }
      const updates = { status };
      if (status === LEAD_STATUS.CLOSED_WON || status === LEAD_STATUS.CLOSED_LOST) {
        updates.closed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('leads').update(updates).eq('id', id).select().single();
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        entity_type: 'lead', entity_id: id,
        action: 'lead.stage_transition',
        actor_id: actorId || null, created_by: actorId || null,
        metadata: { to_status: status },
      });

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADS_KEY] }),
    onError: (e) => toast.error(e.message),
  });
}
