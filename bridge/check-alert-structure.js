import { evaluateAsync } from '../src/connection.js';

const list = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
`);

// Print keys of first alert
const first = list.r?.[0];
if (first) {
  console.log('First alert keys:', Object.keys(first));
  console.log('First alert:', JSON.stringify(first, null, 2).substring(0, 800));
}
process.exit(0);
