import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/Spinner';

export function ProtectedRoute({ roles = [], children }) {
  const { user, role, loading, profile } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  // Still loading profile from Convex
  if (user && !profile) return <PageLoader />;

  // If roles are specified, check the user has one of the allowed roles
  if (roles.length > 0 && !roles.includes(role)) {
    const ROLE_HOME = { l1: '/l1', l2: '/l2', l3: '/l3', admin: '/admin' };
    return <Navigate to={ROLE_HOME[role] ?? '/login'} replace />;
  }

  return children;
}
