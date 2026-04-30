import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/Spinner';

/**
 * ProtectedRoute — wraps routes that require authentication and (optionally) specific roles.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>            — any authenticated user
 *   <Route element={<ProtectedRoute roles={['admin']} />}>  — admin only
 *   <Route element={<ProtectedRoute roles={['l1','admin']} />}> — L1 or admin
 */
export function ProtectedRoute({ children, roles }) {
  const { user, profile, loading, defaultRoute } = useAuth();

  // Auth still loading
  if (loading || (user && !profile)) {
    return <PageLoader />;
  }

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role check — if roles are specified, user must have one of them
  if (roles && roles.length > 0 && !roles.includes(profile.role)) {
    return <Navigate to={defaultRoute || '/'} replace />;
  }

  return children;
}
