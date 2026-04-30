import React, { useState } from 'react';
import { Mail, MessageCircle, Calendar, FileText, Slack, Zap, Settings, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

const INTEGRATIONS_DATA = [
  {
    id: 'gmail', name: 'Gmail', desc: 'Send emails and track opens directly from lead profiles', icon: Mail,
    color: '#EA4335', category: 'Communication', connected: false,
    features: ['Send emails from lead profile', 'Track open & click rates', 'Auto-log to interactions'],
    docsUrl: 'https://developers.google.com/gmail',
  },
  {
    id: 'whatsapp', name: 'WhatsApp Business', desc: 'Send WhatsApp messages to leads and track conversations', icon: MessageCircle,
    color: '#25D366', category: 'Communication', connected: true,
    features: ['Send messages to leads', 'Template message support', 'Auto-log conversations'],
    connectedAs: 'wa.me/+918888888888',
  },
  {
    id: 'calendly', name: 'Calendly', desc: 'Let leads book meetings directly from the CRM', icon: Calendar,
    color: '#006BFF', category: 'Scheduling', connected: true,
    features: ['Embed booking links', 'Auto-create follow-ups', 'Sync meeting status'],
    connectedAs: 'calendly.com/flowcrm',
  },
  {
    id: 'typeform', name: 'Typeform', desc: 'Capture leads from Typeform forms automatically', icon: FileText,
    color: '#262627', category: 'Lead Capture', connected: false,
    features: ['Auto-import form responses', 'Map fields to lead properties', 'Real-time sync'],
  },
  {
    id: 'slack', name: 'Slack', desc: 'Get CRM alerts and notifications in your Slack workspace', icon: Slack,
    color: '#4A154B', category: 'Notifications', connected: true,
    features: ['Deal alerts in channels', 'Daily summary reports', 'Mention agents on assignments'],
    connectedAs: '#crm-alerts',
  },
  {
    id: 'zapier', name: 'Zapier', desc: 'Connect FlowCRM to 5000+ apps through Zapier workflows', icon: Zap,
    color: '#FF4A00', category: 'Automation', connected: false,
    features: ['1000+ app connections', 'Multi-step zaps', 'Custom field mapping'],
  },
];

export function Integrations() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS_DATA);
  const [selected, setSelected] = useState(null);
  const [connecting, setConnecting] = useState(null);

  const handleConnect = (id) => {
    setConnecting(id);
    setTimeout(() => {
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: true, connectedAs: 'Connected' } : i));
      setConnecting(null);
      setSelected(null);
    }, 1500);
  };

  const handleDisconnect = (id) => {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: false, connectedAs: undefined } : i));
    setSelected(null);
  };

  const categories = [...new Set(integrations.map(i => i.category))];
  const connectedCount = integrations.filter(i => i.connected).length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">Connect FlowCRM with your favourite tools</p>
        </div>
        <Badge variant="success" dot>{connectedCount} connected</Badge>
      </div>

      {/* Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Available', value: integrations.length, color: 'var(--text-primary)' },
          { label: 'Connected', value: connectedCount, color: 'var(--success-light)' },
          { label: 'Not Connected', value: integrations.length - connectedCount, color: 'var(--text-muted)' },
        ].map(s => (
          <Card key={s.label} style={{ padding: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>{cat}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
            {integrations.filter(i => i.category === cat).map(item => {
              const Icon = item.icon;
              return (
                <Card key={item.id} hover style={{ cursor: 'pointer', transition: 'all var(--transition-fast)' }} onClick={() => setSelected(item)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', flexShrink: 0, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} style={{ color: item.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                        <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{item.name}</span>
                        {item.connected
                          ? <Badge variant="success" dot>Connected</Badge>
                          : <Badge variant="muted">Not Connected</Badge>}
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
                      {item.connected && item.connectedAs && (
                        <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--success-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} />{item.connectedAs}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant={item.connected ? 'ghost' : 'primary'} onClick={e => { e.stopPropagation(); setSelected(item); }}>
                      {item.connected ? <Settings size={13} /> : 'Connect'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.name} size="md"
          footer={
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
              {selected.connected
                ? <Button variant="danger" icon={XCircle} onClick={() => handleDisconnect(selected.id)}>Disconnect</Button>
                : <Button variant="primary" icon={CheckCircle} loading={connecting === selected.id} onClick={() => handleConnect(selected.id)}>Connect {selected.name}</Button>
              }
            </div>
          }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface-2)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: `${selected.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {React.createElement(selected.icon, { size: 26, style: { color: selected.color } })}
              </div>
              <div>
                <div style={{ fontWeight: 'var(--weight-semibold)' }}>{selected.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{selected.category}</div>
                {selected.connected && <Badge variant="success" dot style={{ marginTop: 6 }}>Connected</Badge>}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 10 }}>What you get</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {selected.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    <CheckCircle size={14} style={{ color: 'var(--success-light)', flexShrink: 0 }} />{f}
                  </div>
                ))}
              </div>
            </div>
            {!selected.connected && (
              <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Clicking "Connect" will open OAuth authentication. You'll be redirected back after authorizing.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
