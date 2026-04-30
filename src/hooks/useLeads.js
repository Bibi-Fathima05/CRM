import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { canTransition, getNextLevel } from '@/utils/transitions';
import { LEAD_STATUS } from '@/lib/constants';
import { fireWebhooks } from '@/lib/webhooks';

const LEADS_KEY = 'leads';

// ── Fetch helpers ──────────────────────────────────────────────

async function fetchLeads({ level, status, assignedTo, search } = {}) {
  let q = supabase
    .from('leads')
    .select(`
      *,
      assigned_user:users!leads_assigned_to_fkey(name, avatar_url),
      follow_ups(*)
    `)
    .order('created_at', { ascending: false });

  if (level) q = q.eq('current_level', level);
  if (status) q = q.eq('status', status);
  if (assignedTo) q = q.eq('assigned_to', assignedTo);
  if (search) q = q.ilike('name', `%${search}%`);

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
      deals(*)
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

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('leads')
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error('[useCreateLead] Supabase error:', error);
        throw new Error(error.message || 'Failed to create lead');
      }
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Lead created successfully');
      fireWebhooks('lead.created', data);
    },
    onError: (e) => {
      console.error('[useCreateLead] error:', e);
      toast.error(e.message || 'Failed to create lead');
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Lead updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useAddFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, title, dueAt, createdBy }) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert({ lead_id: leadId, title, due_at: dueAt, created_by: createdBy })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Follow-up scheduled');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useCompleteFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (followUpId) => {
      const { error } = await supabase
        .from('follow_ups')
        .update({ completed: true })
        .eq('id', followUpId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Follow-up marked complete');
    },
    onError: (e) => toast.error(e.message),
  });
}

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
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY, vars.leadId] });
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useTransitionLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead) => {
      const { valid, errors } = canTransition(lead);
      if (!valid) throw new Error(errors.join(', '));

      const nextLevel = getNextLevel(lead.current_level);
      const { data, error } = await supabase
        .from('leads')
        .update({ current_level: nextLevel, status: LEAD_STATUS.QUALIFIED })
        .eq('id', lead.id)
        .select()
        .single();
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        entity_type: 'lead',
        entity_id: lead.id,
        action: `transitioned_to_${nextLevel}`,
        actor_id: lead.assigned_to ?? null,
        created_by: lead.assigned_to ?? null,
        metadata: { from: lead.current_level, to: nextLevel },
      });

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Lead qualified and moved to next level 🎉');
      fireWebhooks('lead.qualified', data);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useRejectLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason, existingData }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({
          status,
          enriched_data: { ...(existingData || {}), rejection_reason: reason },
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        entity_type: 'lead',
        entity_id: id,
        action: 'rejected',
        actor_id: null,
        created_by: null,
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
