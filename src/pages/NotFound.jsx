import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Home } from 'lucide-react';

export default function NotFound() {
  const { defaultRoute } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', flexDirection: 'column', gap: 'var(--space-6)', textAlign: 'center' }}>
      <div style={{ fontSize: 96, fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>404</div>
      <h2 style={{ fontSize: 'var(--text-xl)' }}>Page not found</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: 360 }}>The page you're looking for doesn't exist or you don't have access.</p>
      <Button icon={Home} as={Link} to={defaultRoute || '/'}>Back to Dashboard</Button>
    </div>
  );
}
