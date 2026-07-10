/**
 * Create test alerts for MAI Pro and MavTrender to capture their pine_ids.
 */
import { evaluate, evaluateAsync, getClient } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Enable network monitoring
await client.Network.enable();
const capturedPayloads = {};
const capturedResponses = {};

client.Network.requestWillBeSent((params) => {
  if (params.request.url.includes('pricealerts.tradingview.com/create_alert')) {
    capturedPayloads[params.requestId] = params.request.postData || '';
  }
});

client.Network.responseReceived((params) => {
  if (params.response.url.includes('create_alert')) {
    capturedResponses[params.requestId] = params.requestId;
  }
});

// Helper: create alert for a specific study
async function captureStudyInfo(searchTerm, displayName) {
  console.log(`\n=== Creating test alert for: ${displayName} ===`);

  // Close any open dialog
  await client.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Escape', keyCode: 27, code: 'Escape' });
  await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', code: 'Escape' });
  await wait(800);

  // Click chart, open alert dialog
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 600, y: 350, button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 600, y: 350, button: 'left', clickCount: 1 });
  await wait(300);
  await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 1, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
  await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
  await wait(2000);

  // Click the condition dropdown
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
  if (!condRect) { console.log('No dialog'); return; }

  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(condRect.cx), y: Math.round(condRect.cy), button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(condRect.cx), y: Math.round(condRect.cy), button: 'left', clickCount: 1 });
  await wait(1200);

  // Type search term
  await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 2, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
  await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
  await wait(100);
  await client.Input.insertText({ text: searchTerm });
  await wait(1000);

  // Find and click the matching item
  const item = JSON.parse(await evaluate(`
    (function(){
      var filter = ${JSON.stringify(searchTerm)};
      var items = Array.from(document.querySelectorAll('[class*="menuItem-VfhgWFqC"], [class*="item-BOZdoKo9"]'));
      for (var i = 0; i < items.length; i++) {
        if (items[i].textContent.indexOf(filter) !== -1) {
          var r = items[i].getBoundingClientRect();
          if (r.width > 0) return JSON.stringify({x: r.x+r.width/2, y: r.y+r.height/2, text: items[i].textContent.trim().substring(0,60)});
        }
      }
      return 'null';
    })()
  `));
  if (!item) { console.log('Not found in dropdown'); return; }

  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(item.x), y: Math.round(item.y), button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(item.x), y: Math.round(item.y), button: 'left', clickCount: 1 });
  await wait(1500);
  console.log('Selected:', item.text);

  // Click Create button
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
  if (!createBtn) { console.log('No Create button'); return; }

  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(createBtn.x), y: Math.round(createBtn.y), button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(createBtn.x), y: Math.round(createBtn.y), button: 'left', clickCount: 1 });
  console.log('Clicked Create');
  await wait(3000);
}

await captureStudyInfo('MAI Pro', 'MaverickAI Pro');
await captureStudyInfo('MavTrender', 'MaverickTrender');

await wait(1000);

// Print captured data
console.log('\n=== CAPTURED PAYLOADS ===');
for (const [id, body] of Object.entries(capturedPayloads)) {
  console.log('\n--- Payload ---');
  console.log(body);
}

for (const [id, respId] of Object.entries(capturedResponses)) {
  try {
    const body = await client.Network.getResponseBody({ requestId: respId });
    console.log('\n--- Response ---');
    console.log(body.body);
  } catch(e) {}
}

await client.Network.disable();
process.exit(0);
