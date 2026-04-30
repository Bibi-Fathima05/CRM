import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const KEY = 'audit_logs';

export function useAuditLog({ entityId, entityType, limit = 50 } = {}) {
  return useQuery({
    queryKey: [KEY, entityId, entityType, limit],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('*, actor:users!audit_logs_actor_id_fkey(name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (entityId) q = q.eq('entity_id', entityId);
      if (entityType) q = q.eq('entity_type', entityType);
      const { data, error } = await q;
      if (error) throw error;
      // Normalise: expose created_at as timestamp for consumers that use either
      return (data ?? []).map(log => ({ ...log, timestamp: log.created_at }));
    },
    enabled: true,
  });
}

export function useLogAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entityType, entityId, action, metadata, actorId }) => {
      const { error } = await supabase.from('audit_logs').insert({
        entity_type: entityType,
        entity_id: entityId,
        action,
        metadata,
        actor_id: actorId ?? null,
        created_by: actorId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
