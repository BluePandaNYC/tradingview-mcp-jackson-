import { evaluateAsync } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const list = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
`);
const testId = list.r?.[0]?.alert_id;
console.log('Test alert_id:', testId);

const BASE = 'https://pricealerts.tradingview.com/delete_alerts';

const formats = [
  { label: '{ alert_ids: [id] }',        body: JSON.stringify({ alert_ids: [testId] }) },
  { label: '{ ids: [id] }',              body: JSON.stringify({ ids: [testId] }) },
  { label: '{ payload: { ids: [id] } }', body: JSON.stringify({ payload: { ids: [testId] } }) },
  { label: '{ payload: { alert_ids: [id] } }', body: JSON.stringify({ payload: { alert_ids: [testId] } }) },
  { label: '[id]',                        body: JSON.stringify([testId]) },
  { label: '{ id: id }',                  body: JSON.stringify({ id: testId }) },
];

for (const f of formats) {
  const r = await evaluateAsync(`
    fetch(${JSON.stringify(BASE)}, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: ${JSON.stringify(f.body)},
    }).then(r => r.json()).catch(e => ({ error: e.message }))
  `);
  const code = r?.code || r?.err?.code || r?.error || '';
  console.log(`${f.label}: ${r?.s} ${code}`);
  if (r?.s === 'ok') {
    console.log('  *** SUCCESS ***');
    break;
  }
  await wait(300);
}

// Also try with query param
const withParam = `${BASE}?alert_id=${testId}`;
const rq = await evaluateAsync(`
  fetch(${JSON.stringify(withParam)}, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: '{}',
  }).then(r => r.json()).catch(e => ({ error: e.message }))
`);
console.log(`delete_alerts?alert_id=: ${rq?.s} ${rq?.code || rq?.err?.code || ''}`);

process.exit(0);
