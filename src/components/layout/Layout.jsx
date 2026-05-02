import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const PAGE_TITLES = {
  '/l1': 'L1 Dashboard',
  '/l1/leads': 'My Leads',
  '/l1/copilot': 'AI Copilot',
  '/l2': 'L2 Dashboard',
  '/l2/pipeline': 'Pipeline',
  '/l2/proposal': 'Proposals',
  '/l3': 'L3 Dashboard',
  '/l3/deals': 'Deals',
  '/l3/forecast': 'Revenue Forecast',
  '/l3/approvals': 'Approvals',
  '/admin': 'Admin Overview',
  '/admin/api-keys': 'API Keys',
  '/admin/webhooks': 'Webhooks',
  '/admin/integrations': 'Integrations',
  '/admin/audit-logs':   'Audit Logs',
};

export function Layout() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'FlowCRM';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar title={title} />
        <main style={{ flex: 1, padding: 'var(--space-6)', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
