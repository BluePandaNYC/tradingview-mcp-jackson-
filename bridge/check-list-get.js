import { evaluateAsync } from '../src/connection.js';

// list_alerts with GET
const r = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', {
    method: 'GET',
    credentials: 'include',
  }).then(r => r.json()).catch(e => ({ error: e.message }))
`);
console.log('list_alerts GET result:', r?.s, 'count:', r?.r?.length, 'err:', r?.err?.code || r?.error || '');

// Also try create_alert with GET to see if CORS is the issue now
// Maybe the page origin changed after re-login
const pageUrl = await evaluateAsync(`window.location.origin`);
console.log('\nPage origin:', pageUrl);

// Try with explicit origin header
const r2 = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Origin': 'https://www.tradingview.com' },
  }).then(r => r.json()).catch(e => ({ error: e.message }))
`);
console.log('list_alerts GET with Origin header:', r2?.s, r2?.r?.length, r2?.err?.code || r2?.error);

process.exit(0);
