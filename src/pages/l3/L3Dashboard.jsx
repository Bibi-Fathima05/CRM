import { DollarSign, Target, TrendingUp, CheckCircle, AlertTriangle, Clock, Zap, BarChart3 } from 'lucide-react';
import { useDeals, useAuditLogs } from '@/hooks/useDeals';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, RiskBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { formatCurrency, timeAgo } from '@/utils/formatters';
import { DEAL_STAGE, DEAL_RISK } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

export default function L3Dashboard() {
  const navigate = useNavigate();
  const { data: deals = [], isLoading } = useDeals();
  const { data: logs = [] } = useAuditLogs(10);

  const active     = deals.filter(d => ![DEAL_STAGE.CLOSED_WON, DEAL_STAGE.CLOSED_LOST].includes(d.stage));
  const closedWon  = deals.filter(d => d.stage === DEAL_STAGE.CLOSED_WON);
  const closedLost = deals.filter(d => d.stage === DEAL_STAGE.CLOSED_LOST);
  const readyClose = deals.filter(d => d.stage === DEAL_STAGE.READY_TO_CLOSE);
  const critical   = deals.filter(d => d.risk_level === DEAL_RISK.CRITICAL);
  const highRisk   = deals.filter(d => [DEAL_RISK.HIGH, DEAL_RISK.CRITICAL].includes(d.risk_level));

  const revenue  = closedWon.reduce((s, d) => s + (d.value || 0), 0);
  const pipeline = active.reduce((s, d) => s + (d.value || 0), 0);
  const total    = closedWon.length + closedLost.length;
  const winRate  = total > 0 ? Math.round((closedWon.length / total) * 100) : 0;
  const avgDeal  = closedWon.length > 0 ? Math.round(revenue / closedWon.length) : 0;

  const topDeals    = [...active].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5);
  const staleDeals  = active.filter(d => (Date.now() - new Date(d.updated_at).getTime()) / 36e5 > 72);
  const winRateData = [{ name: 'Win Rate', value: winRate, fill: '#10b981' }];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Revenue Closure</h1>
          <p className="page-subtitle">L3 strategic overview · {active.length} active deals</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button icon={BarChart3} variant="secondary" onClick={() => navigate('/l3/forecast')}>Forecast</Button>
          <Button icon={Target} variant="primary" onClick={() => navigate('/l3/deals')}>Manage Deals</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="stats-grid stagger">
        <StatCard label="Revenue Closed"  value={formatCurrency(revenue)}  icon={DollarSign} color="success" trend={18} sub="this quarter" loading={isLoading} />
        <StatCard label="Pipeline Value"  value={formatCurrency(pipeline)} icon={TrendingUp} color="primary" loading={isLoading} />
        <StatCard label="Win Rate"        value={`${winRate}%`}            icon={CheckCircle} color="info"   loading={isLoading} />
        <StatCard label="Avg Deal Size"   value={formatCurrency(avgDeal)}  icon={Target}     color="warning" loading={isLoading} />
      </div>

      {/* Alert banners */}
      {(readyClose.length > 0 || critical.length > 0 || staleDeals.length > 0) && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
          {readyClose.length > 0 && (
            <div onClick={() => navigate('/l3/deals')} style={{ flex: 1, minWidth: 200, padding: 'var(--space-4)', borderRadius: 'var(--radius)', background: 'var(--success-glow)', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Zap size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--success-light)' }}>{readyClose.length} deal{readyClose.length !== 1 ? 's' : ''} ready to close</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Take action now</div>
              </div>
            </div>
          )}
          {critical.length > 0 && (
            <div onClick={() => navigate('/l3/deals')} style={{ flex: 1, minWidth: 200, padding: 'var(--space-4)', borderRadius: 'var(--radius)', background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <AlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--danger-light)' }}>{critical.length} critical deal{critical.length !== 1 ? 's' : ''} at risk</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Immediate attention required</div>
              </div>
            </div>
          )}
          {staleDeals.length > 0 && (
            <div onClick={() => navigate('/l3/deals')} style={{ flex: 1, minWidth: 200, padding: 'var(--space-4)', borderRadius: 'var(--radius)', background: 'var(--warning-glow)', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Clock size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--warning-light)' }}>{staleDeals.length} stale deal{staleDeals.length !== 1 ? 's' : ''} (72h+ no activity)</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Follow up needed</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Top Deals */}
        <Card>
          <CardHeader title="🏆 Top Deals by Value" subtitle="Active pipeline"
            actions={<Button size="sm" variant="ghost" onClick={() => navigate('/l3/deals')}>View all</Button>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {topDeals.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-6)' }}>No active deals</p>
            ) : topDeals.map((deal, i) => (
              <div key={deal._id} onClick={() => navigate('/l3/deals')}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}>
                <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>
                  {['🥇','🥈','🥉','4️⃣','5️⃣'][i]}
                </span>
                <Avatar name={deal.lead?.name} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.lead?.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{deal.lead?.company} · {deal.stage?.replace(/_/g, ' ')}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(deal.value)}</div>
                  <RiskBadge risk={deal.risk_level} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Win Rate Gauge */}
        <Card>
          <CardHeader title="Win Rate" subtitle={`${closedWon.length} won · ${closedLost.length} lost`} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
            <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={winRateData} startAngle={90} endAngle={-270}>
                  <RadialBar background={{ fill: 'var(--bg-surface-3)' }} dataKey="value" cornerRadius={6} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--success)' }}>{winRate}%</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>win rate</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[
                { label: 'Ready to Close', count: readyClose.length, color: '#10b981' },
                { label: 'Negotiation',    count: deals.filter(d => d.stage === DEAL_STAGE.NEGOTIATION).length, color: '#6366f1' },
                { label: 'Proposal',       count: deals.filter(d => d.stage === DEAL_STAGE.PROPOSAL).length, color: '#f59e0b' },
                { label: 'High Risk',      count: highRisk.length, color: '#ef4444' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Activity Feed */}
        <Card style={{ gridColumn: 'span 2' }}>
          <CardHeader title="Activity Feed" subtitle="Recent system events" />
          {logs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-6)' }}>No recent activity</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {logs.map(log => (
                <div key={log._id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Avatar name={log.actor?.name} size="sm" />
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{log.actor?.name || 'System'} </span>
                    <span style={{ color: 'var(--text-muted)' }}>{log.action.replace(/\./g, ' ').replace(/_/g, ' ')}</span>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
