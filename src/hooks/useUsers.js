import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useUsers() {
  const data = useConvexQuery(api.users.getUsers);
  return {
    data,
    isLoading: data === undefined,
  };
}

// Leaderboard and team stats are admin features — keep on Supabase until migrated
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
