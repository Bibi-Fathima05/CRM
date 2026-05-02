import { useState } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { useDeals, useCreateDeal } from '@/hooks/useDeals';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { PageLoader } from '@/components/ui/Spinner';
import { formatCurrency, timeAgo } from '@/utils/formatters';
import { STATUS_LABELS, STATUS_VARIANT } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import {
  Users, DollarSign, ArrowRight, Clock, Building2,
  Mail, Phone, Briefcase, Target, Plus, CheckCircle2, Search,
} from 'lucide-react';

export default function L2Leads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useLeads({ level: 'l2' });
  const { data: deals = [] } = useDeals();
  const createDeal = useCreateDeal();
  useRealtime({ table: 'leads', queryKey: ['leads'] });

  const [search, setSearch] = useState('');
  const [creatingDealFor, setCreatingDealFor] = useState(null);
  const [dealValue, setDealValue] = useState('');

  // Map lead IDs that already have deals
  const leadsWithDeals = new Set(deals.map(d => d.lead_id));

  const filtered = leads.filter(l =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.company?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingLeads = filtered.filter(l => !leadsWithDeals.has(l._id || l.id));
  const activeLeads = filtered.filter(l => leadsWithDeals.has(l._id || l.id));

  const handleCreateDeal = async (lead) => {
    const value = parseFloat(dealValue) || lead.budget || 0;
    await createDeal.mutateAsync({
      leadId: lead._id || lead.id,
      assignedTo: user?.id,
      value,
    });
    setCreatingDealFor(null);
    setDealValue('');
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Qualified Leads</h1>
          <p className="page-subtitle">Leads qualified from L1 — create deals to start conversion</p>
        </div>
      </div>

      <div className="stats-grid stagger" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard label="Total L2 Leads" value={leads.length} icon={Users} color="primary" />
        <StatCard label="Pending Deal" value={pendingLeads.length} icon={Target} color="warning" />
        <StatCard label="Deal Created" value={activeLeads.length} icon={CheckCircle2} color="success" />
        <StatCard label="Total Budget" value={formatCurrency(leads.reduce((s, l) => s + (l.budget || 0), 0))} icon={DollarSign} color="info" />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 'var(--space-5)', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search leads by name, company, or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 40, width: '100%', maxWidth: 400 }}
        />
      </div>

      {/* Pending Leads — need deals */}
      {pendingLeads.length > 0 && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)' }} />
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
              Awaiting Deal Creation ({pendingLeads.length})
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
            {pendingLeads.map(lead => (
              <Card key={lead._id || lead.id} style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: 'linear-gradient(90deg, #f59e0b, #f97316)' }} />
                <div style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <Avatar name={lead.name} size="md" />
                      <div>
                        <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{lead.name}</div>
                        {lead.company && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Building2 size={11} /> {lead.company}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    {lead.email && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={11} /> {lead.email}
                      </div>
                    )}
                    {lead.phone && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={11} /> {lead.phone}
                      </div>
                    )}
                    {lead.budget && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <DollarSign size={11} /> Budget: {formatCurrency(lead.budget)}
                      </div>
                    )}
                    {lead.timeline && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {lead.timeline}
                      </div>
                    )}
                  </div>

                  {lead.requirement && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-3)', lineHeight: 'var(--leading-relaxed)' }}>
                      <Briefcase size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {lead.requirement.length > 100 ? lead.requirement.slice(0, 100) + '…' : lead.requirement}
                    </div>
                  )}

                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                    Qualified {timeAgo(lead.qualified_at || lead.updated_at)} · Score: {lead.score || 0}
                  </div>

                  {creatingDealFor === (lead._id || lead.id) ? (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <input
                        type="number"
                        placeholder="Deal value"
                        value={dealValue}
                        onChange={e => setDealValue(e.target.value)}
                        style={{ flex: 1, fontSize: 'var(--text-sm)' }}
                        autoFocus
                      />
                      <Button size="sm" variant="primary" icon={CheckCircle2}
                        loading={createDeal.isPending}
                        onClick={() => handleCreateDeal(lead)}>
                        Create
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setCreatingDealFor(null); setDealValue(''); }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="primary" icon={Plus} style={{ width: '100%' }}
                      onClick={() => { setCreatingDealFor(lead._id || lead.id); setDealValue(lead.budget ? String(lead.budget) : ''); }}>
                      Create Deal
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Leads — already have deals */}
      {activeLeads.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
              In Pipeline ({activeLeads.length})
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
            {activeLeads.map(lead => {
              const deal = deals.find(d => d.lead_id === (lead._id || lead.id));
              return (
                <Card key={lead._id || lead.id} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => deal && navigate(`/l2/leads/${deal._id || deal.id}`)}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: 'linear-gradient(90deg, #10b981, #6366f1)' }} />
                  <div style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <Avatar name={lead.name} size="md" />
                        <div>
                          <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{lead.name}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{lead.company}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        {deal && <Badge variant="success">{formatCurrency(deal.value)}</Badge>}
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <Card>
          <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>
              No Qualified Leads Yet
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Leads qualified from L1 will appear here. Switch to L1 to qualify some leads first.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
