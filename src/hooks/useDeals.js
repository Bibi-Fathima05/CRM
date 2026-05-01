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
  return { data, isLoading: data === undefined };
}

export function useDeal(id) {
  const data = useConvexQuery(api.deals.getDeal, id ? { id } : "skip");
  return { data, isLoading: data === undefined };
}

export function useCreateDeal() {
  const createDeal = useConvexMutation(api.deals.createDeal);

  return {
    mutateAsync: async ({ leadId, assignedTo, value, expectedClose }) => {
      const dealId = await createDeal({
        lead_id: leadId,
        assigned_to: toConvexId(assignedTo),
        value: value || 0,
        stage: DEAL_STAGE.CONTACTED,
        expected_close: expectedClose,
      });

      const data = { id: dealId, leadId, value };
      toast.success('Deal created successfully');
      fireWebhooks('deal.stage_changed', data);
      return data;
    },
    isPending: false,
  };
}

export function useUpdateDealStage() {
  const updateDealStage = useConvexMutation(api.deals.updateDealStage);

  return {
    mutateAsync: async ({ id, stage }) => {
      await updateDealStage({ id, stage });
      toast.success('Deal stage updated');
    },
    isPending: false,
  };
}

export function useEscalateDeal() {
  const updateDealStage = useConvexMutation(api.deals.updateDealStage);

  return {
    mutateAsync: async ({ dealId }) => {
      await updateDealStage({ id: dealId, stage: DEAL_STAGE.READY_TO_CLOSE });
      toast.success('Deal escalated to L3');
      fireWebhooks('deal.escalated', { id: dealId });
    },
    isPending: false,
  };
}

export function useCloseDeal() {
  const closeDeal = useConvexMutation(api.deals.closeDeal);

  return {
    mutateAsync: async ({ id, won, notes }) => {
      await closeDeal({ id, won, notes });
      toast.success(won ? 'Deal closed — Won!' : 'Deal marked as lost');
      fireWebhooks(won ? 'deal.closed_won' : 'deal.closed_lost', { id });
    },
    isPending: false,
  };
}
