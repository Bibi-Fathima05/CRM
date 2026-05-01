import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient.js';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Toaster } from 'sonner';
import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/animations.css';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// ── Error boundary — shows readable crash message instead of blank page ──
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[FlowCRM] App crashed:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: 16,
          background: '#0f0f13', color: '#e2e8f0', fontFamily: 'Inter, sans-serif',
          padding: 32, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f87171' }}>
            Something went wrong
          </h2>
          <pre style={{
            background: '#1e1e2e', padding: '16px 24px', borderRadius: 8,
            fontSize: 13, color: '#f87171', maxWidth: 600,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left',
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: '#6366f1', color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConvexProvider client={convex}>
            <App />
          </ConvexProvider>
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: {
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
