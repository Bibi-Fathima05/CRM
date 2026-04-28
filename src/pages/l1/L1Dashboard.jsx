import { Phone, Clock, Star, AlertCircle, CheckCircle, Users, TrendingUp, Zap } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { formatDateTime, timeAgo } from '@/utils/formatters';
import { LEAD_STATUS } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';

export default function L1Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { data: myLeads = [], isLoading } = useLeads({ level: 'l1', assignedTo: user?.id });
  const { data: newLeads = [] } = useLeads({ level: 'l1', status: LEAD_STATUS.NEW });
  const { data: followUps = [] } = useLeads({ level: 'l1', status: LEAD_STATUS.FOLLOW_UP, assignedTo: user?.id });

  useRealtime({ table: 'leads', queryKey: ['leads'] });

  const qualified = myLeads.filter(l => l.status === LEAD_STATUS.QUALIFIED).length;
  const qualRate = myLeads.length ? Math.round((qualified / myLeads.length) * 100) : 0;
  const overdue = followUps.filter(l => l.follow_ups?.some(f => !f.completed && new Date(f.due_at) < new Date()));

  const priorityLeads = [...myLeads]
    .filter(l => [LEAD_STATUS.NEW, LEAD_STATUS.FOLLOW_UP].includes(l.status))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {profile?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's your sales activity for today</p>
        </div>
        <Button icon={Zap} variant="primary" onClick={() => navigate('/l1/copilot')}>AI Copilot</Button>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger">
        <StatCard label="My Leads" value={myLeads.length} icon={Users} color="primary" trend={12} sub="vs last week" loading={isLoading} />
        <StatCard label="New Today" value={newLeads.length} icon={Star} color="info" loading={isLoading} />
        <StatCard label="Follow-Ups Due" value={followUps.length} icon={Clock} color="warning" loading={isLoading} />
        <StatCard label="Qualification Rate" value={`${qualRate}%`} icon={TrendingUp} color="success" trend={qualRate > 50 ? 5 : -3} loading={isLoading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Priority Leads */}
        <Card>
          <CardHeader title="Priority Leads" subtitle="Sorted by lead score" />
          {priorityLeads.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-8)' }}>No leads to action right now</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {priorityLeads.map(lead => (
                <div key={lead.id} onClick={() => navigate(`/l1/leads/${lead.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}>
                  <Avatar name={lead.name} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{lead.company || lead.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <StatusBadge status={lead.status} />
                    {lead.score && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-light)', fontWeight: 600 }}>#{lead.score}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Follow-Up Queue */}
        <Card>
          <CardHeader title="Follow-Up Queue" subtitle={`${overdue.length} overdue`}
            actions={overdue.length > 0 && <Badge variant="danger" dot>{overdue.length} overdue</Badge>} />
          {followUps.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
              <CheckCircle size={32} />
              <p style={{ fontSize: 'var(--text-sm)' }}>All caught up!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {followUps.slice(0, 5).map(lead => {
                const fu = lead.follow_ups?.[0];
                const isOverdue = fu && !fu.completed && new Date(fu.due_at) < new Date();
                return (
                  <div key={lead.id} onClick={() => navigate(`/l1/leads/${lead.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: isOverdue ? 'var(--danger-glow)' : 'var(--bg-surface-2)', cursor: 'pointer', border: isOverdue ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent' }}>
                    {isOverdue ? <AlertCircle size={16} style={{ color: 'var(--danger-light)', flexShrink: 0 }} /> : <Phone size={16} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{lead.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: isOverdue ? 'var(--danger-light)' : 'var(--text-muted)' }}>
                        {fu ? timeAgo(fu.due_at) : 'No date set'}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); navigate(`/l1/leads/${lead.id}`); }}>
                      <Phone size={12} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
