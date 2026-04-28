import { useState } from 'react';
import { useDeals, useCloseDeal } from '@/hooks/useDeals';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { Table } from '@/components/ui/Table';
import { RiskBadge, Badge } from '@/components/ui/Badge';
import { HealthScore } from '@/components/ui/HealthScore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, formatDate, timeAgo } from '@/utils/formatters';
import { DEAL_STAGE, DEAL_RISK } from '@/lib/constants';
import { CheckCircle, XCircle, AlertTriangle, Clock, TrendingDown, Zap } from 'lucide-react';

const RISK_FILTERS = ['all', DEAL_RISK.LOW, DEAL_RISK.MEDIUM, DEAL_RISK.HIGH, DEAL_RISK.CRITICAL];

export default function L3Deals() {
  const { user } = useAuth();
  const [riskFilter, setRiskFilter] = useState('all');
  const [closeModal, setCloseModal] = useState(null);
  const [closeNote, setCloseNote] = useState('');

  const { data: deals = [], isLoading } = useDeals({ riskLevel: riskFilter === 'all' ? undefined : riskFilter });
  const closeDeal = useCloseDeal();
  useRealtime({ table: 'deals', queryKey: ['deals'] });

  const active = deals.filter(d => ![DEAL_STAGE.CLOSED_WON, DEAL_STAGE.CLOSED_LOST].includes(d.stage));

  const getRiskAlert = (deal) => {
    if (deal.risk_level === DEAL_RISK.CRITICAL) return { icon: AlertTriangle, msg: 'Deal likely to drop', color: 'var(--danger-light)' };
    const hrs = (Date.now() - new Date(deal.updated_at).getTime()) / 36e5;
    if (hrs > 72) return { icon: Clock, msg: 'No activity detected', color: 'var(--warning)' };
    if (deal.stage === DEAL_STAGE.READY_TO_CLOSE) return { icon: Zap, msg: 'Close now!', color: 'var(--success)' };
    return null;
  };

  const handleClose = async (won) => {
    await closeDeal.mutateAsync({ id: closeModal.id, won, notes: closeNote, actorId: user?.id });
    setCloseModal(null); setCloseNote('');
  };

  const columns = [
    {
      key: 'lead', label: 'Client', render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Avatar name={row.lead?.name} size="sm" />
          <div>
            <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{row.lead?.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{row.lead?.company}</div>
          </div>
        </div>
      ),
    },
    { key: 'value', label: 'Value', sortable: true, render: v => <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(v)}</span> },
    { key: 'stage', label: 'Stage', render: v => <Badge variant="muted">{v?.replace(/_/g, ' ')}</Badge> },
    { key: 'health_score', label: 'Health', render: v => <HealthScore score={v} size="sm" showLabel={false} /> },
    { key: 'risk_level', label: 'Risk', render: v => <RiskBadge risk={v} /> },
    {
      key: 'id', label: 'Alert', render: (_, row) => {
        const alert = getRiskAlert(row);
        if (!alert) return '—';
        const { icon: Icon, msg, color } = alert;
        return <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color }}><Icon size={12} />{msg}</span>;
      },
    },
    {
      key: 'actions', label: 'Actions', render: (_, row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button size="sm" variant="success" icon={CheckCircle} onClick={e => { e.stopPropagation(); setCloseModal(row); }}>Close Won</Button>
          <Button size="sm" variant="danger" icon={XCircle} onClick={e => { e.stopPropagation(); setCloseModal({ ...row, _lost: true }); }}>Lost</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Deal Management</h1><p className="page-subtitle">{active.length} active deals</p></div>
      </div>

      <div className="tabs" style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}>
        {RISK_FILTERS.map(f => (
          <button key={f} className={`tab${riskFilter === f ? ' active' : ''}`} onClick={() => setRiskFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <Table columns={columns} data={active} loading={isLoading} emptyMessage="No deals found" />

      {/* Close Modal */}
      <Modal open={!!closeModal} onClose={() => setCloseModal(null)}
        title={closeModal?._lost ? 'Mark as Lost' : 'Close Deal — Won!'}
        footer={<>
          <Button variant="secondary" onClick={() => setCloseModal(null)}>Cancel</Button>
          <Button variant={closeModal?._lost ? 'danger' : 'success'} loading={closeDeal.isPending}
            onClick={() => handleClose(!closeModal?._lost)}>
            {closeModal?._lost ? 'Mark Lost' : '🎉 Close as Won'}
          </Button>
        </>}>
        <p style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
          {closeModal?._lost
            ? `Marking ${closeModal?.lead?.name}'s deal (${formatCurrency(closeModal?.value)}) as lost.`
            : `Closing ${closeModal?.lead?.name}'s deal worth ${formatCurrency(closeModal?.value)} as WON!`}
        </p>
        <div className="form-group">
          <label>Closing Notes</label>
          <textarea value={closeNote} onChange={e => setCloseNote(e.target.value)} placeholder="Add final notes, reason, or context…" rows={3} />
        </div>
      </Modal>
    </div>
  );
}
