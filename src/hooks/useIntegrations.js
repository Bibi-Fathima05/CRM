import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const KEY = 'integrations';

// ── Fetch all saved integrations ─────────────────────────────────
export function useIntegrations() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*');
      if (error) throw error;
      // Return as a map: { gmail: { connected: true, connected_as: '...' }, ... }
      return (data ?? []).reduce((acc, row) => {
        acc[row.integration_id] = row;
        return acc;
      }, {});
    },
  });
}

// ── Upsert (connect / disconnect) ───────────────────────────────
export function useUpsertIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ integration_id, connected, connected_as, config }) => {
      const { data, error } = await supabase
        .from('integrations')
        .upsert(
          {
            integration_id,
            connected,
            connected_as: connected_as ?? null,
            config: config ?? {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'integration_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(vars.connected ? 'Integration connected' : 'Integration disconnected');
    },
    onError: (e) => toast.error(e.message),
  });
}
