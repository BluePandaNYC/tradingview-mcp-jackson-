import { evaluateAsync } from '../src/connection.js';
const r = await evaluateAsync(`fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' }).then(r => r.json()).catch(e => ({ error: e.message }))`);
console.log('auth status:', r?.s, 'alerts:', r?.r?.length ?? r?.error ?? JSON.stringify(r));
process.exit(0);
