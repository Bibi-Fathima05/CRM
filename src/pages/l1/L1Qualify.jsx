import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, DollarSign, FileText, Clock, ArrowRight } from 'lucide-react';
import { useTransitionLead } from '@/hooks/useLeads';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  budget: z.string().min(1, 'Budget is required'),
  requirement: z.string().min(5, 'Describe the requirement (min 5 chars)'),
  timeline: z.string().min(1, 'Timeline is required'),
  interest: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high']),
});

export default function L1Qualify({ open, onClose, lead }) {
  const { user } = useAuth();
  const transitionLead = useTransitionLead();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { urgency: 'medium', ...lead?.enriched_data },
  });

  const allValues = watch();
  const filledCount = ['budget', 'requirement', 'timeline'].filter(f => allValues[f]?.trim()).length;
  const pct = Math.round((filledCount / 3) * 100);

  const onSubmit = async (data) => {
    // Save enriched data
    const { error } = await supabase.from('leads').update({
      enriched_data: { ...lead?.enriched_data, ...data },
    }).eq('id', lead.id);
    if (error) { toast.error(error.message); return; }

    // Transition to L2
    await transitionLead.mutateAsync({ ...lead, enriched_data: { ...lead?.enriched_data, ...data } });
    reset();
    onClose();
    navigate('/l1/leads');
  };

  const steps = [
    { key: 'budget', label: 'Budget', icon: DollarSign, placeholder: 'e.g. ₹5–10 Lakhs', type: 'text' },
    { key: 'requirement', label: 'Requirement', icon: FileText, placeholder: 'Describe what they need…', type: 'textarea' },
    { key: 'timeline', label: 'Timeline', icon: Clock, placeholder: 'e.g. 3 months', type: 'text' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Qualify Lead" size="md"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={ArrowRight} loading={isSubmitting || transitionLead.isPending} onClick={handleSubmit(onSubmit)} disabled={filledCount < 3}>
          Qualify & Send to L2
        </Button>
      </>}>
      {/* Progress */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <span>Qualification Progress</span>
          <span style={{ color: pct === 100 ? 'var(--success)' : 'var(--text-secondary)' }}>{filledCount}/3 fields</span>
        </div>
        <div className="progress-bar">
          <div className={`progress-fill ${pct === 100 ? 'progress-success' : 'progress-primary'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {steps.map(({ key, label, icon: Icon, placeholder, type }) => (
          <div key={key} className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Icon size={13} /> {label} *
              {watch(key)?.trim() && <CheckCircle size={13} style={{ color: 'var(--success)', marginLeft: 'auto' }} />}
            </label>
            {type === 'textarea'
              ? <textarea placeholder={placeholder} rows={2} {...register(key)} />
              : <input placeholder={placeholder} {...register(key)} />}
            {errors[key] && <span className="form-error">{errors[key].message}</span>}
          </div>
        ))}

        <div className="form-row">
          <div className="form-group">
            <label>Interest Level</label>
            <input placeholder="e.g. Very interested in demo" {...register('interest')} />
          </div>
          <div className="form-group">
            <label>Urgency</label>
            <select {...register('urgency')}>
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>
        </div>
      </div>

      {filledCount === 3 && (
        <div className="alert alert-success" style={{ marginTop: 'var(--space-4)' }}>
          <CheckCircle size={16} />
          All fields complete — ready to qualify and route to L2
        </div>
      )}
    </Modal>
  );
}
