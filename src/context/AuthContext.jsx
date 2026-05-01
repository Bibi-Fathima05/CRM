import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
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

  const [email, setEmail] = useState(() => localStorage.getItem('flowcrm_email') || null);
  const profile = useQuery(api.users.getProfile, email ? { email } : "skip");
  const createUser = useMutation(api.users.createUser);

  useEffect(() => {
    if (profile === undefined) return;
    setLoading(false);
  }, [profile]);

  const signIn = async ({ email: loginEmail, password }) => {
    // Simple mock auth: just save email to localStorage
    localStorage.setItem('flowcrm_email', loginEmail);
    setEmail(loginEmail);
    return { user: { email: loginEmail } };
  };

  const signUp = async ({ email: signupEmail, name, role }) => {
    await createUser({ email: signupEmail, name, role });
    localStorage.setItem('flowcrm_email', signupEmail);
    setEmail(signupEmail);
    return { user: { email: signupEmail } };
  };

  const signOut = async () => {
    localStorage.removeItem('flowcrm_email');
    setEmail(null);
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
      session: email ? { user: { email } } : null,
      user: email ? { email } : null,
      profile, loading,
      role, isAdmin, defaultRoute, devRole,
      signIn, signUp, signOut, switchRole,
      refetchProfile: () => {}, // No-op for now
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
