import { DollarSign, Target, Clock, TrendingUp, Star, CheckCircle } from 'lucide-react';
import { useDeals } from '@/hooks/useDeals';
import { useRealtime } from '@/hooks/useRealtime';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, RiskBadge } from '@/components/ui/Badge';
import { HealthScore } from '@/components/ui/HealthScore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { formatCurrency, timeAgo } from '@/utils/formatters';
import { DEAL_STAGE, DEAL_RISK } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import { useAuditLog } from '@/hooks/useAuditLog';
import { formatDateTime } from '@/utils/formatters';

export default function L3Dashboard() {
  const navigate = useNavigate();
  const { data: deals = [], isLoading } = useDeals();
  const { data: logs = [] } = useAuditLog({ limit: 8 });
  useRealtime({ table: 'deals', queryKey: ['deals'] });

  const closedWon = deals.filter(d => d.stage === DEAL_STAGE.CLOSED_WON);
  const closedLost = deals.filter(d => d.stage === DEAL_STAGE.CLOSED_LOST);
  const active = deals.filter(d => ![DEAL_STAGE.CLOSED_WON, DEAL_STAGE.CLOSED_LOST].includes(d.stage));
  const revenue = closedWon.reduce((s, d) => s + (d.value || 0), 0);
  const successRate = (closedWon.length + closedLost.length) > 0
    ? Math.round((closedWon.length / (closedWon.length + closedLost.length)) * 100) : 0;

  const topDeals = [...active].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 3);
  const criticalDeals = deals.filter(d => d.risk_level === DEAL_RISK.CRITICAL);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Revenue Closure</h1><p className="page-subtitle">L3 strategic overview</p></div>
        <Button icon={TrendingUp} variant="primary" onClick={() => navigate('/l3/forecast')}>View Forecast</Button>
      </div>

      <div className="stats-grid stagger">
        <StatCard label="Revenue Closed" value={formatCurrency(revenue)} icon={DollarSign} color="success" trend={18} loading={isLoading} />
        <StatCard label="Active Deals" value={active.length} icon={Target} color="primary" loading={isLoading} />
        <StatCard label="Deal Success Rate" value={`${successRate}%`} icon={CheckCircle} color="info" loading={isLoading} />
        <StatCard label="Deals Won" value={closedWon.length} icon={Star} color="warning" loading={isLoading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Top Value Deals */}
        <Card>
          <CardHeader title="🏆 Top Deals" subtitle="Highest value in pipeline"
            actions={<Button size="sm" variant="ghost" onClick={() => navigate('/l3/deals')}>View all</Button>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {topDeals.map((deal, i) => (
              <div key={deal.id} onClick={() => navigate(`/l3/deals`)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)', cursor: 'pointer' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: ['var(--warning-glow)', 'var(--bg-surface-3)', 'var(--bg-surface-3)'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {['🥇', '🥈', '🥉'][i]}
                </div>
                <Avatar name={deal.lead?.name} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.lead?.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{deal.lead?.company}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(deal.value)}</div>
                  <HealthScore score={deal.health_score} size="sm" showLabel={false} />
                </div>
              </div>
            ))}
            {topDeals.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-6)' }}>No active deals</p>}
          </div>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardHeader title="🚨 Critical Alerts"
            actions={criticalDeals.length > 0 && <Badge variant="danger">{criticalDeals.length}</Badge>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {criticalDeals.map(d => (
              <div key={d.id} style={{ padding: 'var(--space-3)', background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{d.lead?.name}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-light)' }}>CRITICAL</span>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {formatCurrency(d.value)} · No activity {timeAgo(d.updated_at)}
                </div>
              </div>
            ))}
            {criticalDeals.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                <CheckCircle size={32} style={{ marginBottom: 8, color: 'var(--success)' }} />
                No critical deals
              </div>
            )}
          </div>
        </Card>

        {/* Audit Log */}
        <Card style={{ gridColumn: 'span 2' }}>
          <CardHeader title="Recent Activity" subtitle="System-wide audit trail" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {logs.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)' }}>
                <Avatar name={log.actor?.name} size="sm" />
                <div style={{ flex: 1 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{log.actor?.name} </span>
                  <span style={{ color: 'var(--text-muted)' }}>{log.action.replace(/_/g, ' ')} </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{log.entity_type} #{log.entity_id?.slice(0, 8)}</span>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(log.timestamp)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
