import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from 'sonner';
import { DEAL_STAGE } from '@/lib/constants';
import { fireWebhooks } from '@/lib/webhooks';

function toConvexId(id) {
  return id && !String(id).includes('-') ? id : undefined;
}

export function useDeals(filters = {}) {
  const data = useConvexQuery(api.deals.getDeals, {
    assignedTo: toConvexId(filters.assignedTo),
    status: filters.status,
  });
  return { data: data ?? [], isLoading: data === undefined };
}

export function useDeal(id) {
  const data = useConvexQuery(api.deals.getDeal, id ? { id } : "skip");
  return { data, isLoading: data === undefined };
}

export function useEscalateDeal() {
  // Escalation is handled by useTransitionLead in useLeads.js
  // This stub keeps L2Escalate.jsx from breaking
  return {
    isPending: false,
    mutateAsync: async () => { toast.error('Use Qualify → L3 from the Lead Sheet'); },
  };
}

export function useAuditLogs(limit = 20) {
  const data = useConvexQuery(api.deals.getAuditLogs, { limit });
  return { data: data ?? [], isLoading: data === undefined };
}

export function useCloseDeal() {
  const closeDeal = useConvexMutation(api.deals.closeDeal);
  return {
    isPending: false,
    mutateAsync: async ({ id, won, notes, actorId }) => {
      await closeDeal({ id, won, notes, actorId: toConvexId(actorId) });
      toast.success(won ? '🎉 Deal closed — Won!' : 'Deal marked as lost');
      fireWebhooks(won ? 'deal.closed_won' : 'deal.closed_lost', { id, won });
    },
  };
}

export function useUpdateDealStage() {
  const updateStage = useConvexMutation(api.deals.updateDealStage);
  return {
    isPending: false,
    mutateAsync: async ({ id, stage, actorId }) => {
      await updateStage({ id, stage });
      toast.success('Stage updated');
      fireWebhooks('deal.stage_changed', { id, stage });
    },
  };
}

export function useCreateDeal() {
  const createDeal = useConvexMutation(api.deals.createDeal);
  return {
    isPending: false,
    mutateAsync: async (payload) => {
      const id = await createDeal(payload);
      toast.success('Deal created');
      return id;
    },
  };
}
