import { useDeals } from '@/hooks/useDeals';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/formatters';
import { DEAL_STAGE } from '@/lib/constants';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildMonthlyData(deals) {
  const now = new Date();
  return MONTHS.slice(0, now.getMonth() + 1).map((month, i) => {
    const monthDeals = deals.filter(d => {
      const dd = new Date(d.created_at);
      return dd.getFullYear() === now.getFullYear() && dd.getMonth() === i;
    });
    const closed = monthDeals.filter(d => d.stage === DEAL_STAGE.CLOSED_WON);
    return {
      month,
      revenue: closed.reduce((s, d) => s + (d.value || 0), 0),
      deals: monthDeals.length,
      won: closed.length,
    };
  });
}

function buildStageData(deals) {
  return [
    { stage: 'Contacted', value: deals.filter(d => d.stage === DEAL_STAGE.CONTACTED).reduce((s,d)=>s+(d.value||0),0) },
    { stage: 'Demo',      value: deals.filter(d => d.stage === DEAL_STAGE.DEMO).reduce((s,d)=>s+(d.value||0),0) },
    { stage: 'Proposal',  value: deals.filter(d => d.stage === DEAL_STAGE.PROPOSAL).reduce((s,d)=>s+(d.value||0),0) },
    { stage: 'Negotiation',value: deals.filter(d => d.stage === DEAL_STAGE.NEGOTIATION).reduce((s,d)=>s+(d.value||0),0) },
    { stage: 'Ready',     value: deals.filter(d => d.stage === DEAL_STAGE.READY_TO_CLOSE).reduce((s,d)=>s+(d.value||0),0) },
  ];
}

const CHART_STYLE = {
  fontSize: 11, fill: 'var(--text-muted)',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 'var(--text-xs)' }}>
      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</p>
      ))}
    </div>
  );
};

export default function L3Forecast() {
  const { data: deals = [], isLoading } = useDeals();
  const monthly = buildMonthlyData(deals);
  const stageData = buildStageData(deals);

  const totalPipeline = deals.filter(d => ![DEAL_STAGE.CLOSED_WON, DEAL_STAGE.CLOSED_LOST].includes(d.stage))
    .reduce((s, d) => s + (d.value || 0), 0);
  const projectedRevenue = totalPipeline * 0.62; // ~62% win rate assumption

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Revenue Forecast</h1><p className="page-subtitle">Pipeline analytics and projections</p></div>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Pipeline Value</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--primary-light)' }}>{formatCurrency(totalPipeline)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Projected Revenue</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(projectedRevenue)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Revenue Area Chart */}
        <Card>
          <CardHeader title="Monthly Revenue" subtitle="Closed deals revenue this year" />
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={CHART_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={CHART_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="url(#revenueGrad)" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          {/* Pipeline by Stage */}
          <Card>
            <CardHeader title="Pipeline by Stage" subtitle="Total value in each stage" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="stage" tick={CHART_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `${(v/100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Deal Volume Trend */}
          <Card>
            <CardHeader title="Deal Volume Trend" subtitle="Deals created vs won per month" />
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={CHART_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_STYLE} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="deals" name="Total Deals" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="won" name="Won" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}
