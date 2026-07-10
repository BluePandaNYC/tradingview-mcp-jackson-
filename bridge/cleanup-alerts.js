/**
 * Delete all test alerts (name=null). Keep only the AlgoAlpha one.
 * Correct endpoint: DELETE_ALERTS with { payload: { alert_ids: [...] } }
 */
import { evaluateAsync } from '../src/connection.js';

const DEL_URL = 'https://pricealerts.tradingview.com/delete_alerts';

const list = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
`);

const testAlerts = (list.r || []).filter(a => a.name === 'null' || a.name === null);
const ids = testAlerts.map(a => a.alert_id);
console.log(`Deleting ${ids.length} test alerts: ${ids.join(', ')}`);

if (ids.length === 0) {
  console.log('Nothing to delete.');
  process.exit(0);
}

const result = await evaluateAsync(`
  fetch(${JSON.stringify(DEL_URL)}, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ payload: { alert_ids: ${JSON.stringify(ids)} } }),
  }).then(r => r.json()).catch(e => ({ error: e.message }))
`);
console.log('Delete result:', result?.s, result?.code || result?.err?.code || '');

const remaining = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
`);
console.log('\nRemaining alerts:', remaining.r?.length);
remaining.r?.forEach(a => console.log(`  ${a.alert_id} "${a.name}"`));

process.exit(0);
