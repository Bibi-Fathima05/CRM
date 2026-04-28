import { useState } from 'react';
import { Zap, ChevronRight, Mic, Clock, MessageSquare, HelpCircle, CheckCircle } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/context/AuthContext';
import { COPILOT_SCRIPTS } from '@/lib/constants';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function L1Copilot() {
  const { user } = useAuth();
  const { data: leads = [] } = useLeads({ level: 'l1', assignedTo: user?.id });
  const [selectedLead, setSelectedLead] = useState(null);
  const [scriptIdx, setScriptIdx] = useState(0);
  const [checkedQ, setCheckedQ] = useState([]);
  const [timer, setTimer] = useState(0);
  const [callActive, setCallActive] = useState(false);
  const [timerRef, setTimerRef] = useState(null);
  const [activeObj, setActiveObj] = useState(null);

  const startCall = () => {
    setCallActive(true);
    setTimer(0);
    const ref = setInterval(() => setTimer(t => t + 1), 1000);
    setTimerRef(ref);
  };

  const endCall = () => {
    setCallActive(false);
    clearInterval(timerRef);
  };

  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const toggleQ = (i) => setCheckedQ(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Call Copilot</h1>
          <p className="page-subtitle">Real-time guidance for your sales calls</p>
        </div>
        {callActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '6px 14px' }}>
            <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
            <span style={{ color: 'var(--danger-light)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{fmtTime(timer)}</span>
            <Button size="sm" variant="danger" onClick={endCall}>End Call</Button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-6)' }}>
        {/* Lead Selector */}
        <Card style={{ height: 'fit-content' }}>
          <CardHeader title="Select Lead" subtitle="Choose who to call" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {leads.slice(0, 10).map(lead => (
              <button key={lead.id} onClick={() => setSelectedLead(lead)}
                style={{ background: selectedLead?.id === lead.id ? 'var(--primary-glow)' : 'var(--bg-surface-2)', border: `1px solid ${selectedLead?.id === lead.id ? 'var(--border-active)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 'var(--space-3)', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2, transition: 'all var(--transition-fast)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>{lead.name}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{lead.company || lead.email}</span>
              </button>
            ))}
          </div>
          {!callActive && selectedLead && (
            <Button icon={Mic} variant="success" style={{ width: '100%', marginTop: 'var(--space-4)' }} onClick={startCall}>
              Start Call
            </Button>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Call Script */}
          <Card>
            <CardHeader title="Call Script" subtitle="Suggested opening lines" actions={
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button size="sm" variant="ghost" onClick={() => setScriptIdx(i => Math.max(0, i-1))}>←</Button>
                <Button size="sm" variant="ghost" onClick={() => setScriptIdx(i => Math.min(COPILOT_SCRIPTS.initial_contact.length-1, i+1))}>→</Button>
              </div>
            }>
            </CardHeader>
            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)', borderLeft: '3px solid var(--primary)', color: 'var(--text-primary)' }}>
              {COPILOT_SCRIPTS.initial_contact[scriptIdx]?.replace('[Name]', selectedLead?.name || 'the lead').replace('[Company]', selectedLead?.company || 'your company')}
            </div>
          </Card>

          {/* Objection Handlers */}
          <Card>
            <CardHeader title="Objection Handlers" subtitle="Click an objection to see the response" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {Object.entries(COPILOT_SCRIPTS.objections).map(([key, response]) => (
                <div key={key}>
                  <button onClick={() => setActiveObj(activeObj === key ? null : key)}
                    style={{ width: '100%', background: activeObj === key ? 'var(--warning-glow)' : 'var(--bg-surface-2)', border: `1px solid ${activeObj === key ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 'var(--space-3)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all var(--transition-fast)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', textTransform: 'capitalize', fontWeight: 'var(--weight-medium)' }}>{key.replace('_', ' ')}</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)', transform: activeObj === key ? 'rotate(90deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
                  </button>
                  {activeObj === key && (
                    <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)', borderLeft: '2px solid var(--warning)' }}>
                      {response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Qualification Questions Checklist */}
          <Card>
            <CardHeader title="Qualification Checklist" subtitle={`${checkedQ.length}/${COPILOT_SCRIPTS.qualification_questions.length} asked`}
              actions={<Badge variant={checkedQ.length === COPILOT_SCRIPTS.qualification_questions.length ? 'success' : 'muted'}>{checkedQ.length}/{COPILOT_SCRIPTS.qualification_questions.length}</Badge>} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {COPILOT_SCRIPTS.qualification_questions.map((q, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-2)', borderRadius: 'var(--radius)', background: checkedQ.includes(i) ? 'var(--success-glow)' : 'transparent', transition: 'background var(--transition-fast)' }}>
                  <input type="checkbox" checked={checkedQ.includes(i)} onChange={() => toggleQ(i)} style={{ width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 'var(--text-sm)', color: checkedQ.includes(i) ? 'var(--success-light)' : 'var(--text-secondary)', textDecoration: checkedQ.includes(i) ? 'line-through' : 'none' }}>{q}</span>
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
