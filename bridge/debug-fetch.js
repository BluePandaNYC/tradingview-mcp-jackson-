import { evaluateAsync, getClient } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Test 1: Can we list_alerts? (was working before)
console.log('Test 1: list_alerts...');
const list = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => ({ status: r.status }))
    .catch(e => ({ error: e.message }))
`);
console.log('list_alerts:', list);

// Test 2: What headers does TradingView use?
// Check for CSRF token in the page
const csrfInfo = await evaluateAsync(`
  (function(){
    // Check cookies for CSRF token
    var cookies = document.cookie.split(';').map(c => c.trim()).filter(c => /csrf|xsrf|token/i.test(c));
    // Check meta tags
    var metaCsrf = Array.from(document.querySelectorAll('meta')).filter(m => /csrf|xsrf/i.test(m.name || '') || /csrf|xsrf/i.test(m.getAttribute('name') || ''));
    // Check window variables
    var winVars = Object.keys(window).filter(k => /csrf|xsrf/i.test(k));
    return { cookies, metaCsrf: metaCsrf.map(m => m.name + '=' + m.content), winVars };
  })()
`);
console.log('\nCSRF info:', csrfInfo);

// Test 3: Try create with minimal payload
console.log('\nTest 3: create_alert with minimal payload...');
const minResult = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/create_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }).then(r => r.json())
  .catch(e => ({ error: e.message, type: e.constructor.name }))
`);
console.log('Minimal create result:', minResult);

// Test 4: check if window.fetch exists and what URL the page is on
const pageInfo = await evaluateAsync(`
  ({ url: window.location.href, hasFetch: typeof fetch !== 'undefined', fetchType: typeof fetch })
`);
console.log('\nPage info:', pageInfo);

// Test 5: Try to intercept network to see what headers TV sends
await client.Network.enable();
const captured = {};
client.Network.requestWillBeSent((p) => {
  if (p.request.url.includes('pricealerts')) {
    captured[p.requestId] = { url: p.request.url, headers: p.request.headers, method: p.request.method };
  }
});

// Make the same request TV would make - simulating a successful call
const tvStyle = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }).then(r => ({ status: r.status }))
  .catch(e => ({ error: e.message }))
`);
console.log('\nPOST to list_alerts:', tvStyle);
await wait(1000);

console.log('Captured headers for pricealerts requests:');
for (const [id, req] of Object.entries(captured)) {
  console.log(`  ${req.method} ${req.url}`);
  Object.entries(req.headers).forEach(([k,v]) => console.log(`    ${k}: ${v}`));
}

await client.Network.disable();
process.exit(0);
