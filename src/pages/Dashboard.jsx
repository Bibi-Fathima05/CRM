import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ROLE_ROUTES } from '@/lib/constants';
import { PageLoader } from '@/components/ui/Spinner';

export default function Dashboard() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role) navigate(ROLE_ROUTES[role] || '/login', { replace: true });
    if (!loading && !role) navigate('/login', { replace: true });
  }, [role, loading, navigate]);

  return <PageLoader />;
}
