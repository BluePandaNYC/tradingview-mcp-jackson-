/**
 * Try different delete_alert URL formats.
 */
import { evaluateAsync } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));

// First, get a real alert_id from list
const list = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
`);

const testId = list.r?.[0]?.alert_id;
console.log('Test alert_id:', testId);

const urls = [
  'https://pricealerts.tradingview.com/delete_alert',
  `https://pricealerts.tradingview.com/delete_alert?alert_id=${testId}`,
  'https://pricealerts.tradingview.com/delete_alerts',
  `https://pricealerts.tradingview.com/delete_alerts?alert_id=${testId}`,
  'https://pricealerts.tradingview.com/modify_alert',
];

for (const url of urls) {
  const r = await evaluateAsync(`
    fetch(${JSON.stringify(url)}, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ payload: { alert_id: ${testId} } }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
  `);
  const code = r?.code || r?.err?.code || r?.error || (r?.s === 'ok' ? 'SUCCESS' : '?');
  console.log(`${url.split('.com/')[1]}: ${r?.s} ${code}`);
  if (r?.s === 'ok') {
    console.log('  *** SUCCESS - this is the correct URL ***');
    break;
  }
  await wait(300);
}

process.exit(0);
