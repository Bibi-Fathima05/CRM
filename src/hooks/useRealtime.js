import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtime({ table, filter, queryKey }) {
  const qc = useQueryClient();
  const channelRef = useRef(null);

  useEffect(() => {
    const channelName = `realtime:${table}:${filter ?? 'all'}`;
    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter,
      }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [table, filter, JSON.stringify(queryKey)]);
}
