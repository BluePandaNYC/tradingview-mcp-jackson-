import { evaluateAsync } from '../src/connection.js';

// Check if logged in via TradingView's own API
const user = await evaluateAsync(`
  fetch('https://www.tradingview.com/api/v1/user/', { credentials: 'include' })
    .then(r => r.json()).catch(e => ({ error: e.message }))
`);
console.log('User:', JSON.stringify(user).substring(0, 200));

// Also try the username endpoint
const me = await evaluateAsync(`
  fetch('https://www.tradingview.com/pine_pubs/list/', { credentials: 'include' })
    .then(r => r.status).catch(e => e.message)
`);
console.log('pine_pubs status:', me);

// Check pricealerts with a GET first
const listGet = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', {
    method: 'GET',
    credentials: 'include',
  }).then(r => ({ status: r.status, ok: r.ok })).catch(e => ({ error: e.message }))
`);
console.log('list_alerts GET:', listGet);

process.exit(0);
