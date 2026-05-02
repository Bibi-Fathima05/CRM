import { useMemo } from 'react';
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from 'sonner';
import { LEAD_STATUS, TERMINAL_STATUSES, L1_GATE, L2_GATE } from '@/lib/constants';
import { fireWebhooks } from '@/lib/webhooks';
import { normaliseLeadFields } from '@/utils/normalise';
import { findDuplicate } from '@/utils/duplicates';
import { computeLeadScore } from '@/utils/scoring';

// Convex IDs never contain hyphens; "default-admin" and similar stubs are not valid IDs
function toConvexId(id) {
  return id && !String(id).includes('-') ? id : undefined;
}

export function useLeads(filters = {}) {
  const data = useConvexQuery(api.leads.getLeads, {
    level: filters.level,
    status: filters.status,
    assignedTo: toConvexId(filters.assignedTo),
  });

  const filteredData = useMemo(() => {
    if (!data) return undefined;
    if (!filters.search) return data;
    const q = filters.search.toLowerCase();
    return data.filter(lead => {
      return (
        (lead.name && lead.name.toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.company && lead.company.toLowerCase().includes(q))
      );
    });
  }, [data, filters.search]);

  return { data: filteredData, isLoading: data === undefined };
}

export function useLead(id) {
  const data = useConvexQuery(api.leads.getLead, id ? { id } : "skip");
  return { data, isLoading: data === undefined };
}

export function useCreateLead() {
  const createLead = useConvexMutation(api.leads.createLead);

  return {
    mutateAsync: async ({ force = false, ...rawPayload }) => {
      const payload = normaliseLeadFields(rawPayload, {
        captureMethod: rawPayload.capture_method || 'manual',
      });

      if (!force && (payload.email || payload.phone)) {
        const existing = await findDuplicate(payload.email, payload.phone);
        if (existing) {
          const err = new Error('Duplicate lead detected');
          err.isDuplicate = true;
          err.existing = existing;
          throw err;
        }
      }

      const leadId = await createLead(stripNulls({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        company: payload.company,
        job_title: payload.job_title,
        website: payload.website,
        linkedin_url: payload.linkedin_url,
        location: payload.location,
        current_level: rawPayload.current_level || 'l1',
        status: rawPayload.status || LEAD_STATUS.NEW,
        source: payload.source,
        source_detail: payload.source_detail,
        capture_method: payload.capture_method,
        budget: payload.budget,
        requirement: payload.requirement,
        timeline: payload.timeline,
        decision_maker: payload.decision_maker,
        assigned_to: rawPayload.assigned_to ? toConvexId(rawPayload.assigned_to) : undefined,
        created_by: rawPayload.created_by ? toConvexId(rawPayload.created_by) : undefined,
      }));

      const data = { id: leadId, ...payload };
      toast.success('Lead created');
      fireWebhooks('lead.created', data);
      return data;
    }
  };
}

// Convex rejects null for optional fields — strip them out so they become absent
function stripNulls(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));
}

