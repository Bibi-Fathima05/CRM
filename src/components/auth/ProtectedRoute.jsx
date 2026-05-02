import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/Spinner';

export function ProtectedRoute({ roles = [], children }) {
  const { user, role, loading } = useAuth();

  // Still resolving Convex query
  if (loading) return <PageLoader />;

  // Not logged in
  if (!user) return <Navigate to="/login" replace />;

  // Role check — if profile hasn't loaded yet but user exists, allow through
  // (role will be null, which means no role restriction passes)
  if (roles.length > 0 && role && !roles.includes(role)) {
    const ROLE_HOME = { l1: '/l1', l2: '/l2', l3: '/l3', admin: '/admin' };
    return <Navigate to={ROLE_HOME[role] ?? '/'} replace />;
  }

  return children;
}
