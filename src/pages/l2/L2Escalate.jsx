import { useState } from 'react';
import { CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { useDeal, useEscalateDeal } from '@/hooks/useDeals';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/formatters';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';

const READINESS_CHECKS = [
  { key: 'proposal', label: 'Proposal sent and acknowledged' },
  { key: 'decision_maker', label: 'Decision maker engaged' },
  { key: 'budget_confirmed', label: 'Budget confirmed' },
  { key: 'timeline_agreed', label: 'Timeline agreed upon' },
  { key: 'objections_handled', label: 'All objections addressed' },
];

export default function L2Escalate() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id);
  const escalate = useEscalateDeal();
  const [checks, setChecks] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);

  const allChecked = READINESS_CHECKS.every(c => checks[c.key]);

  const toggleCheck = (key) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const handleEscalate = async () => {
    await escalate.mutateAsync({ dealId: deal.id, leadId: deal.lead_id, actorId: user?.id });
    setShowConfirm(false);
    navigate('/l2/pipeline');
  };

  if (isLoading) return <PageLoader />;
  if (!deal) return <div style={{ padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Deal not found</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div><h1 className="page-title">Escalate to L3</h1><p className="page-subtitle">Validate deal readiness before closure</p></div>
      </div>

      {/* Deal Summary */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <CardHeader title="Deal Summary" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          {[
            { label: 'Client', value: deal.lead?.name },
            { label: 'Company', value: deal.lead?.company },
            { label: 'Deal Value', value: formatCurrency(deal.value) },
            { label: 'Current Stage', value: deal.stage?.replace(/_/g, ' ').toUpperCase() },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{value || '—'}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Readiness Checklist */}
      <Card>
        <CardHeader title="Readiness Checklist"
          subtitle="All items must be checked to escalate"
          actions={<Badge variant={allChecked ? 'success' : 'warning'}>{Object.values(checks).filter(Boolean).length}/{READINESS_CHECKS.length}</Badge>} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          {READINESS_CHECKS.map(({ key, label }) => (
            <label key={key} onClick={() => toggleCheck(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-4)', borderRadius: 'var(--radius)', background: checks[key] ? 'var(--success-glow)' : 'var(--bg-surface-2)', border: `1px solid ${checks[key] ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, transition: 'all var(--transition-fast)' }}>
              <div style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', border: `2px solid ${checks[key] ? 'var(--success)' : 'var(--border)'}`, background: checks[key] ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--transition-fast)', flexShrink: 0 }}>
                {checks[key] && <CheckCircle size={14} color="#fff" />}
              </div>
              <span style={{ fontSize: 'var(--text-sm)', color: checks[key] ? 'var(--success-light)' : 'var(--text-primary)', fontWeight: checks[key] ? 'var(--weight-medium)' : 'var(--weight-regular)' }}>{label}</span>
            </label>
          ))}
        </div>

        {!allChecked && (
          <div className="alert alert-warning" style={{ marginBottom: 'var(--space-4)' }}>
            <AlertCircle size={16} />
            Complete all checklist items before escalating
          </div>
        )}

        <Button icon={ArrowRight} variant="primary" size="lg" style={{ width: '100%' }} disabled={!allChecked} onClick={() => setShowConfirm(true)}>
          Escalate to L3 – Revenue Closure
        </Button>
      </Card>

      {/* Confirm Modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Escalation"
        footer={<>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button variant="primary" loading={escalate.isPending} onClick={handleEscalate}>Yes, Escalate Now</Button>
        </>}>
        <p style={{ color: 'var(--text-secondary)' }}>
          You're escalating <strong>{deal.lead?.name}</strong>'s deal ({formatCurrency(deal.value)}) to the L3 closure team. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
