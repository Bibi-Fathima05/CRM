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
    .select(`*, assigned_user:users!leads_assigned_to_fkey(name, avatar_url)`)
    .order('created_at', { ascending: false });

  if (level) q = q.eq('current_level', level);
  if (status) q = q.eq('status', status);
  if (assignedTo) q = q.eq('assigned_to', assignedTo);
  if (search) q = q.ilike('name', `%${search}%`);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function fetchLead(id) {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      assigned_user:users!leads_assigned_to_fkey(id, name, avatar_url, role),
      interactions(*, actor:users!interactions_created_by_fkey(name)),
      follow_ups(*),
      deals(*)
    `)
    .eq('id', id)
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
      const { data, error } = await supabase.from('leads').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Lead created successfully');
      fireWebhooks('lead.created', data);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Lead updated');
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

      // Log to audit
      await supabase.from('audit_logs').insert({
        entity_type: 'lead',
        entity_id: lead.id,
        action: `transitioned_to_${nextLevel}`,
        metadata: { from: lead.current_level, to: nextLevel },
      });

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LEADS_KEY] });
      toast.success('Lead moved to next level');
      fireWebhooks('lead.qualified', data);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useRejectLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ status, enriched_data: { rejection_reason: reason } })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        entity_type: 'lead',
        entity_id: id,
        action: 'rejected',
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
