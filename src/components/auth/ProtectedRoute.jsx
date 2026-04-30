import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/Spinner';

export function ProtectedRoute({ children, roles }) {
  const { user, profile, loading, role } = useAuth();
  // `role` already has devRole override applied from AuthContext

  // Wait until auth bootstrap AND profile fetch are both done
  if (loading) return <PageLoader />;

  // User is logged in but profile hasn't arrived yet — keep waiting
  if (user && !profile) return <PageLoader />;

  // Not logged in
  if (!user) return <Navigate to="/login" replace />;

  // Role check — use effective role (devRole override or real DB role)
  if (roles?.length > 0 && !roles.includes(role)) {
    const ROLE_HOME = { l1: '/l1', l2: '/l2', l3: '/l3', admin: '/admin' };
    return <Navigate to={ROLE_HOME[role] ?? '/'} replace />;
  }

  return children;
}
