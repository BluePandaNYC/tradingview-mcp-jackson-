import { evaluateAsync } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));

console.log('Waiting for you to enter your password and sign in...');

for (let i = 0; i < 40; i++) {
  await wait(3000);
  const r = await evaluateAsync(`
    fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
      .then(res => res.json()).then(d => ({ s: d.s, count: d.r ? d.r.length : null }))
      .catch(e => ({ s: 'err', msg: e.message }))
  `);
  console.log(`[${i+1}] status=${r?.s} count=${r?.count}`);
  if (r?.s === 'ok') {
    console.log('\nSUCCESS — logged in! Alerts count:', r.count);
    process.exit(0);
  }
}
console.log('Timed out');
process.exit(1);
