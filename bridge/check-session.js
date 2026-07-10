import { evaluate, evaluateAsync } from '../src/connection.js';

// Check current page URL and login state
const info = await evaluateAsync(`({
  url: window.location.href,
  loggedIn: !!document.cookie.match(/sessionid|_tv_uid/),
  cookies: document.cookie.split(';').map(c => c.trim().split('=')[0]).join(', '),
  title: document.title.substring(0, 60),
})`);
console.log('Page:', info.url);
console.log('Title:', info.title);
console.log('Cookie names:', info.cookies);
console.log('Has session cookie:', info.loggedIn);

// Try list_alerts
const r = await evaluateAsync(`fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' }).then(r => r.json()).catch(e => ({ error: e.message }))`);
console.log('\nlist_alerts:', r?.s, r?.err?.code || r?.r?.length || r?.error);

process.exit(0);
