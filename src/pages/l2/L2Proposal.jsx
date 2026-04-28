import { useState, useRef } from 'react';
import { FileText, Download, Plus, Trash2, Copy, Check } from 'lucide-react';
import { useDeals } from '@/hooks/useDeals';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function L2Proposal() {
  const { user } = useAuth();
  const { data: deals = [] } = useDeals({ assignedTo: user?.id });
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const proposalRef = useRef(null);

  const [form, setForm] = useState({
    title: '', intro: '', deliverables: '',
    validity: '30', paymentTerms: 'Net 30',
    lineItems: [{ description: '', qty: 1, rate: '' }],
  });

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (i, k, v) => setForm(f => ({ ...f, lineItems: f.lineItems.map((item, idx) => idx === i ? { ...item, [k]: v } : item) }));
  const addItem = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, { description: '', qty: 1, rate: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) }));

  const total = form.lineItems.reduce((s, item) => s + (parseFloat(item.rate) || 0) * (parseInt(item.qty) || 0), 0);

  const selectDeal = (deal) => {
    setSelectedDeal(deal);
    setForm(f => ({ ...f, title: `Proposal for ${deal.lead?.company || deal.lead?.name}`, lineItems: [{ description: 'Consulting Services', qty: 1, rate: deal.value || '' }] }));
  };

  const exportPDF = async () => {
    if (!proposalRef.current) return;
    const canvas = await html2canvas(proposalRef.current, { backgroundColor: '#fff', scale: 2 });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`proposal-${selectedDeal?.lead?.name || 'client'}.pdf`);
    toast.success('PDF downloaded');
  };

  const copyText = () => {
    const text = `${form.title}\n\n${form.intro}\n\nDeliverables:\n${form.deliverables}\n\nLine Items:\n${form.lineItems.map(i => `${i.description}: ₹${i.rate} x ${i.qty}`).join('\n')}\n\nTotal: ${formatCurrency(total)}\n\nValidity: ${form.validity} days | Payment: ${form.paymentTerms}`;
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const saveProposal = async () => {
    if (!selectedDeal) { toast.error('Select a deal first'); return; }
    setSaving(true);
    const { error } = await supabase.from('proposals').insert({
      deal_id: selectedDeal.id, content: form, status: 'draft', created_by: user?.id,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Proposal saved');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Proposal Builder</h1><p className="page-subtitle">Generate and export proposals</p></div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button icon={copied ? Check : Copy} variant="secondary" onClick={copyText}>Copy</Button>
          <Button icon={Download} variant="secondary" onClick={exportPDF} disabled={!selectedDeal}>Export PDF</Button>
          <Button icon={FileText} variant="primary" loading={saving} onClick={saveProposal}>Save Draft</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--space-6)' }}>
        {/* Deal Selector */}
        <Card style={{ height: 'fit-content' }}>
          <CardHeader title="Select Deal" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {deals.map(d => (
              <button key={d.id} onClick={() => selectDeal(d)}
                style={{ background: selectedDeal?.id === d.id ? 'var(--primary-glow)' : 'var(--bg-surface-2)', border: `1px solid ${selectedDeal?.id === d.id ? 'var(--border-active)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 'var(--space-3)', cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition-fast)' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>{d.lead?.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatCurrency(d.value)}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Proposal Form + Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card>
            <CardHeader title="Proposal Details" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group"><label>Proposal Title</label><input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. Digital Transformation Proposal" /></div>
              <div className="form-group"><label>Introduction</label><textarea value={form.intro} onChange={e => setField('intro', e.target.value)} placeholder="Thank you for the opportunity…" rows={3} /></div>
              <div className="form-group"><label>Deliverables</label><textarea value={form.deliverables} onChange={e => setField('deliverables', e.target.value)} placeholder="• Item 1\n• Item 2" rows={4} /></div>
              <div className="form-row">
                <div className="form-group"><label>Validity (days)</label><input type="number" value={form.validity} onChange={e => setField('validity', e.target.value)} /></div>
                <div className="form-group"><label>Payment Terms</label>
                  <select value={form.paymentTerms} onChange={e => setField('paymentTerms', e.target.value)}>
                    <option>Net 30</option><option>Net 15</option><option>50% Advance</option><option>Full Upfront</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader title="Pricing" actions={<Button size="sm" icon={Plus} variant="secondary" onClick={addItem}>Add Line</Button>} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {form.lineItems.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 36px', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <input placeholder="Description" value={item.description} onChange={e => setItem(i, 'description', e.target.value)} />
                  <input type="number" placeholder="Qty" value={item.qty} onChange={e => setItem(i, 'qty', e.target.value)} />
                  <input type="number" placeholder="Rate (₹)" value={item.rate} onChange={e => setItem(i, 'rate', e.target.value)} />
                  <button onClick={() => removeItem(i)} className="btn-icon" style={{ color: 'var(--danger-light)' }}><Trash2 size={14} /></button>
                </div>
              ))}
              <div style={{ textAlign: 'right', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--success)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
                Total: {formatCurrency(total)}
              </div>
            </div>
          </Card>

          {/* Preview */}
          <Card ref={proposalRef} style={{ background: '#fff', color: '#111' }}>
            <div style={{ padding: 'var(--space-6)' }}>
              <h2 style={{ color: '#111', marginBottom: 'var(--space-4)' }}>{form.title || 'Proposal Title'}</h2>
              <p style={{ color: '#555', marginBottom: 'var(--space-4)', whiteSpace: 'pre-wrap' }}>{form.intro}</p>
              {form.deliverables && <div style={{ marginBottom: 'var(--space-4)' }}><strong style={{ color: '#111' }}>Deliverables</strong><p style={{ whiteSpace: 'pre-wrap', color: '#555' }}>{form.deliverables}</p></div>}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 'var(--space-4)' }}>
                <thead><tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#111' }}>Description</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#111' }}>Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#111' }}>Rate</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#111' }}>Amount</th>
                </tr></thead>
                <tbody>{form.lineItems.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 12px', color: '#333' }}>{item.description}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#333' }}>{item.qty}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#333' }}>{formatCurrency(item.rate)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#111' }}>{formatCurrency((parseFloat(item.rate)||0)*(parseInt(item.qty)||0))}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr><td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#111' }}>Total</td><td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: 18, color: '#6366f1' }}>{formatCurrency(total)}</td></tr></tfoot>
              </table>
              <p style={{ color: '#555', fontSize: 13 }}>Valid for {form.validity} days · Payment: {form.paymentTerms}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
