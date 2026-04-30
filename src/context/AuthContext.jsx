import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ROLE_ROUTES } from '@/lib/constants';

const AuthContext = createContext(null);

// Dev-mode role override stored in sessionStorage so it resets on tab close
const DEV_ROLE_KEY = 'flowcrm_dev_role';

export function AuthProvider({ children }) {
  const [session, setSession]     = useState(null);
  const [user, setUser]           = useState(null);
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  // devRole overrides profile.role locally without touching the DB
  const [devRole, setDevRole]     = useState(() => sessionStorage.getItem(DEV_ROLE_KEY) || null);

  const initialized = useRef(false);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) setProfile(data);
    } catch (_) {
      // swallow
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const authUser = session?.user ?? null;
      setUser(authUser);
      if (authUser) {
        fetchProfile(authUser.id);
      } else {
        setLoading(false);
      }
      initialized.current = true;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!initialized.current) return;
      setSession(session);
      const authUser = session?.user ?? null;
      setUser(authUser);
      if (authUser) {
        setProfile(prev => {
          if (prev?.id === authUser.id) return prev;
          fetchProfile(authUser.id);
          return prev;
        });
      } else {
        setProfile(null);
        setDevRole(null);
        sessionStorage.removeItem(DEV_ROLE_KEY);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async ({ email, password, name, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { name, role } },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
    setDevRole(null);
    sessionStorage.removeItem(DEV_ROLE_KEY);
  };

  // Switch role locally for testing — no DB write needed
  const switchRole = (newRole) => {
    setDevRole(newRole);
    sessionStorage.setItem(DEV_ROLE_KEY, newRole);
  };

  const role         = devRole || profile?.role || null;
  const isAdmin      = role === 'admin';
  const defaultRoute = role ? ROLE_ROUTES[role] : '/login';

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      role, isAdmin, defaultRoute, devRole,
      signIn, signUp, signOut, switchRole,
      refetchProfile: () => user && fetchProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
