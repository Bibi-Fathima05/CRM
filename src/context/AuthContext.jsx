import { createContext, useContext, useState } from 'react';
import { ROLE_ROUTES } from '@/lib/constants';

const AuthContext = createContext(null);

const DEV_ROLE_KEY = 'flowcrm_dev_role';

const DEFAULT_USER = {
  email: 'admin@flowcrm.app',
  id: 'default-admin',
  _id: 'default-admin',
  name: 'Admin',
};

const DEFAULT_PROFILE = {
  _id: 'default-admin',
  email: 'admin@flowcrm.app',
  name: 'Admin',
  role: 'admin',
};

export function AuthProvider({ children }) {
  const [devRole, setDevRole] = useState(() => sessionStorage.getItem(DEV_ROLE_KEY) || null);

  const switchRole = (newRole) => {
    setDevRole(newRole);
    sessionStorage.setItem(DEV_ROLE_KEY, newRole);
  };

  const role         = devRole || DEFAULT_PROFILE.role;
  const isAdmin      = role === 'admin';
  const defaultRoute = ROLE_ROUTES[role] ?? '/admin';

  return (
    <AuthContext.Provider value={{
      session: { user: DEFAULT_USER },
      user: DEFAULT_USER,
      profile: DEFAULT_PROFILE,
      loading: false,
      role, isAdmin, defaultRoute, devRole,
      signIn: async () => {},
      signUp: async () => {},
      signOut: async () => {},
      switchRole,
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
