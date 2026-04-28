import React from 'react';
import { Card } from '@/components/ui/Card';

export function AdminDashboard() {
  return (
    <div className="flex-col gap-6" style={{ display: 'flex' }}>
      <h2>Admin Overview</h2>
      <Card>
        <div style={{ padding: '20px' }}>
          <p>System configuration and overview.</p>
        </div>
      </Card>
    </div>
  );
}
