import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, CheckCircle, Upload, Download,
  FileText, Clipboard, Trash2, AlertCircle, ChevronRight, Plus, AlertTriangle,
  FileSpreadsheet, File,
} from 'lucide-react';
import { useLeads, useImportLeads, useCreateLead } from '@/hooks/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { useLeadSheet } from '@/hooks/useLeadSheet';
import { Table } from '@/components/ui/Table';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatPhone, formatDateTime } from '@/utils/formatters';
import { LEAD_STATUS } from '@/lib/constants';
import { parseCSVText, readFileAsText, getSampleCSV } from '@/utils/csvParser';
import { parseFile } from '@/utils/fileParser';
import { toast } from 'sonner';

const STATUS_FILTERS = [
  { label: 'All',          value: '' },
  { label: 'New',          value: LEAD_STATUS.NEW },
  { label: 'Contacted',    value: LEAD_STATUS.CONTACTED },
  { label: 'Follow Up',    value: LEAD_STATUS.FOLLOW_UP },
  { label: 'Qualified',    value: LEAD_STATUS.QUALIFIED },
  { label: 'Converted',    value: LEAD_STATUS.CONVERTED },
  { label: 'Rejected',     value: LEAD_STATUS.REJECTED },
];

const EMPTY_FORM = { name: '', email: '', phone: '', company: '', job_title: '', location: '', source: '', source_detail: '', budget: '', requirement: '', timeline: '', industry: '' };

