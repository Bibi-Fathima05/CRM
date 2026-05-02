import { TrendingUp, AlertTriangle, Target, DollarSign, BarChart3, Zap, Users, ArrowRight } from 'lucide-react';
import { useDeals } from '@/hooks/useDeals';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, RiskBadge } from '@/components/ui/Badge';
import { HealthScore } from '@/components/ui/HealthScore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { formatCurrency, timeAgo } from '@/utils/formatters';
import { DEAL_STAGE, DEAL_RISK, STATUS_LABELS, STATUS_VARIANT } from '@/lib/constants';
import { getDealProbability } from '@/utils/scoring';
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function L2Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: deals = [], isLoading } = useDeals({ assignedTo: user?.id });
  const { data: leads = [], isLoading: leadsLoading } = useLeads({ level: 'l2' });
  useRealtime({ table: 'deals', queryKey: ['deals'] });
  useRealtime({ table: 'leads', queryKey: ['leads'] });

  // Leads without deals
  const leadsWithDeals = new Set(deals.map(d => d.lead_id));
  const pendingLeads = leads.filter(l => !leadsWithDeals.has(l.id));

  const active = deals.filter(d => ![DEAL_STAGE.CLOSED_WON, DEAL_STAGE.CLOSED_LOST].includes(d.stage));
  const highRisk = deals.filter(d => [DEAL_RISK.HIGH, DEAL_RISK.CRITICAL].includes(d.risk_level));
  const totalValue = active.reduce((s, d) => s + (d.value || 0), 0);
  const avgProbability = active.length
    ? Math.round(active.reduce((s, d) => s + (d.probability || getDealProbability({ stage: d.stage, healthScore: d.health_score, interactionCount: d.interactions?.[0]?.count || 0 })), 0) / active.length)
    : 0;

  const stageData = [
    { name: 'Contacted', count: deals.filter(d => d.stage === DEAL_STAGE.CONTACTED).length, fill: '#6366f1' },
    { name: 'Demo', count: deals.filter(d => d.stage === DEAL_STAGE.DEMO).length, fill: '#3b82f6' },
    { name: 'Proposal', count: deals.filter(d => d.stage === DEAL_STAGE.PROPOSAL).length, fill: '#f59e0b' },
    { name: 'Negotiation', count: deals.filter(d => d.stage === DEAL_STAGE.NEGOTIATION).length, fill: '#10b981' },
  ];

  const radialData = [{ name: 'Probability', value: avgProbability, fill: '#6366f1' }];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Deal Intelligence</h1>
          <p className="page-subtitle">Your L2 conversion overview</p>
        </div>
      </div>

      {/* Qualified Leads Alert */}
      {pendingLeads.length > 0 && (
        <Card style={{ marginBottom: 'var(--space-6)', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
          <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)' }}>
                  {pendingLeads.length} Qualified Lead{pendingLeads.length !== 1 ? 's' : ''} Awaiting Deals
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  These leads were qualified from L1 and need deals created to enter your pipeline
                </div>
              </div>
            </div>
            <Button variant="primary" icon={ArrowRight} onClick={() => navigate('/l2/leads')}>
              View Leads
            </Button>
          </div>

          {/* Quick preview of pending leads */}
          <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', gap: 'var(--space-3)', overflowX: 'auto' }}>
            {pendingLeads.slice(0, 5).map(lead => (
              <div key={lead._id || lead.id} style={{
                padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', minWidth: 200, cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onClick={() => navigate('/l2/leads')}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <Avatar name={lead.name} size="sm" />
                  <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{lead.company || 'No company'}</div>
                {lead.budget && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', marginTop: 2 }}>Budget: {formatCurrency(lead.budget)}</div>}
              </div>
            ))}
            {pendingLeads.length > 5 && (
              <div style={{
                padding: 'var(--space-3)', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)',
                border: '1px dashed var(--border)', minWidth: 120, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', cursor: 'pointer',
              }} onClick={() => navigate('/l2/leads')}>
                +{pendingLeads.length - 5} more
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="stats-grid stagger">
        <StatCard label="Qualified Leads" value={leads.length} icon={Users} color="warning" loading={leadsLoading} />
        <StatCard label="Active Deals" value={active.length} icon={Target} color="primary" loading={isLoading} />
        <StatCard label="Pipeline Value" value={formatCurrency(totalValue)} icon={DollarSign} color="success" loading={isLoading} />
        <StatCard label="Avg Probability" value={`${avgProbability}%`} icon={TrendingUp} color="info" loading={isLoading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Probability Gauge */}
        <Card>
          <CardHeader title="Deal Probability" subtitle="Average across active pipeline" />
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="100%" data={radialData} startAngle={180} endAngle={0}>
                <RadialBar background={{ fill: 'var(--bg-surface-3)' }} dataKey="value" cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--primary-light)' }}>{avgProbability}%</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Avg Probability</div>
            </div>
          </div>
        </Card>

        {/* Stage Breakdown */}
        <Card>
          <CardHeader title="Pipeline by Stage" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {stageData.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ width: 80, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0 }}>{s.name}</div>
                <div style={{ flex: 1 }}>
                  <div className="progress-bar">
                    <div style={{ height: '100%', borderRadius: 'var(--radius-full)', background: s.fill, width: `${active.length ? (s.count / active.length) * 100 : 0}%`, transition: 'width 600ms ease' }} />
                  </div>
                </div>
                <div style={{ width: 24, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', flexShrink: 0 }}>{s.count}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* High Risk Deals */}
        <Card style={{ gridColumn: 'span 2' }}>
          <CardHeader title="⚠️ High Risk Deals" subtitle="Require immediate attention"
            actions={<Badge variant="danger">{highRisk.length} at risk</Badge>} />
          {highRisk.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No high-risk deals right now 🎉</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
              {highRisk.map(d => (
                <div key={d._id || d.id} onClick={() => navigate(`/l2/leads/${d._id || d.id}`)}
                  style={{ padding: 'var(--space-4)', background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{d.lead?.name}</span>
                    <RiskBadge risk={d.risk_level} />
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{d.lead?.company} · {formatCurrency(d.value)}</div>
                  <HealthScore score={d.health_score} size="sm" showLabel={false} style={{ marginTop: 8 }} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
