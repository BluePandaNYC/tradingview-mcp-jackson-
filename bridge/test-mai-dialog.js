/**
 * Opens alert dialog, selects MAI Pro, checks if a sub-selector appears for alertconditions.
 * Then creates one alert choosing the "Bullish Arrow" condition to capture the exact payload.
 */
import { evaluate, evaluateAsync, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Enable network monitoring
await client.Network.enable();
const captured = {};
client.Network.requestWillBeSent((p) => {
  if (p.request.url.includes('create_alert')) {
    captured[p.requestId] = { url: p.request.url, body: p.request.postData || '' };
  }
});
const responses = {};
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

// Click condition dropdown and select MAI Pro
const condRect = JSON.parse(await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return 'null';
    var el = d.querySelector('[class*="select-UkzauqCm"]');
    if (!el) return 'null';
    var r = el.getBoundingClientRect();
    return JSON.stringify({cx: r.x+r.width/2, cy: r.y+r.height/2});
  })()
`));

await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(condRect.cx), y: Math.round(condRect.cy), button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(condRect.cx), y: Math.round(condRect.cy), button: 'left', clickCount: 1 });
await wait(1200);

// Type MAI to filter
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 2, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
await wait(100);
await client.Input.insertText({ text: 'MAI' });
await wait(1000);

// Click MAI Pro
const maiItem = JSON.parse(await evaluate(`
  (function(){
    var items = Array.from(document.querySelectorAll('[class*="menuItem-VfhgWFqC"], [class*="item-BOZdoKo9"]'));
    for (var i = 0; i < items.length; i++) {
      if (items[i].textContent.indexOf('MAI Pro') !== -1) {
        var r = items[i].getBoundingClientRect();
        if (r.width > 0) return JSON.stringify({x: r.x+r.width/2, y: r.y+r.height/2});
      }
    }
    return 'null';
  })()
`));

await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(maiItem.x), y: Math.round(maiItem.y), button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(maiItem.x), y: Math.round(maiItem.y), button: 'left', clickCount: 1 });
await wait(1500);
console.log('Selected MAI Pro');

// Check dialog state - look for sub-selectors
const selects = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return JSON.stringify({err: 'no dialog'});
    var all = Array.from(d.querySelectorAll('button, div[class*="select"], [role="combobox"]'));
    var vis = all.filter(function(e){ var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    return JSON.stringify(vis.map(function(e){ return {tag:e.tagName, cls:e.className.substring(0,50), text:e.textContent.trim().substring(0,40), y:Math.round(e.getBoundingClientRect().y)}; }));
  })()
`);
console.log('\nDialog elements after MAI Pro selection:');
JSON.parse(selects).forEach(e => console.log(`  y=${e.y} [${e.tag}] "${e.text}" cls=${e.cls.substring(0,30)}`));

// Take screenshot
const s1 = await capture.captureScreenshot({ region: 'full' });
console.log('\nScreenshot:', s1.file_path);

// Now click Create and capture whatever alertcondition is selected by default
const createBtn = JSON.parse(await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return 'null';
    var btns = Array.from(d.querySelectorAll('button'));
    var create = btns.find(function(b){ return /^create$/i.test(b.textContent.trim()); });
    if (!create) return 'null';
    var r = create.getBoundingClientRect();
    return JSON.stringify({x: r.x+r.width/2, y: r.y+r.height/2});
  })()
`));

await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(createBtn.x), y: Math.round(createBtn.y), button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(createBtn.x), y: Math.round(createBtn.y), button: 'left', clickCount: 1 });
await wait(3000);

// Print captures
for (const [id, req] of Object.entries(captured)) {
  console.log('\nCaptured payload (conditions section):');
  const parsed = JSON.parse(req.body);
  console.log(JSON.stringify(parsed.payload?.conditions, null, 2));
}

for (const [id, respId] of Object.entries(responses)) {
  try {
    const b = await client.Network.getResponseBody({ requestId: respId });
    const r = JSON.parse(b.body);
    if (r.r?.presentation_data?.studies) {
      const studies = r.r.presentation_data.studies;
      for (const [k, s] of Object.entries(studies)) {
        if (s.alert_conditions) {
          console.log('\nAlert conditions:', JSON.stringify(s.alert_conditions, null, 2));
        }
      }
    }
    console.log('Created alert_id:', r.r?.alert_id, 'type:', r.r?.type);
  } catch(e) {}
}

await client.Network.disable();
process.exit(0);
