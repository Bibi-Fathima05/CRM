import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Subscribe to real-time changes for a specific lead's
 * interactions and follow_ups tables.
 * Invalidates ['leads', leadId] on any change.
 */
export function useLeadRealtime(leadId) {
  const qc = useQueryClient();
  const channelsRef = useRef([]);

  useEffect(() => {
    if (!leadId) return;

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['leads', leadId] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    };

    const interactionsChannel = supabase
      .channel(`lead-interactions-${leadId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'interactions',
        filter: `lead_id=eq.${leadId}`,
      }, invalidate)
      .subscribe();

    const followUpsChannel = supabase
      .channel(`lead-followups-${leadId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'follow_ups',
        filter: `lead_id=eq.${leadId}`,
      }, invalidate)
      .subscribe();

    const leadChannel = supabase
      .channel(`lead-record-${leadId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'leads',
        filter: `id=eq.${leadId}`,
      }, invalidate)
      .subscribe();

    channelsRef.current = [interactionsChannel, followUpsChannel, leadChannel];

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [leadId, qc]);
}
