import { useState, useRef, useEffect } from 'react';
import { Zap, ChevronRight, Mic, CheckCircle, Users } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useAddInteraction } from '@/hooks/useLeads';
import { useLeadSheet } from '@/hooks/useLeadSheet';
import { COPILOT_SCRIPTS, INTERACTION_TYPE } from '@/lib/constants';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from 'sonner';

export default function L1Copilot() {
  const { user } = useAuth();
  const { openLead } = useLeadSheet();
  const { data: leads = [], isLoading } = useLeads({ level: 'l1' });
  const addInteraction = useAddInteraction();

  const [selectedLead, setSelectedLead] = useState(null);
  const [scriptIdx, setScriptIdx] = useState(0);
  const [checkedQ, setCheckedQ] = useState([]);
  const [timer, setTimer] = useState(0);
  const [callActive, setCallActive] = useState(false);
  const [activeObj, setActiveObj] = useState(null);

  // Use ref for timer interval to avoid stale closure
  const timerRef = useRef(null);

  const startCall = () => {
    setCallActive(true);
    setTimer(0);
    setCheckedQ([]);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  };

  const endCall = async () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setCallActive(false);

    // Auto-log the call as an interaction
    if (selectedLead && timer > 0) {
      const mins = Math.floor(timer / 60);
      const secs = timer % 60;
      const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      await addInteraction.mutateAsync({
        leadId: selectedLead.id,
        type: INTERACTION_TYPE.CALL,
        content: `Call via AI Copilot — duration: ${duration}. Questions asked: ${checkedQ.length}/${COPILOT_SCRIPTS.qualification_questions.length}`,
        createdBy: user?.id,
      });
      toast.success(`Call logged — ${duration}`);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const toggleQ = (i) => setCheckedQ(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Call Copilot</h1>
          <p className="page-subtitle">Real-time guidance for your sales calls</p>
        </div>
        {callActive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius)', padding: '6px 14px',
          }}>
            <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
            <span style={{ color: 'var(--danger-light)', fontWeight: 600, fontFamily: 'var(--font-mono)', minWidth: 48 }}>
              {fmtTime(timer)}
            </span>
            <Button size="sm" variant="danger" onClick={endCall} loading={addInteraction.isPending}>
              End Call
            </Button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-6)' }}>

        {/* Lead Selector */}
        <Card style={{ height: 'fit-content' }}>
          <CardHeader title="Select Lead" subtitle="Choose who to call" />

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 'var(--radius)' }} />)}
            </div>
          ) : leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
              <Users size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 'var(--text-sm)' }}>No leads yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 320, overflowY: 'auto' }}>
              {leads.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => { setSelectedLead(lead); setScriptIdx(0); }}
                  style={{
                    background: selectedLead?.id === lead.id ? 'var(--primary-glow)' : 'var(--bg-surface-2)',
                    border: `1px solid ${selectedLead?.id === lead.id ? 'var(--border-active)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', padding: 'var(--space-3)',
                    cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Avatar name={lead.name} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.company || lead.email}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!callActive && selectedLead && (
            <Button
              icon={Mic}
              variant="success"
              style={{ width: '100%', marginTop: 'var(--space-4)' }}
              onClick={startCall}
            >
              Start Call with {selectedLead.name.split(' ')[0]}
            </Button>
          )}

          {!selectedLead && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
              Select a lead to begin
            </p>
          )}
        </Card>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Call Script */}
          <Card>
            <CardHeader
              title="Call Script"
              subtitle={selectedLead ? `Personalized for ${selectedLead.name}` : 'Select a lead first'}
              actions={
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {scriptIdx + 1}/{COPILOT_SCRIPTS.initial_contact.length}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setScriptIdx(i => Math.max(0, i - 1))} disabled={scriptIdx === 0}>←</Button>
                  <Button size="sm" variant="ghost" onClick={() => setScriptIdx(i => Math.min(COPILOT_SCRIPTS.initial_contact.length - 1, i + 1))} disabled={scriptIdx === COPILOT_SCRIPTS.initial_contact.length - 1}>→</Button>
                </div>
              }
            />
            <div style={{
              background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)',
              padding: 'var(--space-4)', fontSize: 'var(--text-sm)',
              lineHeight: 'var(--leading-relaxed)', borderLeft: '3px solid var(--primary)',
              color: 'var(--text-primary)', minHeight: 60,
            }}>
              {COPILOT_SCRIPTS.initial_contact[scriptIdx]
                ?.replace('[Name]', selectedLead?.name || 'the lead')
                ?.replace('[Company]', selectedLead?.company || 'your company')}
            </div>
          </Card>

          {/* Objection Handlers */}
          <Card>
            <CardHeader title="Objection Handlers" subtitle="Click to expand response" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {Object.entries(COPILOT_SCRIPTS.objections).map(([key, response]) => (
                <div key={key}>
                  <button
                    onClick={() => setActiveObj(activeObj === key ? null : key)}
                    style={{
                      width: '100%',
                      background: activeObj === key ? 'var(--warning-glow)' : 'var(--bg-surface-2)',
                      border: `1px solid ${activeObj === key ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', padding: 'var(--space-3)',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', textTransform: 'capitalize', fontWeight: 'var(--weight-medium)' }}>
                      {key.replace(/_/g, ' ')}
                    </span>
                    <ChevronRight
                      size={14}
                      style={{
                        color: 'var(--text-muted)',
                        transform: activeObj === key ? 'rotate(90deg)' : 'none',
                        transition: 'transform var(--transition-fast)',
                        flexShrink: 0,
                      }}
                    />
                  </button>
                  {activeObj === key && (
                    <div style={{
                      marginTop: 'var(--space-2)', padding: 'var(--space-3)',
                      background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)',
                      fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                      lineHeight: 'var(--leading-relaxed)', borderLeft: '2px solid var(--warning)',
                    }}>
                      {response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Qualification Checklist */}
          <Card>
            <CardHeader
              title="Qualification Checklist"
              subtitle={callActive ? 'Check off as you ask each question' : 'Start a call to use this checklist'}
              actions={
                <Badge variant={checkedQ.length === COPILOT_SCRIPTS.qualification_questions.length ? 'success' : 'muted'}>
                  {checkedQ.length}/{COPILOT_SCRIPTS.qualification_questions.length}
                </Badge>
              }
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {COPILOT_SCRIPTS.qualification_questions.map((q, i) => (
                <label
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                    cursor: callActive ? 'pointer' : 'default',
                    padding: 'var(--space-2)', borderRadius: 'var(--radius)',
                    background: checkedQ.includes(i) ? 'var(--success-glow)' : 'transparent',
                    transition: 'background var(--transition-fast)',
                    opacity: callActive ? 1 : 0.6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkedQ.includes(i)}
                    onChange={() => callActive && toggleQ(i)}
                    disabled={!callActive}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0, marginTop: 2 }}
                  />
                  <span style={{
                    fontSize: 'var(--text-sm)',
                    color: checkedQ.includes(i) ? 'var(--success-light)' : 'var(--text-secondary)',
                    textDecoration: checkedQ.includes(i) ? 'line-through' : 'none',
                  }}>
                    {q}
                  </span>
                </label>
              ))}
            </div>

            {checkedQ.length === COPILOT_SCRIPTS.qualification_questions.length && (
              <div style={{
                marginTop: 'var(--space-4)', padding: 'var(--space-3)',
                borderRadius: 'var(--radius)', background: 'var(--success-glow)',
                border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                fontSize: 'var(--text-sm)', color: 'var(--success-light)',
              }}>
                <CheckCircle size={16} />
                All questions asked — ready to qualify this lead!
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
