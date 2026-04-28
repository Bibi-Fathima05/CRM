import { useState } from 'react';
import { Bell, Search, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/Dropdown';
import { ROLE_LABELS } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';

export function Topbar({ title }) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  return (
    <header style={{
      height: 'var(--topbar-height)', background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)', display: 'flex',
      alignItems: 'center', gap: 'var(--space-4)',
      padding: '0 var(--space-6)', position: 'sticky', top: 0,
      zIndex: 'var(--z-sidebar)', backdropFilter: 'blur(8px)',
    }}>
      {title && (
        <h1 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          {title}
        </h1>
      )}

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search leads, deals…"
          style={{ paddingLeft: 36, height: 36, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)', width: '100%' }}
        />
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Notifications */}
        <button className="btn-icon" style={{ position: 'relative' }}>
          <Bell size={16} />
          <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', border: '1.5px solid var(--bg-surface)' }} />
        </button>

        {/* Settings */}
        <button className="btn-icon"><Settings size={16} /></button>

        {/* User menu */}
        <Dropdown align="right" trigger={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius)', transition: 'background var(--transition-fast)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Avatar name={profile?.name} size="sm" />
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', lineHeight: 1.2 }}>{profile?.name}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{ROLE_LABELS[role]}</div>
            </div>
          </div>
        }>
          <DropdownItem icon={Settings} onClick={() => navigate('/settings')}>Settings</DropdownItem>
          <DropdownDivider />
          <DropdownItem icon={Bell} danger onClick={handleLogout}>Sign Out</DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
