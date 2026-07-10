import { getClient, evaluateAsync } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Navigate back to the chart
await client.Page.navigate({ url: 'https://www.tradingview.com/chart/axSGORQD/' });
await wait(4000);

// Check auth now
const r = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(res => res.json())
    .then(d => ({ s: d.s, count: d.r ? d.r.length : null, err: d.err }))
    .catch(e => ({ s: 'err', msg: e.message }))
`);
console.log('Auth:', r?.s, 'alerts:', r?.count, r?.err?.code || '');
process.exit(0);
