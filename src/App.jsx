import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/Spinner';
import { LeadSheetProvider, useLeadSheet } from '@/hooks/useLeadSheet';
import { LeadSheet } from '@/components/leads/LeadSheet';

// Base Pages
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

// L1 Pages
import L1Dashboard from '@/pages/l1/L1Dashboard';
import L1Leads from '@/pages/l1/L1Leads';
import L1LeadDetail from '@/pages/l1/L1LeadDetail';
import L1Copilot from '@/pages/l1/L1Copilot';

// L2 Pages
import L2Dashboard from '@/pages/l2/L2Dashboard';
import L2Leads from '@/pages/l2/L2Leads';
import L2Pipeline from '@/pages/l2/L2Pipeline';
import L2LeadDetail from '@/pages/l2/L2LeadDetail';
import L2Escalate from '@/pages/l2/L2Escalate';
import L2Proposal from '@/pages/l2/L2Proposal';

// L3 Pages
import L3Dashboard from '@/pages/l3/L3Dashboard';
import L3Deals from '@/pages/l3/L3Deals';
import L3Forecast from '@/pages/l3/L3Forecast';
import L3Approvals from '@/pages/l3/L3Approvals';

// Admin Pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { ApiKeys } from '@/pages/admin/ApiKeys';
import { Webhooks } from '@/pages/admin/Webhooks';
import { Integrations } from '@/pages/admin/Integrations';
import { UserManagement } from '@/pages/admin/UserManagement';
import AuditLogs from '@/pages/admin/AuditLogs';
import { PromptConfigs } from '@/pages/admin/PromptConfigs';

// Redirects to the correct dashboard based on role
function RoleRedirect() {
  const { role, loading, user } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  const ROLE_HOME = { l1: '/l1', l2: '/l2', l3: '/l3', admin: '/admin' };
  // If role not yet known, show loader briefly
  if (!role) return <PageLoader />;
  return <Navigate to={ROLE_HOME[role] ?? '/login'} replace />;
}

function AppRoutes() {
  const { leadId, closeLead } = useLeadSheet();

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<RoleRedirect />} />

          {/* L1 */}
          <Route path="l1"            element={<ProtectedRoute roles={['l1','admin']}><L1Dashboard /></ProtectedRoute>} />
          <Route path="l1/leads"      element={<ProtectedRoute roles={['l1','admin']}><L1Leads /></ProtectedRoute>} />
          <Route path="l1/leads/:id"  element={<ProtectedRoute roles={['l1','admin']}><L1LeadDetail /></ProtectedRoute>} />
          <Route path="l1/copilot"    element={<ProtectedRoute roles={['l1','admin']}><L1Copilot /></ProtectedRoute>} />

          {/* L2 */}
          <Route path="l2"            element={<ProtectedRoute roles={['l2','admin']}><L2Dashboard /></ProtectedRoute>} />
          <Route path="l2/leads"      element={<ProtectedRoute roles={['l2','admin']}><L2Leads /></ProtectedRoute>} />
          <Route path="l2/pipeline"   element={<ProtectedRoute roles={['l2','admin']}><L2Pipeline /></ProtectedRoute>} />
          <Route path="l2/leads/:id"  element={<ProtectedRoute roles={['l2','admin']}><L2LeadDetail /></ProtectedRoute>} />
          <Route path="l2/escalate/:id" element={<ProtectedRoute roles={['l2','admin']}><L2Escalate /></ProtectedRoute>} />
          <Route path="l2/proposal"   element={<ProtectedRoute roles={['l2','admin']}><L2Proposal /></ProtectedRoute>} />

          {/* L3 */}
          <Route path="l3"            element={<ProtectedRoute roles={['l3','admin']}><L3Dashboard /></ProtectedRoute>} />
          <Route path="l3/deals"      element={<ProtectedRoute roles={['l3','admin']}><L3Deals /></ProtectedRoute>} />
          <Route path="l3/forecast"   element={<ProtectedRoute roles={['l3','admin']}><L3Forecast /></ProtectedRoute>} />
          <Route path="l3/approvals"  element={<ProtectedRoute roles={['l3','admin']}><L3Approvals /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="admin"              element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="admin/users"        element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="admin/api-keys"     element={<ProtectedRoute roles={['admin']}><ApiKeys /></ProtectedRoute>} />
          <Route path="admin/webhooks"     element={<ProtectedRoute roles={['admin']}><Webhooks /></ProtectedRoute>} />
          <Route path="admin/integrations" element={<ProtectedRoute roles={['admin']}><Integrations /></ProtectedRoute>} />
          <Route path="admin/audit-logs"     element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />
          <Route path="admin/prompt-configs" element={<ProtectedRoute roles={['admin']}><PromptConfigs /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      <LeadSheet leadId={leadId} onClose={closeLead} />
    </>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LeadSheetProvider>
        <AppRoutes />
      </LeadSheetProvider>
    </Router>
  );
}
