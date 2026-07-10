/**
 * Debug delete_alert — find the correct payload format.
 * Also lists current alerts so we know what to delete.
 */
import { evaluateAsync } from '../src/connection.js';

const DEL_URL = 'https://pricealerts.tradingview.com/delete_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43';

// First list alerts to see format
const list = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
    .catch(e => ({ error: e.message }))
`);

console.log('Current alerts:', list.r?.length);
if (list.r?.length > 0) {
  list.r.forEach(a => console.log(`  id=${a.id} type=${a.conditions?.[0]?.type} name="${a.name}"`));
}

const wait = ms => new Promise(r => setTimeout(r, ms));

// Try different delete formats on the first alert
const testId = list.r?.[0]?.id;
if (!testId) { console.log('No alerts to test delete on'); process.exit(0); }

console.log(`\nTrying to delete alert ${testId}...`);

// Format 1: { payload: { alert_id: id } }
const r1 = await evaluateAsync(`
  fetch(${JSON.stringify(DEL_URL)}, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ payload: { alert_id: ${testId} } }),
  }).then(r => r.json()).catch(e => ({ error: e.message }))
`);
console.log('Format 1 { payload: { alert_id } }:', r1?.s, r1?.code || r1?.err?.code || '');
await wait(400);

// Format 2: { alert_id: id }
const r2 = await evaluateAsync(`
  fetch(${JSON.stringify(DEL_URL)}, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ alert_id: ${testId} }),
  }).then(r => r.json()).catch(e => ({ error: e.message }))
`);
console.log('Format 2 { alert_id }:', r2?.s, r2?.code || r2?.err?.code || '');
await wait(400);

// Format 3: { payload: { id: id } }
const r3 = await evaluateAsync(`
  fetch(${JSON.stringify(DEL_URL)}, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ payload: { id: ${testId} } }),
  }).then(r => r.json()).catch(e => ({ error: e.message }))
`);
console.log('Format 3 { payload: { id } }:', r3?.s, r3?.code || r3?.err?.code || '');
await wait(400);

// Format 4: just the id as string
const r4 = await evaluateAsync(`
  fetch(${JSON.stringify(DEL_URL)}, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(${testId}),
  }).then(r => r.json()).catch(e => ({ error: e.message }))
`);
console.log('Format 4 (bare number):', r4?.s, r4?.code || r4?.err?.code || '');

process.exit(0);
