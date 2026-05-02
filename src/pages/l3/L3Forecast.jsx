import { useState } from 'react';
import { useDeals } from '@/hooks/useDeals';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency } from '@/utils/formatters';
import { DEAL_STAGE } from '@/lib/constants';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CS = { fontSize: 11, fill: 'var(--text-muted)' };
const WIN_RATES = { contacted: 0.10, demo: 0.25, proposal: 0.45, negotiation: 0.65, ready_to_close: 0.85 };
const STAGE_COLORS = ['#6366f1','#3b82f6','#f59e0b','#10b981','#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 'var(--text-xs)' }}>
      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value > 999 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function L3Forecast() {
  const { data: deals = [], isLoading } = useDeals();
  const [period, setPeriod] = useState('year');

  const now = new Date();
  const active    = deals.filter(d => ![DEAL_STAGE.CLOSED_WON, DEAL_STAGE.CLOSED_LOST].includes(d.stage));
  const closedWon = deals.filter(d => d.stage === DEAL_STAGE.CLOSED_WON);
  const closedLost = deals.filter(d => d.stage === DEAL_STAGE.CLOSED_LOST);

  const totalPipeline    = active.reduce((s, d) => s + (d.value || 0), 0);
  const weightedPipeline = active.reduce((s, d) => s + (d.value || 0) * (WIN_RATES[d.stage] || 0.1), 0);
  const revenue          = closedWon.reduce((s, d) => s + (d.value || 0), 0);
  const total            = closedWon.length + closedLost.length;
  const winRate          = total > 0 ? Math.round((closedWon.length / total) * 100) : 0;

  const monthCount = period === 'year' ? 12 : period === 'half' ? 6 : 3;
  const monthly = MONTHS.slice(Math.max(0, now.getMonth() + 1 - monthCount), now.getMonth() + 1).map((month, idx) => {
    const mi = now.getMonth() + 1 - monthCount + idx;
    const monthDeals = deals.filter(d => {
      const dd = new Date(d.created_at);
      return dd.getFullYear() === now.getFullYear() && dd.getMonth() === mi;
    });
    const won = monthDeals.filter(d => d.stage === DEAL_STAGE.CLOSED_WON);
    return {
      month,
      revenue: won.reduce((s, d) => s + (d.value || 0), 0),
      deals: monthDeals.length,
      won: won.length,
      lost: monthDeals.filter(d => d.stage === DEAL_STAGE.CLOSED_LOST).length,
    };
  });

  const stageOrder = ['contacted','demo','proposal','negotiation','ready_to_close'];
  const funnelData = stageOrder.map((s, i) => ({
    name: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: deals.filter(d => d.stage === s).reduce((sum, d) => sum + (d.value || 0), 0),
    count: deals.filter(d => d.stage === s).length,
    fill: STAGE_COLORS[i],
  }));

  const quarterlyTarget = weightedPipeline * 1.15;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Revenue Forecast</h1>
          <p className="page-subtitle">Pipeline analytics · weighted forecast · stage funnel</p>
        </div>
        <div className="tabs">
          {[['3mo','3 Months'],['half','6 Months'],['year','Full Year']].map(([v,l]) => (
            <button key={v} className={`tab${period === v ? ' active' : ''}`} onClick={() => setPeriod(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="stats-grid stagger" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard label="Total Pipeline"    value={formatCurrency(totalPipeline)}    icon={DollarSign} color="primary"  loading={isLoading} />
        <StatCard label="Weighted Forecast" value={formatCurrency(weightedPipeline)} icon={TrendingUp} color="success"  loading={isLoading} sub="probability-adjusted" />
        <StatCard label="Revenue Closed"    value={formatCurrency(revenue)}          icon={Target}     color="warning"  loading={isLoading} />
        <StatCard label="Win Rate"          value={`${winRate}%`}                    icon={BarChart3}  color="info"     loading={isLoading} />
      </div>

      {/* Projection card */}
      <Card style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Quarterly Projection (weighted × 1.15)</div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--primary-light)' }}>{formatCurrency(quarterlyTarget)}</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
            {[
              { label: 'Deals in Pipeline', value: active.length },
              { label: 'Avg Deal Size',     value: formatCurrency(active.length ? totalPipeline / active.length : 0) },
              { label: 'Deals Won',         value: closedWon.length },
              { label: 'Deals Lost',        value: closedLost.length },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Card>
          <CardHeader title="Revenue Trend" subtitle="Closed deal revenue over time" />
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={CS} axisLine={false} tickLine={false} />
              <YAxis tick={CS} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          <Card>
            <CardHeader title="Pipeline by Stage" subtitle="Total value per stage" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ ...CS, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={CS} axisLine={false} tickLine={false} tickFormatter={v => `${(v/100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Value" radius={[4,4,0,0]}>
                  {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardHeader title="Won vs Lost" subtitle="Deal outcomes over time" />
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={CS} axisLine={false} tickLine={false} />
                <YAxis tick={CS} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="won"   name="Won"   stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="lost"  name="Lost"  stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="deals" name="Total" stroke="#6366f1" strokeWidth={1} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Stage conversion table */}
        <Card>
          <CardHeader title="Stage Conversion Analysis" subtitle="Deals and value at each stage" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Stage','Deals','Total Value','Avg Value','Win Probability','Weighted Value'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {funnelData.map((row, i) => {
                  const prob = WIN_RATES[stageOrder[i]] || 0;
                  const avg  = row.count > 0 ? row.value / row.count : 0;
                  return (
                    <tr key={row.name} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.fill, flexShrink: 0 }} />
                          {row.name}
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{row.count}</td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(row.value)}</td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)' }}>{formatCurrency(avg)}</td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg-surface-3)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${prob * 100}%`, background: row.fill, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', minWidth: 32 }}>{Math.round(prob * 100)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--primary-light)', fontWeight: 600 }}>{formatCurrency(row.value * prob)}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                  <td style={{ padding: 'var(--space-3)', fontWeight: 700 }}>Total</td>
                  <td style={{ padding: 'var(--space-3)', fontWeight: 700 }}>{active.length}</td>
                  <td style={{ padding: 'var(--space-3)', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(totalPipeline)}</td>
                  <td style={{ padding: 'var(--space-3)' }}>—</td>
                  <td style={{ padding: 'var(--space-3)' }}>—</td>
                  <td style={{ padding: 'var(--space-3)', fontWeight: 700, color: 'var(--primary-light)' }}>{formatCurrency(weightedPipeline)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
