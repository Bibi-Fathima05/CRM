import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, avatar_url, created_at')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard');
      if (error) throw error;
      return data;
    },
  });
}

export function useTeamStats(role) {
  return useQuery({
    queryKey: ['team-stats', role],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_team_stats', { p_role: role });
      if (error) throw error;
      return data;
    },
    enabled: !!role,
  });
}
