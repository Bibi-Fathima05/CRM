import React from 'react';
import { Card } from '@/components/ui/Card';

export function ApiKeys() {
  return (
    <div className="flex-col gap-6" style={{ display: 'flex' }}>
      <h2>API Keys</h2>
      <Card>
        <div style={{ padding: '20px' }}>
          <p>Manage your API keys here.</p>
        </div>
      </Card>
    </div>
  );
}
