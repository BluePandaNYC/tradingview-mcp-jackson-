import { getClient, evaluateAsync } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Close the user menu
await client.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Escape', code: 'Escape', keyCode: 27 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', code: 'Escape' });
await wait(500);

// Navigate back to the ES1! chart
await client.Page.navigate({ url: 'https://www.tradingview.com/chart/axSGORQD/' });
await wait(3000);

// Verify auth
const auth = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
    .then(d => ({ s: d.s, count: d.r ? d.r.length : null, err: d.err }))
    .catch(e => ({ s: 'err', msg: e.message }))
`);
console.log('Auth:', auth?.s, 'alerts:', auth?.count, auth?.err?.code || '');

process.exit(0);