export default function L1Leads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openLead } = useLeadSheet();
  const fileInputRef = useRef(null);

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [showImport, setShowImport]   = useState(false);

  // Create form state
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formErrors, setFormErrors]   = useState({});
  const [submitError, setSubmitError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null); // existing lead

  // Import state
  const [importStep, setImportStep]   = useState('upload');
  const [importRows, setImportRows]   = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [pasteText, setPasteText]     = useState('');
  const [dragOver, setDragOver]       = useState(false);
  const [fileMeta, setFileMeta]       = useState(null); // { type, sheetName?, pageCount? }
  const [fileParsing, setFileParsing] = useState(false);

  useRealtime({ table: 'leads', queryKey: ['leads'] });

  const { data: leads = [], isLoading } = useLeads({
    level: 'l1',
    status: statusFilter || undefined,
    search: search || undefined,
  });
  const importLeads = useImportLeads();
  const createLead  = useCreateLead();

  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setFormErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email';
    return errs;
  };

  const handleCreate = async (force = false) => {
    if (!force) {
      const errs = validate();
      if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    }
    setSubmitError('');
    setDuplicateWarning(null);
    try {
      const result = await createLead.mutateAsync({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        job_title: form.job_title.trim() || null,
        location: form.location.trim() || null,
        source_detail: form.source_detail.trim() || null,
        budget: form.budget ? parseFloat(form.budget) : null,
        requirement: form.requirement.trim() || null,
        timeline: form.timeline.trim() || null,
        industry: form.industry.trim() || null,
        current_level: 'l1',
        status: LEAD_STATUS.NEW,
        assigned_to: user?.id || null,
        created_by: user?.id || null,
        force,
      });
      setForm(EMPTY_FORM); setFormErrors({}); setSubmitError('');
      setDuplicateWarning(null); setShowCreate(false);
      // Open the new lead in LeadSheet
      if (result?.id) openLead(result.id);
    } catch (e) {
      if (e.isDuplicate) {
        setDuplicateWarning(e.existing);
      } else {
        setSubmitError(e.message || 'Failed to create lead');
      }
    }
  };

  const closeCreate = () => {
    setShowCreate(false); setForm(EMPTY_FORM);
    setFormErrors({}); setSubmitError(''); setDuplicateWarning(null);
  };

  // ── Import helpers ────────────────────────────────────────
  const processText = (text) => {
    const { rows, errors } = parseCSVText(text);
    if (rows.length === 0 && errors.length > 0) { toast.error(errors[0]); return; }
    setImportRows(rows); setParseErrors(errors); setImportStep('preview');
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();

    // Excel or PDF → use fileParser
    if (name.match(/\.(xlsx|xls|pdf)$/i)) {
      setFileParsing(true);
      try {
        const result = await parseFile(file);
        if (result.rows.length === 0 && result.errors.length > 0) {
          toast.error(result.errors[0]);
          setFileParsing(false);
          return;
        }
        setImportRows(result.rows);
        setParseErrors(result.errors);
        setFileMeta(result.meta);
        setImportStep('preview');
      } catch (err) {
        console.error('File parse error:', err);
        toast.error(`Could not parse ${name.split('.').pop().toUpperCase()} file: ${err.message}`);
      } finally {
        setFileParsing(false);
      }
      return;
    }

    // CSV / TXT → use csvParser
    try { processText(await readFileAsText(file)); }
    catch { toast.error('Could not read file'); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFileUpload(e.dataTransfer.files[0]);
  };

  const removeRow = (i) => setImportRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) =>
    setImportRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const handleImport = async () => {
    const valid = importRows.filter(r => r.name?.trim());
    if (valid.length === 0) { toast.error('No valid rows'); return; }
    const captureMethod = fileMeta?.type || 'csv';
    await importLeads.mutateAsync({ rows: valid, assignedTo: user?.id, captureMethod });
    resetImport();
  };

  const resetImport = () => {
    setShowImport(false); setImportStep('upload');
    setImportRows([]); setParseErrors([]); setPasteText('');
    setFileMeta(null); setFileParsing(false);
  };

  const downloadSample = () => {
    const blob = new Blob([getSampleCSV()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'flowcrm-leads-template.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const validCount = importRows.filter(r => r.name?.trim()).length;

  // ── Table columns ─────────────────────────────────────────
  const columns = [
    {
      key: 'name', label: 'Lead', sortable: true,
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Avatar name={v} size="sm" />
          <div>
            <div style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{v}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{row.job_title || row.company || row.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone',   label: 'Phone',   render: v => formatPhone(v) },
    { key: 'company', label: 'Company', render: v => v || '—' },
    { key: 'status',  label: 'Status',  render: v => <StatusBadge status={v} /> },
    { key: 'score',   label: 'Score', sortable: true, render: v => v ? <span style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{v}</span> : '—' },
    { key: 'source',  label: 'Source',  render: v => v ? <Badge variant="muted">{v}</Badge> : '—' },
    { key: 'created_at', label: 'Added', sortable: true, render: v => formatDate(v) },
    {
      key: 'id', label: '',
      render: (_, row) => (
        <Button size="sm" variant="primary" icon={CheckCircle}
          onClick={e => { e.stopPropagation(); openLead(row.id); }}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Leads</h1>
          <p className="page-subtitle">{leads.length} lead{leads.length !== 1 ? 's' : ''} in L1</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button icon={Plus} variant="secondary" onClick={() => setShowCreate(true)}>Add Lead</Button>
          <Button icon={Upload} variant="primary" onClick={() => setShowImport(true)}>Import</Button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…" style={{ paddingLeft: 36, width: '100%' }} />
        </div>
        <div className="tabs" style={{ flexShrink: 0 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.value} className={`tab${statusFilter === f.value ? ' active' : ''}`} onClick={() => setStatusFilter(f.value)}>{f.label}</button>
          ))}
        </div>
      </div>

      <Table columns={columns} data={leads} loading={isLoading}
        onRowClick={row => openLead(row.id)}
        emptyMessage="No leads yet. Click 'Add Lead' or 'Import' to get started." />

      {/* ── Add Lead Modal ── */}
      <Modal open={showCreate} onClose={closeCreate} title="Add New Lead" size="lg"
        footer={<>
          <Button variant="secondary" onClick={closeCreate}>Cancel</Button>
          <Button variant="primary" icon={Plus} loading={createLead.isPending} onClick={() => handleCreate(false)}>Create Lead</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {submitError && (
            <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 'var(--text-sm)', color: 'var(--danger-light)' }}>
              ⚠️ {submitError}
            </div>
          )}

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius)', background: 'var(--warning-glow)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--warning-light)' }}>Duplicate detected</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                A lead with this email/phone already exists: <strong>{duplicateWarning.name}</strong> ({duplicateWarning.email}) — added {formatDateTime(duplicateWarning.created_at)}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button size="sm" variant="ghost" onClick={() => { openLead(duplicateWarning.id); closeCreate(); }}>View Existing Lead</Button>
                <Button size="sm" variant="warning" onClick={() => handleCreate(true)}>Save Anyway</Button>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="John Doe" style={{ borderColor: formErrors.name ? 'var(--danger)' : undefined }} />
              {formErrors.name && <span className="form-error">{formErrors.name}</span>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="john@company.com" style={{ borderColor: formErrors.email ? 'var(--danger)' : undefined }} />
              {formErrors.email && <span className="form-error">{formErrors.email}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label>Company</label>
              <input value={form.company} onChange={e => setField('company', e.target.value)} placeholder="Acme Corp" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Job Title</label>
              <input value={form.job_title} onChange={e => setField('job_title', e.target.value)} placeholder="CTO" />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={form.location} onChange={e => setField('location', e.target.value)} placeholder="Mumbai, Maharashtra" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Source</label>
              <select value={form.source} onChange={e => setField('source', e.target.value)}>
                <option value="">Select source</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="linkedin">LinkedIn</option>
                <option value="cold_call">Cold Call</option>
                <option value="typeform">Typeform</option>
                <option value="google_forms">Google Forms</option>
                <option value="widget">Website Widget</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Source Detail</label>
              <input value={form.source_detail} onChange={e => setField('source_detail', e.target.value)} placeholder="Campaign name, referral name…" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Budget (₹)</label>
              <input type="number" value={form.budget} onChange={e => setField('budget', e.target.value)} placeholder="500000" />
            </div>
            <div className="form-group">
              <label>Timeline</label>
              <input value={form.timeline} onChange={e => setField('timeline', e.target.value)} placeholder="Q2 2026" />
            </div>
          </div>
          <div className="form-group">
            <label>Requirement</label>
            <textarea value={form.requirement} onChange={e => setField('requirement', e.target.value)} placeholder="What does the customer need?" rows={2} />
          </div>
        </div>
      </Modal>

      {/* ── Import Modal ── */}
      <Modal open={showImport} onClose={resetImport}
        title={importStep === 'upload' ? 'Import Leads' : `Preview — ${importRows.length} rows${fileMeta?.type === 'excel' ? ` (Sheet: ${fileMeta.sheetName})` : fileMeta?.type === 'pdf' ? ` (${fileMeta.pageCount} page${fileMeta.pageCount !== 1 ? 's' : ''})` : ''}`}
        size="lg"
        footer={
          importStep === 'upload' ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button variant="ghost" icon={Download} size="sm" onClick={downloadSample}>Download Sample CSV</Button>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="secondary" onClick={resetImport}>Cancel</Button>
                <Button variant="primary" icon={ChevronRight} onClick={() => processText(pasteText)} disabled={!pasteText.trim()}>Parse Pasted Data</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{validCount} valid · {importRows.length - validCount} invalid</span>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="secondary" onClick={() => setImportStep('upload')}>← Back</Button>
                <Button variant="primary" icon={Upload} loading={importLeads.isPending} onClick={handleImport} disabled={validCount === 0}>Import {validCount} Lead{validCount !== 1 ? 's' : ''}</Button>
              </div>
            </div>
          )
        }>
        {importStep === 'upload' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* File drop zone */}
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileText size={15} style={{ color: 'var(--primary-light)' }} /> Upload File
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-8)', textAlign: 'center', cursor: fileParsing ? 'wait' : 'pointer', background: dragOver ? 'var(--primary-glow)' : 'var(--bg-surface-2)', transition: 'all var(--transition-fast)', opacity: fileParsing ? 0.6 : 1 }}>
                {fileParsing ? (
                  <>
                    <div className="spinner" style={{ margin: '0 auto 8px', width: 28, height: 28 }} />
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--primary-light)', fontWeight: 'var(--weight-medium)' }}>Parsing file…</p>
                  </>
                ) : (
                  <>
                    <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>Drag & drop your file, or click to browse</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', marginTop: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--bg-surface-3)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                        <FileSpreadsheet size={12} style={{ color: 'var(--success)' }} /> .xlsx / .xls
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--bg-surface-3)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                        <File size={12} style={{ color: 'var(--danger-light)' }} /> .pdf
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--bg-surface-3)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                        <FileText size={12} style={{ color: 'var(--primary-light)' }} /> .csv
                      </span>
                    </div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls,.pdf" style={{ display: 'none' }} onChange={e => { handleFileUpload(e.target.files[0]); e.target.value = ''; }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Paste zone */}
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Clipboard size={15} style={{ color: 'var(--primary-light)' }} /> Paste from Excel / Google Sheets
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>Select cells including header row, copy (Ctrl+C), paste below</p>
              <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder={`name\temail\tphone\tcompany\nJohn Smith\tjohn@acme.com\t+91 98765 43210\tAcme Corp`}
                rows={5} style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
            </div>

            <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--primary-light)', marginBottom: 6 }}>Supported columns (auto-detected):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['name *','email','phone','company','job_title','location','source','budget','requirement','timeline','industry','company_size'].map(col => (
                  <span key={col} style={{ fontSize: 11, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 4, background: 'var(--bg-surface-2)', color: col.includes('*') ? 'var(--primary-light)' : 'var(--text-muted)' }}>{col}</span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {parseErrors.length > 0 && (
              <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'var(--warning-glow)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                  <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--warning-light)' }}>{parseErrors.length} row{parseErrors.length !== 1 ? 's' : ''} skipped</span>
                </div>
                {parseErrors.slice(0,3).map((e, i) => <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e}</div>)}
              </div>
            )}
            <div style={{ overflowX: 'auto', maxHeight: 380, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-2)', position: 'sticky', top: 0 }}>
                    {['Name *','Email','Phone','Company','Job Title','Source','Budget',''].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, i) => {
                    const invalid = !row.name?.trim();
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: invalid ? 'var(--danger-glow)' : 'transparent' }}>
                        {['name','email','phone','company','job_title','source','budget'].map(field => (
                          <td key={field} style={{ padding: '6px 8px' }}>
                            <input value={row[field] || ''} onChange={e => updateRow(i, field, e.target.value)}
                              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid transparent', padding: '2px 4px', fontSize: 12, color: 'var(--text-primary)', width: '100%', minWidth: field === 'name' ? 120 : 80, outline: 'none' }}
                              onFocus={e => e.target.style.borderBottomColor = 'var(--primary)'}
                              onBlur={e => e.target.style.borderBottomColor = 'transparent'} />
                          </td>
                        ))}
                        <td style={{ padding: '6px 8px' }}>
                          <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
