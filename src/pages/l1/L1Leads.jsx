import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Phone, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useLeads, useCreateLead } from '@/hooks/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { Table } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatPhone } from '@/utils/formatters';
import { LEAD_STATUS } from '@/lib/constants';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
});

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'New', value: LEAD_STATUS.NEW },
  { label: 'Follow Up', value: LEAD_STATUS.FOLLOW_UP },
  { label: 'Qualified', value: LEAD_STATUS.QUALIFIED },
  { label: 'Rejected', value: LEAD_STATUS.REJECTED },
];

export default function L1Leads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useRealtime({ table: 'leads', queryKey: ['leads'] });

  const { data: leads = [], isLoading } = useLeads({ level: 'l1', status: statusFilter || undefined, search: search || undefined });
  const createLead = useCreateLead();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(createSchema) });

  const onCreateLead = async (data) => {
    await createLead.mutateAsync({ ...data, current_level: 'l1', status: LEAD_STATUS.NEW, assigned_to: user?.id });
    reset();
    setShowCreate(false);
  };

  const columns = [
    {
      key: 'name', label: 'Lead', sortable: true,
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Avatar name={v} size="sm" />
          <div>
            <div style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{v}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{row.company || row.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', render: v => formatPhone(v) },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'score', label: 'Score', sortable: true, render: v => v ? <span style={{ fontWeight: 600, color: 'var(--primary-light)' }}>#{v}</span> : '—' },
    { key: 'created_at', label: 'Added', sortable: true, render: v => formatDate(v) },
    {
      key: 'id', label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button size="sm" variant="ghost" icon={Phone} onClick={e => { e.stopPropagation(); navigate(`/l1/leads/${row.id}`); }}>Call</Button>
          <Button size="sm" variant="primary" icon={CheckCircle} onClick={e => { e.stopPropagation(); navigate(`/l1/leads/${row.id}?qualify=1`); }}>Qualify</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Leads</h1>
          <p className="page-subtitle">{leads.length} leads in L1</p>
        </div>
        <Button icon={Plus} variant="primary" onClick={() => setShowCreate(true)}>Add Lead</Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…" style={{ paddingLeft: 36 }} />
        </div>
        <div className="tabs" style={{ flexShrink: 0 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.value} className={`tab${statusFilter === f.value ? ' active' : ''}`} onClick={() => setStatusFilter(f.value)}>{f.label}</button>
          ))}
        </div>
      </div>

      <Table columns={columns} data={leads} loading={isLoading} onRowClick={row => navigate(`/l1/leads/${row.id}`)} emptyMessage="No leads found" />

      {/* Create Lead Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Lead"
        footer={<>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="primary" loading={isSubmitting} onClick={handleSubmit(onCreateLead)}>Create Lead</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input placeholder="John Doe" {...register('name')} />
              {errors.name && <span className="form-error">{errors.name.message}</span>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" placeholder="john@company.com" {...register('email')} />
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input placeholder="+91 98765 43210" {...register('phone')} />
            </div>
            <div className="form-group">
              <label>Company</label>
              <input placeholder="Acme Corp" {...register('company')} />
            </div>
          </div>
          <div className="form-group">
            <label>Source</label>
            <select {...register('source')}>
              <option value="">Select source</option>
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="linkedin">LinkedIn</option>
              <option value="cold_call">Cold Call</option>
              <option value="typeform">Typeform</option>
              <option value="google_forms">Google Forms</option>
              <option value="widget">Website Widget</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
