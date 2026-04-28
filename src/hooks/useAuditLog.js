import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const KEY = 'audit_logs';

export function useAuditLog({ entityId, entityType, limit = 50 } = {}) {
  return useQuery({
    queryKey: [KEY, entityId, entityType],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('*, actor:users!audit_logs_actor_id_fkey(name, avatar_url)')
        .order('timestamp', { ascending: false })
        .limit(limit);
      if (entityId) q = q.eq('entity_id', entityId);
      if (entityType) q = q.eq('entity_type', entityType);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}

export function useLogAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entityType, entityId, action, metadata }) => {
      const { error } = await supabase.from('audit_logs').insert({
        entity_type: entityType,
        entity_id: entityId,
        action,
        metadata,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
