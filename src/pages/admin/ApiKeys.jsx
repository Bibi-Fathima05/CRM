import React, { useState } from 'react';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/utils/formatters';

const MOCK_KEYS = [
  { id: '1', name: 'Production API Key', key: 'fcrm_live_sk_7a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d', scope: 'read:leads write:leads read:deals', created_at: new Date(Date.now() - 86400000 * 30).toISOString(), last_used: new Date(Date.now() - 3600000).toISOString(), active: true },
  { id: '2', name: 'Staging Key', key: 'fcrm_test_sk_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', scope: 'read:leads read:deals', created_at: new Date(Date.now() - 86400000 * 7).toISOString(), last_used: new Date(Date.now() - 86400000 * 2).toISOString(), active: true },
  { id: '3', name: 'Legacy Integration', key: 'fcrm_live_sk_0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d', scope: 'read:leads', created_at: new Date(Date.now() - 86400000 * 90).toISOString(), last_used: new Date(Date.now() - 86400000 * 45).toISOString(), active: false },
];

const SCOPES = ['read:leads','write:leads','read:deals','write:deals','read:users','write:users','read:interactions','write:interactions'];

function maskKey(key) { return key.slice(0, 18) + '•'.repeat(16) + key.slice(-6); }
function generateKey() {
  const chars = 'abcdef0123456789';
  const rand = () => Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `fcrm_live_sk_${rand()}`;
}

export function ApiKeys() {
  const [keys, setKeys] = useState(MOCK_KEYS);
  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState(['read:leads']);
  const [createdKey, setCreatedKey] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const handleCopy = (id, key) => {
    navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRevoke = (id) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, active: false } : k));
    setRevokeTarget(null);
  };

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    const key = generateKey();
    const newKey = { id: Date.now().toString(), name: newKeyName, key, scope: newKeyScopes.join(' '), created_at: new Date().toISOString(), last_used: null, active: true };
    setKeys(prev => [newKey, ...prev]);
    setCreatedKey(newKey);
    setShowCreate(false);
    setNewKeyName('');
    setNewKeyScopes(['read:leads']);
  };

  const toggleScope = (scope) => setNewKeyScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">API Keys</h1>
          <p className="page-subtitle">Manage programmatic access to FlowCRM</p>
        </div>
        <Button icon={Plus} variant="primary" onClick={() => setShowCreate(true)}>Generate New Key</Button>
      </div>

      {createdKey && (
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <CheckCircle size={20} style={{ color: 'var(--success-light)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', marginBottom: 4 }}>"{createdKey.name}" created — copy it now, it won't be shown again!</div>
            <code style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--success-light)', wordBreak: 'break-all' }}>{createdKey.key}</code>
          </div>
          <Button size="sm" variant="ghost" icon={copied === 'new' ? CheckCircle : Copy} onClick={() => handleCopy('new', createdKey.key)}>{copied === 'new' ? 'Copied!' : 'Copy'}</Button>
          <Button size="sm" variant="ghost" onClick={() => setCreatedKey(null)}>Dismiss</Button>
        </div>
      )}

      <Card style={{ marginBottom: 'var(--space-6)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--primary-light)', marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>API keys grant programmatic access to FlowCRM. Treat them like passwords — never expose them in client-side code or version control.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="API Keys" subtitle={`${keys.filter(k => k.active).length} active · ${keys.filter(k => !k.active).length} revoked`} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {keys.map((apiKey, i) => (
            <div key={apiKey.id} style={{ padding: 'var(--space-4) var(--space-5)', borderTop: i > 0 ? '1px solid var(--border)' : 'none', opacity: apiKey.active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', flexShrink: 0, background: apiKey.active ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={16} style={{ color: apiKey.active ? 'var(--primary-light)' : 'var(--text-muted)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 6 }}>
                    <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{apiKey.name}</span>
                    <Badge variant={apiKey.active ? 'success' : 'muted'} dot>{apiKey.active ? 'Active' : 'Revoked'}</Badge>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--bg-surface-2)', padding: '6px 10px', borderRadius: 'var(--radius)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, wordBreak: 'break-all' }}>{revealed[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}</span>
                    {apiKey.active && (
                      <button onClick={() => setRevealed(prev => ({ ...prev, [apiKey.id]: !prev[apiKey.id] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {revealed[apiKey.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 6 }}>
                    {apiKey.scope.split(' ').map(s => <Badge key={s} variant="muted">{s}</Badge>)}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Created {formatDateTime(apiKey.created_at)}{apiKey.last_used ? ` · Last used ${formatDateTime(apiKey.last_used)}` : ' · Never used'}
                  </div>
                </div>
                {apiKey.active && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                    <Button size="sm" variant="ghost" icon={copied === apiKey.id ? CheckCircle : Copy} onClick={() => handleCopy(apiKey.id, apiKey.key)}>{copied === apiKey.id ? 'Copied!' : 'Copy'}</Button>
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => setRevokeTarget(apiKey)}>Revoke</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Generate New API Key"
        footer={<div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button variant="primary" onClick={handleCreate} disabled={!newKeyName.trim()}>Generate Key</Button></div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 6 }}>Key Name</label>
            <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g. Zapier Integration" className="input" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 10 }}>Permissions</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              {SCOPES.map(scope => (
                <label key={scope} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius)', background: newKeyScopes.includes(scope) ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface-2)', border: `1px solid ${newKeyScopes.includes(scope) ? 'rgba(99,102,241,0.3)' : 'transparent'}`, fontSize: 'var(--text-xs)', fontFamily: 'monospace', transition: 'all var(--transition-fast)' }}>
                  <input type="checkbox" checked={newKeyScopes.includes(scope)} onChange={() => toggleScope(scope)} style={{ accentColor: 'var(--primary)' }} />{scope}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!revokeTarget} onClose={() => setRevokeTarget(null)} title="Revoke API Key" size="sm"
        footer={<div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setRevokeTarget(null)}>Cancel</Button><Button variant="danger" icon={Trash2} onClick={() => handleRevoke(revokeTarget?.id)}>Revoke Key</Button></div>}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>Are you sure you want to revoke <strong>"{revokeTarget?.name}"</strong>? Applications using this key will immediately lose access. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
