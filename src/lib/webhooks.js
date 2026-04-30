import { supabase } from './supabase';

/**
 * fireWebhooks — called after CRM mutations to deliver events to external endpoints.
 * Reads active webhooks from Supabase, fires HTTP POSTs for matching events.
 *
 * @param {string} event  - e.g. 'lead.created', 'deal.closed_won'
 * @param {object} payload - the event data to send
 */
export async function fireWebhooks(event, payload) {
  try {
    const { data: hooks, error } = await supabase
      .from('webhooks')
      .select('id, url, name')
      .eq('active', true)
      .contains('events', [event]);

    if (error || !hooks?.length) return;

    const promises = hooks.map(async (hook) => {
      try {
        await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-FlowCRM-Event': event,
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload,
          }),
        });
        // Update last_triggered timestamp
        await supabase
          .from('webhooks')
          .update({ last_triggered: new Date().toISOString() })
          .eq('id', hook.id);
      } catch (e) {
        console.warn(`[FlowCRM] Webhook "${hook.name}" failed:`, e.message);
      }
    });

    await Promise.allSettled(promises);
  } catch (e) {
    console.warn('[FlowCRM] fireWebhooks error:', e);
  }
}
