import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { LeadSheetProvider, useLeadSheet } from '@/hooks/useLeadSheet';
import { LeadSheet } from '@/components/leads/LeadSheet';

// Base
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

function AppRoutes() {
  const { leadId, closeLead } = useLeadSheet();

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/admin" replace />} />

          {/* L1 */}
          <Route path="l1"            element={<L1Dashboard />} />
          <Route path="l1/leads"      element={<L1Leads />} />
          <Route path="l1/leads/:id"  element={<L1LeadDetail />} />
          <Route path="l1/copilot"    element={<L1Copilot />} />

          {/* L2 */}
          <Route path="l2"            element={<L2Dashboard />} />
          <Route path="l2/leads"      element={<L2Leads />} />
          <Route path="l2/pipeline"   element={<L2Pipeline />} />
          <Route path="l2/leads/:id"  element={<L2LeadDetail />} />
          <Route path="l2/escalate/:id" element={<L2Escalate />} />
          <Route path="l2/proposal"   element={<L2Proposal />} />

          {/* L3 */}
          <Route path="l3"            element={<L3Dashboard />} />
          <Route path="l3/deals"      element={<L3Deals />} />
          <Route path="l3/forecast"   element={<L3Forecast />} />
          <Route path="l3/approvals"  element={<L3Approvals />} />

          {/* Admin */}
          <Route path="admin"              element={<AdminDashboard />} />
          <Route path="admin/users"        element={<UserManagement />} />
          <Route path="admin/api-keys"     element={<ApiKeys />} />
          <Route path="admin/webhooks"     element={<Webhooks />} />
          <Route path="admin/integrations" element={<Integrations />} />
          <Route path="admin/audit-logs"   element={<AuditLogs />} />
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
