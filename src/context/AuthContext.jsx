import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ROLE_ROUTES } from '@/lib/constants';

const AuthContext = createContext(null);

const DEV_ROLE_KEY = 'flowcrm_dev_role';
const EMAIL_KEY    = 'flowcrm_email';

export function AuthProvider({ children }) {
  const [email, setEmail]   = useState(() => localStorage.getItem(EMAIL_KEY) || null);
  const [devRole, setDevRole] = useState(() => sessionStorage.getItem(DEV_ROLE_KEY) || null);

  // Fetch profile from Convex — undefined = still loading, null = not found, object = found
  const profile = useQuery(api.users.getProfile, email ? { email } : "skip");
  const createUser = useMutation(api.users.createUser);

  // loading = true only while Convex query is in-flight (profile === undefined AND we have an email)
  const loading = email ? profile === undefined : false;

  const signIn = async ({ email: loginEmail }) => {
    localStorage.setItem(EMAIL_KEY, loginEmail);
    setEmail(loginEmail);
    return { user: { email: loginEmail } };
  };

  const signUp = async ({ email: signupEmail, name, role }) => {
    await createUser({ email: signupEmail, name: name || signupEmail.split('@')[0], role: role || 'l1' });
    localStorage.setItem(EMAIL_KEY, signupEmail);
    setEmail(signupEmail);
    return { user: { email: signupEmail } };
  };

  const signOut = async () => {
    localStorage.removeItem(EMAIL_KEY);
    setEmail(null);
    setDevRole(null);
    sessionStorage.removeItem(DEV_ROLE_KEY);
  };

  const switchRole = (newRole) => {
    setDevRole(newRole);
    sessionStorage.setItem(DEV_ROLE_KEY, newRole);
  };

  const user = email ? {
    email,
    id: profile?._id,
    _id: profile?._id,
    name: profile?.name || email.split('@')[0],
  } : null;

  // Use devRole override, then profile role, then default to 'l1' if profile exists but has no role
  const role         = devRole || profile?.role || null;
  const isAdmin      = role === 'admin';
  const defaultRoute = role ? (ROLE_ROUTES[role] ?? '/admin') : '/login';

  return (
    <AuthContext.Provider value={{
      session: email ? { user } : null,
      user,
      profile: profile ?? null,
      loading,
      role, isAdmin, defaultRoute, devRole,
      signIn, signUp, signOut, switchRole,
      refetchProfile: () => {},
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
