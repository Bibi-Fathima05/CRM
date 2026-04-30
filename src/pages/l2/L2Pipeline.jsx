import { useDeals, useUpdateDealStage } from '@/hooks/useDeals';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { HealthScore } from '@/components/ui/HealthScore';
import { RiskBadge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/formatters';
import { STAGE_ORDER, STAGE_LABELS, DEAL_STAGE } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const STAGE_COLORS = {
  contacted: '#6366f1', demo: '#3b82f6', proposal: '#f59e0b',
  negotiation: '#10b981', ready_to_close: '#ec4899',
};

export default function L2Pipeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: deals = [], isLoading } = useDeals({ assignedTo: user?.id });
  const updateStage = useUpdateDealStage();
  useRealtime({ table: 'deals', queryKey: ['deals'] });

  const moveToNext = async (deal) => {
    const idx = STAGE_ORDER.indexOf(deal.stage);
    if (idx < STAGE_ORDER.length - 1) {
      await updateStage.mutateAsync({ id: deal.id, stage: STAGE_ORDER[idx + 1], actorId: user?.id });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Pipeline</h1>
        <p className="page-subtitle">Drag deals through stages</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', overflowX: 'auto', paddingBottom: 'var(--space-4)' }}>
        {STAGE_ORDER.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage);
          const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
          const color = STAGE_COLORS[stage];

          return (
            <div key={stage} style={{ minWidth: 280, flex: '0 0 280px' }}>
              {/* Column Header */}
              <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderBottom: `3px solid ${color}`, borderRadius: `var(--radius) var(--radius) 0 0`, marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{STAGE_LABELS[stage]}</span>
                  <span style={{ fontSize: 'var(--text-xs)', background: `${color}22`, color, padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>{stageDeals.length}</span>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{formatCurrency(stageValue)}</div>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {stageDeals.map(deal => (
                  <div key={deal.id}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', cursor: 'pointer', transition: 'all var(--transition-fast)', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                    onClick={() => navigate(`/l2/leads/${deal.id}`)}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: color }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{deal.lead?.name}</span>
                      <RiskBadge risk={deal.risk_level} />
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>{deal.lead?.company}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--success)' }}>{formatCurrency(deal.value)}</span>
                      <HealthScore score={deal.health_score} size="sm" showLabel={false} />
                    </div>
                    {stage !== DEAL_STAGE.READY_TO_CLOSE && (
                      <button onClick={e => { e.stopPropagation(); moveToNext(deal); }}
                        style={{ marginTop: 'var(--space-3)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-3)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = color + '22'; e.currentTarget.style.color = color; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface-3)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        Move to {STAGE_LABELS[STAGE_ORDER[STAGE_ORDER.indexOf(stage)+1]]} <ArrowRight size={11} />
                      </button>
                    )}
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                    No deals here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