export function useImportLeads() {
  const importLeads = useConvexMutation(api.leads.importLeads);

  return {
    mutateAsync: async ({ rows, assignedTo, captureMethod = 'csv' }) => {
      const payload = rows
        .filter(r => r.name?.trim())
        .map(r => {
          const norm = normaliseLeadFields(r, { captureMethod });
          return stripNulls({
            name: norm.name,
            email: norm.email,
            phone: norm.phone,
            company: norm.company,
            job_title: norm.job_title,
            website: norm.website,
            linkedin_url: norm.linkedin_url,
            location: norm.location,
            source: norm.source,
            source_detail: norm.source_detail,
            capture_method: norm.capture_method,
            budget: norm.budget,
            requirement: norm.requirement,
            timeline: norm.timeline,
            decision_maker: norm.decision_maker,
            enriched_data: norm.enriched_data,
          });
        });

      if (payload.length === 0) throw new Error('No valid rows to import');

      const ids = await importLeads({
        rows: payload,
        assignedTo: toConvexId(assignedTo),
        status: LEAD_STATUS.NEW,
        current_level: 'l1',
      });

      toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} imported`);
      return ids;
    },
    isPending: false,
  };
}

export function useUpdateLead() {
  const updateLead = useConvexMutation(api.leads.updateLead);

  return {
    mutateAsync: async ({ id, actorId, ...updates }) => {
      const data = await updateLead({ id, ...updates });
      return data;
    },
    isPending: false,
  };
}

export function useAddInteraction() {
  const addInteraction = useConvexMutation(api.leads.addInteraction);
  return {
    mutateAsync: async ({ leadId, type, content, createdBy }) => {
      const interactionId = await addInteraction({ leadId, type, content, createdBy: toConvexId(createdBy) });
      toast.success('Interaction saved');
      return interactionId;
    }
  };
}

export function useAddFollowUp() {
  const addFollowUp = useConvexMutation(api.leads.addFollowUp);

  return {
    mutateAsync: async ({ leadId, title, dueAt, createdBy }) => {
      const id = await addFollowUp({ leadId, title, dueAt, createdBy: toConvexId(createdBy) });
      toast.success('Follow-up scheduled');
      return id;
    },
    isPending: false,
  };
}

export function useCompleteFollowUp() {
  const completeFollowUp = useConvexMutation(api.leads.completeFollowUp);

  return {
    mutateAsync: async (followUpId) => {
      await completeFollowUp({ id: followUpId });
      toast.success('Follow-up complete');
    },
    isPending: false,
  };
}

export function useTransitionLead() {
  const transitionLead = useConvexMutation(api.leads.transitionLead);
  const addAuditLog = useConvexMutation(api.leads.addAuditLog);

  return {
    mutateAsync: async ({ lead, actorId }) => {
      if (TERMINAL_STATUSES.includes(lead.status)) {
        throw new Error('This lead is in a terminal status and cannot be transitioned');
      }

      const isL1toL2 = lead.current_level === 'l1';
      const isL2toL3 = lead.current_level === 'l2';

      if (isL1toL2) {
        const unmet = [];
        if (!lead.budget)      unmet.push('Budget is required');
        if (!lead.requirement) unmet.push('Requirement is required');
        if (!lead.timeline)    unmet.push('Timeline is required');
        if (!lead.interactions || lead.interactions.filter(i => ['call','email','meeting'].includes(i.type)).length === 0) {
          unmet.push('At least one call, email, or meeting interaction is required');
        }
        if (unmet.length > 0) {
          const err = new Error('Gate conditions not met');
          err.gateErrors = unmet;
          throw err;
        }

        const data = await transitionLead({ id: lead._id || lead.id, toLevel: 'l2', toStatus: LEAD_STATUS.QUALIFIED });
        await addAuditLog({
          entity_type: 'lead', entity_id: lead._id || lead.id,
          action: 'lead.level_transition',
          actor_id: toConvexId(actorId),
          created_by: toConvexId(actorId),
          metadata: { from_level: 'l1', to_level: 'l2' },
        });
        toast.success('Lead moved to L2');
        fireWebhooks('lead.qualified', data);
        return data;
      }

      if (isL2toL3) {
        const unmet = [];
        const deal = lead.deals?.[0];
        if (!deal || !deal.value || deal.value <= 0) unmet.push('A deal with a value > 0 is required');
        if (!deal?.expected_close) unmet.push('Expected close date must be set on the deal');
        const hasProposal = deal?.proposals?.some(p => ['sent','accepted'].includes(p.status));
        if (!hasProposal) unmet.push('A proposal with status "sent" or "accepted" is required');
        if ((deal?.health_score || 0) < L2_GATE.minHealthScore) unmet.push(`Deal health score must be ≥ ${L2_GATE.minHealthScore}`);
        if (unmet.length > 0) {
          const err = new Error('Gate conditions not met');
          err.gateErrors = unmet;
          throw err;
        }

        const data = await transitionLead({ id: lead._id || lead.id, toLevel: 'l3', toStatus: LEAD_STATUS.CONVERTED });
        await addAuditLog({
          entity_type: 'lead', entity_id: lead._id || lead.id,
          action: 'lead.level_transition',
          actor_id: toConvexId(actorId),
          created_by: toConvexId(actorId),
          metadata: { from_level: 'l2', to_level: 'l3' },
        });
        toast.success('Lead moved to L3');
        fireWebhooks('lead.converted', data);
        return data;
      }

      throw new Error('No valid transition available for this lead');
    },
    isPending: false,
  };
}

export function useRejectLead() {
  const rejectLead = useConvexMutation(api.leads.rejectLead);
  const addAuditLog = useConvexMutation(api.leads.addAuditLog);

  return {
    mutateAsync: async ({ id, status, reason, actorId, existingData }) => {
      if (!reason?.trim()) throw new Error('Rejection reason is required');

      const data = await rejectLead({
        id,
        status,
        rejection_reason: reason.trim(),
        enriched_data: { ...(existingData || {}), rejection_reason: reason.trim() },
      });

      await addAuditLog({
        entity_type: 'lead', entity_id: id,
        action: 'lead.rejected',
        actor_id: toConvexId(actorId),
        created_by: toConvexId(actorId),
        metadata: { status, reason },
      });

      toast.success('Lead rejected');
      fireWebhooks('lead.rejected', data);
      return data;
    },
    isPending: false,
  };
}

export function useUpdateLeadStatus() {
  const updateLeadStatus = useConvexMutation(api.leads.updateLeadStatus);
  const addAuditLog = useConvexMutation(api.leads.addAuditLog);

  return {
    mutateAsync: async ({ id, status, actorId }) => {
      const data = await updateLeadStatus({ id, status });
      await addAuditLog({
        entity_type: 'lead', entity_id: id,
        action: 'lead.stage_transition',
        actor_id: toConvexId(actorId),
        created_by: toConvexId(actorId),
        metadata: { to_status: status },
      });
      return data;
    },
    isPending: false,
  };
}

export function useInlineUpdateField() {
  const updateLead = useConvexMutation(api.leads.updateLead);
  const addAuditLog = useConvexMutation(api.leads.addAuditLog);

  return {
    mutateAsync: async ({ leadId, field, oldValue, newValue, actorId }) => {
      await updateLead({ id: leadId, [field]: newValue });
      await addAuditLog({
        entity_type: 'lead', entity_id: leadId,
        action: 'lead.field_updated',
        actor_id: toConvexId(actorId),
        created_by: toConvexId(actorId),
        metadata: { field, old_value: oldValue, new_value: newValue },
      });
    },
    isPending: false,
  };
}
