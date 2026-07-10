/**
 * Creates one test alert via UI to capture the current create_alert URL + headers.
 * The build_time parameter changes with TradingView deployments.
 */
import { evaluate, evaluateAsync, getClient } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Enable network monitoring
await client.Network.enable();
const captured = {};
const responses = {};

client.Network.requestWillBeSent((p) => {
  if (p.request.url.includes('create_alert')) {
    captured[p.requestId] = { url: p.request.url, headers: p.request.headers, body: p.request.postData || '' };
  }
});
client.Network.responseReceived((p) => {
  if (p.response.url.includes('create_alert')) {
    responses[p.requestId] = p.requestId;
  }
});

// Also check list_alerts to verify auth
console.log('Checking auth...');
const listResult = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
    .catch(e => ({ error: e.message }))
`);
console.log('list_alerts status:', listResult?.s, '— alert count:', listResult?.r?.length);

// Close dialog if any
await client.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Escape', keyCode: 27, code: 'Escape' });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', code: 'Escape' });
await wait(600);

// Open alert dialog
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 600, y: 350, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 600, y: 350, button: 'left', clickCount: 1 });
await wait(300);
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 1, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
await wait(2000);

// Click Create directly (creates a price alert, just to capture the URL)
const createBtn = JSON.parse(await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return 'null';
    var btns = Array.from(d.querySelectorAll('button'));
    var c = btns.find(function(b){ return /^create$/i.test(b.textContent.trim()); });
    if (!c) return 'null';
    var r = c.getBoundingClientRect();
    return JSON.stringify({x: r.x+r.width/2, y: r.y+r.height/2});
  })()
`));

if (!createBtn) {
  console.log('ERROR: Could not find Create button');
  process.exit(1);
}

await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(createBtn.x), y: Math.round(createBtn.y), button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(createBtn.x), y: Math.round(createBtn.y), button: 'left', clickCount: 1 });
await wait(3000);

let createdId = null;
for (const [id, req] of Object.entries(captured)) {
  if (req.body && req.url.includes('create_alert')) {
    console.log('\n=== CURRENT create_alert URL ===');
    console.log(req.url);
    console.log('\n=== RELEVANT HEADERS ===');
    for (const [k, v] of Object.entries(req.headers)) {
      console.log(`${k}: ${v}`);
    }
    try {
      const parsed = JSON.parse(req.body);
      console.log('\n=== PAYLOAD STRUCTURE ===');
      console.log('conditions type:', parsed.payload?.conditions?.[0]?.type);
      console.log('symbol:', parsed.payload?.symbol?.substring(0, 60));
      console.log('resolution:', parsed.payload?.resolution);
    } catch(e) {}
  }
}

for (const [id, respId] of Object.entries(responses)) {
  try {
    const b = await client.Network.getResponseBody({ requestId: respId });
    const r = JSON.parse(b.body);
    console.log('\n=== RESPONSE ===');
    console.log('status:', r.s, 'alert_id:', r.r?.alert_id);
    if (r.r?.alert_id) createdId = r.r.alert_id;
  } catch(e) {}
}

// Delete the just-created test alert
if (createdId) {
  const deleteUrl = Object.values(captured)[0]?.url.replace('create_alert', 'delete_alert');
  console.log(`\nDeleting test alert ${createdId}...`);
  const del = await evaluateAsync(`
    fetch(${JSON.stringify(deleteUrl || 'https://pricealerts.tradingview.com/delete_alert')}, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ payload: { alert_id: ${createdId} } }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
  `);
  console.log('Delete:', del?.s);
}

await client.Network.disable();
process.exit(0);
