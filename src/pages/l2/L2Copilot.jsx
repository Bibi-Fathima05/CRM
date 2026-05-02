import React from 'react';
import { Target, AlertTriangle, FileText, ShieldCheck, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { useL2Copilot } from '@/hooks/useL2Copilot';
import { useLeadSheet } from '@/hooks/useLeadSheet';
import { useCreateDeal } from '@/hooks/useDeals';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DEAL_STAGE } from '@/lib/constants';

const INSIGHT_CONFIG = {
  conversion: { icon: Target, color: 'var(--primary)', bg: 'var(--primary-glow)', label: 'Conversion Opp' },
  risk: { icon: AlertTriangle, color: 'var(--danger)', bg: 'var(--danger-glow)', label: 'Pipeline Risk' },
  proposal: { icon: FileText, color: 'var(--info)', bg: 'rgba(59,130,246,0.15)', label: 'Proposal Assist' },
  escalation: { icon: ShieldCheck, color: 'var(--success)', bg: 'var(--success-glow)', label: 'Escalation Check' },
};

export default function L2Copilot() {
  const { insights, isThinking } = useL2Copilot();
  const { openLead } = useLeadSheet();
  const createDeal = useCreateDeal();
  const { user } = useAuth();

  const handleAction = async (insight) => {
    if (insight.type === 'conversion') {
      try {
        await createDeal.mutateAsync({
          lead_id: insight.metadata.leadId,
          assigned_to: user?.id,
          value: insight.metadata.suggestedValue || 5000,
          stage: DEAL_STAGE.CONTACTED,
        });
      } catch (err) {
        console.error("Failed to create deal", err);
      }
    } else {
      // For risk, proposal, escalation, open the lead sheet to take action
      openLead(insight.metadata.dealId || insight.metadata.leadId);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Zap size={24} style={{ color: 'var(--primary-light)' }} />
            AI Pipeline Copilot
          </h1>
          <p className="page-subtitle">Your intelligent L2 Conversion Agent</p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {isThinking && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)', gap: 'var(--space-3)', color: 'var(--text-muted)' }}>
            <RefreshCw size={20} className="animate-spin" />
            <span>Analyzing pipeline data...</span>
          </div>
        )}

        {!isThinking && insights.length === 0 && (
          <Card style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <ShieldCheck size={48} style={{ color: 'var(--success-light)', opacity: 0.5, margin: '0 auto var(--space-4)' }} />
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>Pipeline looks clean</h3>
            <p style={{ color: 'var(--text-muted)' }}>No high-priority insights or stuck deals at the moment.</p>
          </Card>
        )}

        {!isThinking && insights.map((insight, idx) => {
          const cfg = INSIGHT_CONFIG[insight.type];
          const Icon = cfg.icon;

          return (
            <Card key={`${insight.id}-${idx}`} style={{ overflow: 'hidden', borderLeft: `4px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                <div style={{ 
                  width: 40, height: 40, borderRadius: 'var(--radius)', 
                  background: cfg.bg, color: cfg.color, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                }}>
                  <Icon size={20} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)' }}>
                      {insight.title}
                    </div>
                    <Badge variant="outline" style={{ borderColor: cfg.color, color: cfg.color }}>
                      {cfg.label}
                    </Badge>
                  </div>

                  <div style={{ display: 'grid', gap: 'var(--space-3)', background: 'var(--bg-surface-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', width: 80, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Status</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>{insight.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', width: 80, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Insight</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>{insight.insight}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', width: 80, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Action</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--primary-light)', fontWeight: 'var(--weight-medium)' }}>{insight.action}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="primary" 
                      icon={insight.type === 'conversion' ? ArrowRight : undefined}
                      onClick={() => handleAction(insight)}
                    >
                      {insight.type === 'conversion' ? 'Create Deal' : 'Take Action'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
