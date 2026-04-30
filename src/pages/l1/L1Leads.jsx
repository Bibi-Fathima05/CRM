import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Phone, CheckCircle, Upload, Download,
  FileText, Clipboard, Trash2, AlertCircle, ChevronRight,
} from 'lucide-react';
import { useLeads, useImportLeads } from '@/hooks/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { Table } from '@/components/ui/Table';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatPhone } from '@/utils/formatters';
import { LEAD_STATUS } from '@/lib/constants';
import { parseCSVText, readFileAsText, getSampleCSV } from '@/utils/csvParser';
import { toast } from 'sonner';

const STATUS_FILTERS = [
  { label: 'All',       value: '' },
  { label: 'New',       value: LEAD_STATUS.NEW },
  { label: 'Follow Up', value: LEAD_STATUS.FOLLOW_UP },
  { label: 'Qualified', value: LEAD_STATUS.QUALIFIED },
  { label: 'Rejected',  value: LEAD_STATUS.REJECTED },
];

export default function L1Leads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showImport, setShowImport] = useState(false);

  // Import state
  const [importStep, setImportStep] = useState('upload'); // 'upload' | 'preview'
  const [importRows, setImportRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [pasteText, setPasteText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [editingRow, setEditingRow] = useState(null); // index of row being edited

  useRealtime({ table: 'leads', queryKey: ['leads'] });

  const { data: leads = [], isLoading } = useLeads({
    level: 'l1',
    status: statusFilter || undefined,
    search: search || undefined,
  });
  const importLeads = useImportLeads();

  // ── Parse helpers ─────────────────────────────────────────────
  const processText = (text) => {
    const { rows, errors } = parseCSVText(text);
    if (rows.length === 0 && errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    setImportRows(rows);
    setParseErrors(errors);
    setImportStep('preview');
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    const allowed = ['text/csv', 'text/plain', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ''];
    if (file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Excel .xlsx files need to be saved as CSV first. In Excel: File → Save As → CSV (Comma delimited)');
      return;
    }
    try {
      const text = await readFileAsText(file);
      processText(text);
    } catch {
      toast.error('Could not read file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handlePaste = () => {
    if (!pasteText.trim()) { toast.error('Paste some data first'); return; }
    processText(pasteText);
  };

  const removeRow = (i) => setImportRows(r => r.filter((_, idx) => idx !== i));

  const updateRow = (i, field, value) => {
    setImportRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const handleImport = async () => {
    const validRows = importRows.filter(r => r.name?.trim());
    if (validRows.length === 0) { toast.error('No valid rows to import'); return; }
    await importLeads.mutateAsync({ rows: validRows, assignedTo: user?.id });
    resetImport();
  };

  const resetImport = () => {
    setShowImport(false);
    setImportStep('upload');
    setImportRows([]);
    setParseErrors([]);
    setPasteText('');
    setEditingRow(null);
  };

  const downloadSample = () => {
    const blob = new Blob([getSampleCSV()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'flowcrm-leads-template.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Table columns ─────────────────────────────────────────────
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
    {
      key: 'score', label: 'Score', sortable: true,
      render: v => v ? <span style={{ fontWeight: 600, color: 'var(--primary-light)' }}>#{v}</span> : '—',
    },
    { key: 'created_at', label: 'Added', sortable: true, render: v => formatDate(v) },
    {
      key: 'id', label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button size="sm" variant="ghost" icon={Phone}
            onClick={e => { e.stopPropagation(); navigate(`/l1/leads/${row.id}`); }}>
            View
          </Button>
          <Button size="sm" variant="primary" icon={CheckCircle}
            onClick={e => { e.stopPropagation(); navigate(`/l1/leads/${row.id}?qualify=1`); }}>
            Qualify
          </Button>
        </div>
      ),
    },
  ];

  const validCount = importRows.filter(r => r.name?.trim()).length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Leads</h1>
          <p className="page-subtitle">{leads.length} lead{leads.length !== 1 ? 's' : ''} in L1</p>
        </div>
        <Button icon={Upload} variant="primary" onClick={() => setShowImport(true)}>
          Import Leads
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…" style={{ paddingLeft: 36, width: '100%' }} />
        </div>
        <div className="tabs" style={{ flexShrink: 0 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.value} className={`tab${statusFilter === f.value ? ' active' : ''}`}
              onClick={() => setStatusFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Table columns={columns} data={leads} loading={isLoading}
        onRowClick={row => navigate(`/l1/leads/${row.id}`)}
        emptyMessage="No leads yet. Click 'Import Leads' to add leads from CSV or Excel." />

      {/* ── Import Modal ── */}
      <Modal
        open={showImport}
        onClose={resetImport}
        title={importStep === 'upload' ? 'Import Leads' : `Preview — ${importRows.length} rows`}
        size="lg"
        footer={
          importStep === 'upload' ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button variant="ghost" icon={Download} size="sm" onClick={downloadSample}>
                Download Sample CSV
              </Button>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="secondary" onClick={resetImport}>Cancel</Button>
                <Button variant="primary" icon={ChevronRight} onClick={handlePaste}
                  disabled={!pasteText.trim()}>
                  Parse Pasted Data
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {validCount} valid · {importRows.length - validCount} invalid
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="secondary" onClick={() => setImportStep('upload')}>← Back</Button>
                <Button variant="primary" icon={Upload} loading={importLeads.isPending}
                  onClick={handleImport} disabled={validCount === 0}>
                  Import {validCount} Lead{validCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )
        }
      >
        {importStep === 'upload' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

            {/* Option 1: File Upload */}
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileText size={15} style={{ color: 'var(--primary-light)' }} />
                Upload CSV File
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-8)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'var(--primary-glow)' : 'var(--bg-surface-2)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>
                  Drag & drop a CSV file here, or click to browse
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                  Supports .csv files · Excel users: save as CSV first
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.txt"
                style={{ display: 'none' }}
                onChange={e => handleFileUpload(e.target.files[0])} />
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Option 2: Paste from Excel */}
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Clipboard size={15} style={{ color: 'var(--primary-light)' }} />
                Paste from Excel / Google Sheets
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                Select cells in Excel/Sheets (including header row), copy with Ctrl+C, then paste below
              </p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={`name\temail\tphone\tcompany\nJohn Smith\tjohn@acme.com\t+91 98765 43210\tAcme Corp\nSarah Lee\tsarah@co.in\t\tTech Co`}
                rows={6}
                style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
              />
            </div>

            {/* Column guide */}
            <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--primary-light)', marginBottom: 6 }}>
                Supported columns (any order, auto-detected):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['name *', 'email', 'phone', 'company', 'source'].map(col => (
                  <span key={col} style={{ fontSize: 11, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 4, background: 'var(--bg-surface-2)', color: col.includes('*') ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                    {col}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                * required · Column names are flexible (e.g. "Full Name", "Email Address", "Mobile" all work)
              </p>
            </div>
          </div>
        ) : (
          /* Preview step */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {parseErrors.length > 0 && (
              <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'var(--warning-glow)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                  <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--warning-light)' }}>
                    {parseErrors.length} row{parseErrors.length !== 1 ? 's' : ''} skipped
                  </span>
                </div>
                {parseErrors.slice(0, 3).map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e}</div>
                ))}
              </div>
            )}

            {/* Editable preview table */}
            <div style={{ overflowX: 'auto', maxHeight: 380, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-2)', position: 'sticky', top: 0 }}>
                    {['Name *', 'Email', 'Phone', 'Company', 'Source', ''].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, i) => {
                    const invalid = !row.name?.trim();
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: invalid ? 'var(--danger-glow)' : 'transparent' }}>
                        {['name', 'email', 'phone', 'company', 'source'].map(field => (
                          <td key={field} style={{ padding: '6px 8px' }}>
                            <input
                              value={row[field] || ''}
                              onChange={e => updateRow(i, field, e.target.value)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '1px solid transparent',
                                padding: '2px 4px',
                                fontSize: 12,
                                color: 'var(--text-primary)',
                                width: '100%',
                                minWidth: field === 'name' ? 120 : field === 'email' ? 160 : 80,
                                outline: 'none',
                              }}
                              onFocus={e => e.target.style.borderBottomColor = 'var(--primary)'}
                              onBlur={e => e.target.style.borderBottomColor = 'transparent'}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '6px 8px' }}>
                          <button onClick={() => removeRow(i)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {importRows.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-6)' }}>
                All rows removed. Go back to upload again.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
