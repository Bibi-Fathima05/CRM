import { useState } from 'react';
import { useDeals, useCloseDeal, useUpdateDealStage } from '@/hooks/useDeals';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { useLeadSheet } from '@/hooks/useLeadSheet';
import { Table } from '@/components/ui/Table';
import { RiskBadge, Badge, StatusBadge } from '@/components/ui/Badge';
import { HealthScore } from '@/components/ui/HealthScore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatCurrency, formatDate, timeAgo } from '@/utils/formatters';
import { DEAL_STAGE, DEAL_RISK, STAGE_LABELS } from '@/lib/constants';
import {
  CheckCircle, XCircle, AlertTriangle, Clock, Zap,
  Search, Filter, Eye, TrendingUp, DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

const STAGE_FILTERS = [
  { label: 'All Active', value: 'active' },
  { label: 'Ready to Close', value: DEAL_STAGE.READY_TO_CLOSE },
  { label: 'Negotiation', value: DEAL_STAGE.NEGOTIATION },
  { label: 'Proposal', value: DEAL_STAGE.PROPOSAL },
  { label: 'Won', value: DEAL_STAGE.CLOSED_WON },
  { label: 'Lost', value: DEAL_STAGE.CLOSED_LOST },
];

const RISK_FILTERS = ['all', DEAL_RISK.LOW, DEAL_RISK.MEDIUM, DEAL_RISK.HIGH, DEAL_RISK.CRITICAL];

function getAlert(deal) {
  if (deal.stage === DEAL_STAGE.READY_TO_CLOSE) return { icon: Zap, msg: 'Close now!', color: 'var(--success)' };
  if (deal.risk_level === DEAL_RISK.CRITICAL)   return { icon: AlertTriangle, msg: 'Critical risk', color: 'var(--danger-light)' };
  const hrs = (Date.now() - new Date(deal.updated_at).getTime()) / 36e5;
  if (hrs > 72) return { icon: Clock, msg: `${Math.floor(hrs)}h stale`, color: 'var(--warning)' };
  return null;
}

export default function L3Deals() {
  const { user } = useAuth();
  const { openLead } = useLeadSheet();
  const [stageFilter, setStageFilter] = useState('active');
  const [riskFilter, setRiskFilter]   = useState('all');
  const [search, setSearch]           = useState('');
  const [closeModal, setCloseModal]   = useState(null);
  const [closeNote, setCloseNote]     = useState('');
  const [selectedDeal, setSelectedDeal] = useState(null);

  const { data: allDeals = [], isLoading } = useDeals();
  const closeDeal    = useCloseDeal();
  const updateStage  = useUpdateDealStage();
  useRealtime({ table: 'deals', queryKey: ['deals'] });

  // Filter logic
  let deals = allDeals;
  if (stageFilter === 'active') deals = deals.filter(d => ![DEAL_STAGE.CLOSED_WON, DEAL_STAGE.CLOSED_LOST].includes(d.stage));
  else deals = deals.filter(d => d.stage === stageFilter);
  if (riskFilter !== 'all') deals = deals.filter(d => d.risk_level === riskFilter);
  if (search) deals = deals.filter(d => d.lead?.name?.toLowerCase().includes(search.toLowerCase()) || d.lead?.company?.toLowerCase().includes(search.toLowerCase()));

  const handleClose = async (won) => {
    await closeDeal.mutateAsync({ id: closeModal.id, won, notes: closeNote, actorId: user?.id });
    setCloseModal(null); setCloseNote('');
  };

  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);

  const columns = [
    {
      key: 'lead', label: 'Client',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Avatar name={row.lead?.name} size="sm" />
          <div>
            <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{row.lead?.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{row.lead?.company}</div>
          </div>
        </div>
      ),
    },
    { key: 'value', label: 'Value', sortable: true, render: v => <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: 'var(--text-sm)' }}>{formatCurrency(v)}</span> },
    { key: 'stage', label: 'Stage', render: v => <Badge variant={v === DEAL_STAGE.READY_TO_CLOSE ? 'success' : v === DEAL_STAGE.CLOSED_WON ? 'success' : v === DEAL_STAGE.CLOSED_LOST ? 'danger' : 'muted'}>{STAGE_LABELS[v] || v?.replace(/_/g, ' ')}</Badge> },
    { key: 'health_score', label: 'Health', render: v => <HealthScore score={v} size="sm" showLabel={false} /> },
    { key: 'risk_level', label: 'Risk', render: v => <RiskBadge risk={v} /> },
    { key: 'expected_close', label: 'Close Date', render: v => v ? <span style={{ fontSize: 'var(--text-xs)', color: new Date(v) < new Date() ? 'var(--danger-light)' : 'var(--text-muted)' }}>{formatDate(v)}</span> : '—' },
    {
      key: 'id', label: 'Alert',
      render: (_, row) => {
        const a = getAlert(row);
        if (!a) return <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>—</span>;
        const { icon: Icon, msg, color } = a;
        return <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color, fontWeight: 600 }}><Icon size={12} />{msg}</span>;
      },
    },
    {
      key: 'actions', label: '',
      render: (_, row) => {
        const isClosed = [DEAL_STAGE.CLOSED_WON, DEAL_STAGE.CLOSED_LOST].includes(row.stage);
        return (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {row.lead?.id && (
              <Button size="sm" variant="ghost" icon={Eye} onClick={e => { e.stopPropagation(); openLead(row.lead.id); }}>Lead</Button>
            )}
            {!isClosed && (
              <>
                <Button size="sm" variant="success" icon={CheckCircle} onClick={e => { e.stopPropagation(); setCloseModal(row); }}>Won</Button>
                <Button size="sm" variant="danger" icon={XCircle} onClick={e => { e.stopPropagation(); setCloseModal({ ...row, _lost: true }); }}>Lost</Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Deal Management</h1>
          <p className="page-subtitle">{deals.length} deals · {formatCurrency(totalValue)} total value</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client or company…" style={{ paddingLeft: 32 }} />
        </div>
        <div className="tabs" style={{ flexShrink: 0 }}>
          {STAGE_FILTERS.map(f => (
            <button key={f.value} className={`tab${stageFilter === f.value ? ' active' : ''}`} onClick={() => setStageFilter(f.value)}>{f.label}</button>
          ))}
        </div>
        <div className="tabs" style={{ flexShrink: 0 }}>
          {RISK_FILTERS.map(f => (
            <button key={f} className={`tab${riskFilter === f ? ' active' : ''}`} onClick={() => setRiskFilter(f)}>
              {f === 'all' ? 'All Risk' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        data={deals}
        loading={isLoading}
        onRowClick={row => setSelectedDeal(row)}
        emptyMessage="No deals match your filters"
      />

      {/* Deal Detail Side Panel */}
      {selectedDeal && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', zIndex: 200, overflowY: 'auto', padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{selectedDeal.lead?.name}</h3>
            <button onClick={() => setSelectedDeal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>×</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Value + Stage */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {[
                { label: 'Deal Value',    value: formatCurrency(selectedDeal.value), color: 'var(--success)' },
                { label: 'Stage',         value: STAGE_LABELS[selectedDeal.stage] || selectedDeal.stage?.replace(/_/g, ' ') },
                { label: 'Health Score',  value: `${selectedDeal.health_score ?? 0}/100` },
                { label: 'Expected Close',value: formatDate(selectedDeal.expected_close) },
                { label: 'Risk Level',    value: selectedDeal.risk_level },
                { label: 'Company',       value: selectedDeal.lead?.company },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: color || 'var(--text-primary)' }}>{value || '—'}</div>
                </div>
              ))}
            </div>

            {/* Health Score visual */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <HealthScore score={selectedDeal.health_score} size="lg" />
            </div>

            {/* Proposals */}
            {selectedDeal.proposals?.length > 0 && (
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>Proposals</div>
                {selectedDeal.proposals.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--text-sm)' }}>Proposal</span>
                    <Badge variant={p.status === 'accepted' ? 'success' : p.status === 'sent' ? 'info' : 'muted'}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {![DEAL_STAGE.CLOSED_WON, DEAL_STAGE.CLOSED_LOST].includes(selectedDeal.stage) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Button variant="success" icon={CheckCircle} style={{ width: '100%' }} onClick={() => { setCloseModal(selectedDeal); setSelectedDeal(null); }}>
                  Close as Won 🎉
                </Button>
                <Button variant="danger" icon={XCircle} style={{ width: '100%' }} onClick={() => { setCloseModal({ ...selectedDeal, _lost: true }); setSelectedDeal(null); }}>
                  Mark as Lost
                </Button>
                {selectedDeal.lead?.id && (
                  <Button variant="secondary" icon={Eye} style={{ width: '100%' }} onClick={() => { openLead(selectedDeal.lead.id); setSelectedDeal(null); }}>
                    View Lead Sheet
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close Modal */}
      <Modal open={!!closeModal} onClose={() => setCloseModal(null)}
        title={closeModal?._lost ? '❌ Mark as Lost' : '🎉 Close Deal — Won!'}
        footer={<>
          <Button variant="secondary" onClick={() => setCloseModal(null)}>Cancel</Button>
          <Button variant={closeModal?._lost ? 'danger' : 'success'} loading={closeDeal.isPending} onClick={() => handleClose(!closeModal?._lost)}>
            {closeModal?._lost ? 'Confirm Lost' : 'Confirm Won'}
          </Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius)', background: closeModal?._lost ? 'var(--danger-glow)' : 'var(--success-glow)', border: `1px solid ${closeModal?._lost ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: closeModal?._lost ? 'var(--danger-light)' : 'var(--success-light)', marginBottom: 4 }}>
              {closeModal?.lead?.name} — {closeModal?.lead?.company}
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(closeModal?.value)}</div>
          </div>
          <div className="form-group">
            <label>{closeModal?._lost ? 'Loss Reason *' : 'Closing Notes'}</label>
            <textarea value={closeNote} onChange={e => setCloseNote(e.target.value)}
              placeholder={closeModal?._lost ? 'Why was this deal lost? (competitor, budget, timing…)' : 'Final notes, next steps, celebration…'}
              rows={3} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
