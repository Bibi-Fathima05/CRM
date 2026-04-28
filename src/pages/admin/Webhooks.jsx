import React from 'react';
import { Card } from '@/components/ui/Card';

export function Webhooks() {
  return (
    <div className="flex-col gap-6" style={{ display: 'flex' }}>
      <h2>Webhooks</h2>
      <Card>
        <div style={{ padding: '20px' }}>
          <p>Configure external webhooks.</p>
        </div>
      </Card>
    </div>
  );
}
