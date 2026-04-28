import React from 'react';
import { Card } from '@/components/ui/Card';

export function Integrations() {
  return (
    <div className="flex-col gap-6" style={{ display: 'flex' }}>
      <h2>Integrations</h2>
      <Card>
        <div style={{ padding: '20px' }}>
          <p>Manage third-party integrations.</p>
        </div>
      </Card>
    </div>
  );
}
