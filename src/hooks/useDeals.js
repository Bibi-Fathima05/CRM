import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { calculateHealthScore, getRiskLevel } from '@/utils/scoring';
import { DEAL_STAGE } from '@/lib/constants';
import { fireWebhooks } from '@/lib/webhooks';

const DEALS_KEY = 'deals';

async function fetchDeals({ stage, assignedTo, riskLevel } = {}) {
  let q = supabase
    .from('deals')
    .select(`
      *,
      lead:leads(id, name, company, email, phone),
      assigned_user:users!deals_assigned_to_fkey(id, name, avatar_url),
      proposals(id, status)
    `)
    .order('created_at', { ascending: false });

  if (stage)     q = q.eq('stage', stage);
  if (assignedTo) q = q.eq('assigned_to', assignedTo);
  if (riskLevel) q = q.eq('risk_level', riskLevel);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function fetchDeal(id) {
  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      lead:leads(*),
      assigned_user:users!deals_assigned_to_fkey(id, name, avatar_url, role),
      interactions(*, actor:users!interactions_created_by_fkey(name)),
      proposals(*),
      approvals:audit_logs!audit_logs_entity_id_fkey(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export function useDeals(filters = {}) {
  return useQuery({
    queryKey: [DEALS_KEY, filters],
    queryFn: () => fetchDeals(filters),
  });
}

export function useDeal(id) {
  return useQuery({
    queryKey: [DEALS_KEY, id],
    queryFn: () => fetchDeal(id),
    enabled: !!id,
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage, actorId }) => {
      const { data, error } = await supabase
        .from('deals')
        .update({ stage })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        entity_type: 'deal',
        entity_id: id,
        action: `stage_changed_to_${stage}`,
        actor_id: actorId ?? null,
        created_by: actorId ?? null,
        metadata: { stage },
      });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [DEALS_KEY] });
      toast.success('Deal stage updated');
      fireWebhooks('deal.stage_changed', data);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useEscalateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, leadId, actorId }) => {
      const [dealRes, leadRes] = await Promise.all([
        supabase.from('deals').update({ stage: DEAL_STAGE.READY_TO_CLOSE }).eq('id', dealId).select().single(),
        supabase.from('leads').update({ current_level: 'l3' }).eq('id', leadId).select().single(),
      ]);
      if (dealRes.error) throw dealRes.error;
      if (leadRes.error) throw leadRes.error;
      await supabase.from('audit_logs').insert({
        entity_type: 'deal',
        entity_id: dealId,
        action: 'escalated_to_l3',
        actor_id: actorId ?? null,
        created_by: actorId ?? null,
        metadata: { leadId },
      });
      return dealRes.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [DEALS_KEY] });
      toast.success('Deal escalated to L3');
      fireWebhooks('deal.escalated', data);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useCloseDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, won, notes, actorId }) => {
      const stage = won ? DEAL_STAGE.CLOSED_WON : DEAL_STAGE.CLOSED_LOST;

      // Update deal stage
      const { data, error } = await supabase
        .from('deals').update({ stage }).eq('id', id).select().single();
      if (error) throw error;

      // Also update the linked lead's status and closed_at
      if (data.lead_id) {
        await supabase.from('leads').update({
          status: won ? 'closed_won' : 'closed_lost',
          closed_at: new Date().toISOString(),
        }).eq('id', data.lead_id);
      }

      await supabase.from('audit_logs').insert({
        entity_type: 'deal', entity_id: id,
        action: won ? 'closed_won' : 'closed_lost',
        actor_id: actorId ?? null, created_by: actorId ?? null,
        metadata: { notes },
      });
      return data;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: [DEALS_KEY] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success(vars.won ? '🎉 Deal closed — Won!' : 'Deal marked as lost');
      fireWebhooks(vars.won ? 'deal.closed_won' : 'deal.closed_lost', data);
    },
    onError: (e) => toast.error(e.message),
  });
}
