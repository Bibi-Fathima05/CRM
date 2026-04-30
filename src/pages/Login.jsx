import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import '@/styles/global.css';
import '@/styles/animations.css';
import '@/styles/components.css';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
});

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setError('');
    try {
      await signIn(data);
      // Navigate to root — RoleRedirect in App.jsx will send the user
      // to the correct dashboard once the profile finishes loading.
      navigate('/');
    } catch (e) {
      setError(e.message || 'Invalid credentials');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-6)',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.06) 0%, transparent 50%)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="animate-fade-in-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
            <Zap size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', marginBottom: 6 }}>Welcome to FlowCRM</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>AI-driven sales, structured workflow</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 'var(--space-8)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-6)' }}>Sign in</h2>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Mail size={14} className="input-icon" />
                <input id="email" type="email" placeholder="you@company.com" {...register('email')} style={{ paddingLeft: 36 }} />
              </div>
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={14} className="input-icon" />
                <input id="password" type={showPass ? 'text' : 'password'} placeholder="••••••••" {...register('password')} style={{ paddingLeft: 36, paddingRight: 36 }} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            <Button type="submit" variant="primary" size="lg" loading={isSubmitting} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
              Sign In <ArrowRight size={15} />
            </Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          FlowCRM © 2025 — Production CRM Platform
        </p>
      </div>
    </div>
  );
}
