/**
 * Lists all alerts and deletes all except any we want to keep.
 * Uses correct alert_id field name.
 */
import { evaluateAsync } from '../src/connection.js';

const DEL_URL = 'https://pricealerts.tradingview.com/delete_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43';
const wait = ms => new Promise(r => setTimeout(r, ms));

const list = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
`);

console.log('Current alert count:', list.r?.length);

// Delete all alerts that have web_hook null and no name (test alerts)
// Keep the "AlgoAlpha - Smart Money Breakout" one (has a name)
const toDelete = (list.r || []).filter(a => a.name === 'null' || a.name === null);
console.log('Alerts to delete (name=null):', toDelete.length);
toDelete.forEach(a => console.log(`  alert_id=${a.alert_id} type=${a.conditions?.[0]?.type || a.condition?.type}`));

for (const alert of toDelete) {
  const r = await evaluateAsync(`
    fetch(${JSON.stringify(DEL_URL)}, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ payload: { alert_id: ${alert.alert_id} } }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
  `);
  console.log(`  Deleted ${alert.alert_id}: ${r?.s} ${r?.code || r?.err?.code || ''}`);
  await wait(300);
}

const remaining = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
`);
console.log('\nRemaining alerts:', remaining.r?.length);
remaining.r?.forEach(a => console.log(`  ${a.alert_id} "${a.name}" type=${a.conditions?.[0]?.type || a.condition?.type}`));

process.exit(0);
