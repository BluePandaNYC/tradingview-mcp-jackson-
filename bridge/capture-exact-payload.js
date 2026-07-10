/**
 * Creates a MAI Pro alert via UI and captures the EXACT payload sent.
 * Compares it with what our code sends.
 */
import { evaluate, evaluateAsync, getClient } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

await client.Network.enable();
const captured = {};
const responses = {};

client.Network.requestWillBeSent((p) => {
  if (p.request.url.includes('create_alert')) {
    captured[p.requestId] = { url: p.request.url, body: p.request.postData || '' };
  }
});
client.Network.responseReceived((p) => {
  if (p.response.url.includes('create_alert')) {
    responses[p.requestId] = p.requestId;
  }
});

// Close any dialog
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

// Get the condition dropdown
const condRect = JSON.parse(await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return 'null';
    var els = Array.from(d.querySelectorAll('[class*="select-UkzauqCm"]'));
    // Find the one that says the current condition (first select)
    if (!els.length) return 'null';
    var el = els[0];
    var r = el.getBoundingClientRect();
    return JSON.stringify({cx: r.x+r.width/2, cy: r.y+r.height/2});
  })()
`));

console.log('Condition dropdown rect:', condRect);

await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(condRect.cx), y: Math.round(condRect.cy), button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(condRect.cx), y: Math.round(condRect.cy), button: 'left', clickCount: 1 });
await wait(1200);

// Type MAI to filter
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 2, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
await wait(100);
await client.Input.insertText({ text: 'MAI' });
await wait(1000);

// List dropdown items to find MAI Pro
const items = JSON.parse(await evaluate(`
  (function(){
    var candidates = Array.from(document.querySelectorAll('[class*="menuItem"], [class*="item-"][class*="BOZdoKo"], [role="option"]'));
    var vis = candidates.filter(function(e){ var r=e.getBoundingClientRect(); return r.width>0&&r.height>0; });
    return JSON.stringify(vis.map(function(e){
      var r = e.getBoundingClientRect();
      return {text: e.textContent.trim().substring(0,40), x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2)};
    }));
  })()
`));
console.log('Dropdown items with MAI filter:', items.slice(0, 10));

const maiItem = items.find(i => i.text.includes('MAI'));
if (!maiItem) { console.log('ERROR: MAI item not found'); process.exit(1); }

await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: maiItem.x, y: maiItem.y, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: maiItem.x, y: maiItem.y, button: 'left', clickCount: 1 });
await wait(1500);
console.log('Selected:', maiItem.text);

// Click Create button
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

await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(createBtn.x), y: Math.round(createBtn.y), button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(createBtn.x), y: Math.round(createBtn.y), button: 'left', clickCount: 1 });
await wait(3000);

let createdId = null;
let capturedBody = null;

for (const [id, req] of Object.entries(captured)) {
  if (req.body) {
    capturedBody = req.body;
    try {
      const p = JSON.parse(req.body);
      console.log('\n=== EXACT PAYLOAD TV SENT ===');
      console.log(JSON.stringify(p, null, 2));
    } catch(e) {
      console.log('Raw body:', req.body);
    }
  }
}

for (const [id, respId] of Object.entries(responses)) {
  try {
    const b = await client.Network.getResponseBody({ requestId: respId });
    const r = JSON.parse(b.body);
    console.log('\n=== RESPONSE ===');
    console.log('status:', r.s, 'alert_id:', r.r?.alert_id);
    if (r.r?.alert_id) createdId = r.r.alert_id;
    if (r.r?.presentation_data?.studies) {
      const studies = r.r.presentation_data.studies;
      for (const [k, s] of Object.entries(studies)) {
        if (s.alert_conditions) {
          console.log('\nAlert condition IDs:', Object.keys(s.alert_conditions));
        }
      }
    }
  } catch(e) {}
}

if (createdId) {
  console.log(`\nDeleting test alert ${createdId}...`);
  const del = await evaluateAsync(`
    fetch('https://pricealerts.tradingview.com/delete_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ payload: { alert_id: ${createdId} } }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
  `);
  console.log('Deleted:', del?.s);
}

await client.Network.disable();
process.exit(0);
