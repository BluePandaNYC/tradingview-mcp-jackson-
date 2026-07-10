import { evaluate, evaluateAsync, getClient } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Close any open dialog first
await client.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Escape', keyCode: 27, code: 'Escape' });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', code: 'Escape' });
await wait(500);

// 1. List existing alerts to understand structure
console.log('=== Listing existing alerts ===');
const alerts = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
`);
console.log(JSON.stringify(alerts, null, 2));

// 2. Try to find the create_alert endpoint
console.log('\n=== Trying create_alert endpoint ===');
const createTest = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/create_alert', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  }).then(r => ({ status: r.status, statusText: r.statusText }))
  .catch(e => ({ error: e.message }))
`);
console.log('create_alert response:', createTest);

// 3. Try alternative API paths
const paths = ['/modify_alert', '/delete_alert', '/alerts', '/api/v1/alerts'];
for (const path of paths) {
  const base = path.startsWith('/api') ? 'https://www.tradingview.com' : 'https://pricealerts.tradingview.com';
  const r = await evaluateAsync(`
    fetch('${base}${path}', { credentials: 'include' })
      .then(r => ({ status: r.status, path: '${path}' }))
      .catch(e => ({ error: e.message, path: '${path}' }))
  `);
  console.log(r);
}

// 4. Get chart state to find study IDs (needed for indicator alerts)
console.log('\n=== Getting chart state for study IDs ===');
const chartState = await evaluateAsync(`
  (function(){
    // Try to get the chart widget
    var tw = window.TradingView || window.tvWidget;
    if (!tw) return {err: 'no tv widget'};
    return 'found TradingView widget';
  })()
`);
console.log('Chart state:', chartState);

process.exit(0);
