import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, TrendingUp, Target, Settings,
  ChevronLeft, ChevronRight, Zap, LogOut, BarChart3,
  FileText, Bell, Shield, Plug
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { ROLE_LABELS } from '@/lib/constants';

const NAV = {
  l1: [
    { to: '/l1', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/l1/leads', label: 'My Leads', icon: Users },
    { to: '/l1/copilot', label: 'AI Copilot', icon: Zap },
  ],
  l2: [
    { to: '/l2', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/l2/pipeline', label: 'Pipeline', icon: TrendingUp },
    { to: '/l2/proposal', label: 'Proposals', icon: FileText },
  ],
  l3: [
    { to: '/l3', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/l3/deals', label: 'Deals', icon: Target },
    { to: '/l3/forecast', label: 'Forecast', icon: BarChart3 },
    { to: '/l3/approvals', label: 'Approvals', icon: Shield },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/api-keys', label: 'API Keys', icon: Shield },
    { to: '/admin/webhooks', label: 'Webhooks', icon: Bell },
    { to: '/admin/integrations', label: 'Integrations', icon: Plug },
  ],
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const links = NAV[role] || [];

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  return (
    <aside style={{
      width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
      minWidth: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
      height: '100vh', position: 'sticky', top: 0,
      background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', transition: 'width var(--transition-slow)',
      overflow: 'hidden', zIndex: 'var(--z-sidebar)',
    }}>
      {/* Logo */}
      <div style={{ padding: 'var(--space-5) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '1px solid var(--border)', minHeight: 'var(--topbar-height)' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', background: 'linear-gradient(135deg, #818cf8, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              FlowCRM
            </span>
          </div>
        )}
        {collapsed && <div style={{ width: 32, height: 32, borderRadius: 'var(--radius)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={18} color="#fff" /></div>}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex' }}>
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-3)' }}>
        {!collapsed && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)', paddingLeft: 'var(--space-2)' }}>
          {ROLE_LABELS[role] || 'Navigation'}
        </div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 'var(--space-3)',
                padding: collapsed ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none', justifyContent: collapsed ? 'center' : 'flex-start',
                fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)',
                transition: 'all var(--transition-fast)',
                background: isActive ? 'var(--primary-glow)' : 'transparent',
                color: isActive ? 'var(--primary-light)' : 'var(--text-muted)',
                borderLeft: isActive && !collapsed ? '2px solid var(--primary)' : '2px solid transparent',
              })}>
              <Icon size={16} />
              {!collapsed && label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User + Collapse toggle */}
      <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 'var(--space-2)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'center' }}>
            <ChevronRight size={16} />
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2)', borderRadius: 'var(--radius)' }}>
            <Avatar name={profile?.name} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{role}</div>
            </div>
            <button onClick={handleLogout} title="Logout" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex' }}>
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
