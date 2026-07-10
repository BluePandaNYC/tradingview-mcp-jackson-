/**
 * Creates ONE test alert through the UI while capturing the full API payload.
 * This reveals the exact format needed for programmatic alert creation.
 */
import { evaluate, evaluateAsync, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Close any existing dialog
await client.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Escape', keyCode: 27, code: 'Escape' });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', code: 'Escape' });
await wait(800);

// Enable network monitoring with FULL body capture
await client.Network.enable();
const requests = [];
const responses = [];

client.Network.requestWillBeSent((params) => {
  if (params.request.url.includes('alert')) {
    requests.push({
      requestId: params.requestId,
      url: params.request.url,
      method: params.request.method,
      body: params.request.postData || '',
      headers: params.request.headers
    });
  }
});

client.Network.responseReceived((params) => {
  if (params.response.url.includes('alert')) {
    responses.push({
      requestId: params.requestId,
      url: params.response.url,
      status: params.response.status
    });
  }
});

// Open the alert dialog
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 600, y: 350, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 600, y: 350, button: 'left', clickCount: 1 });
await wait(300);
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 1, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
await wait(2000);

// Get dialog state and the condition dropdown rect
const condRect = JSON.parse(await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return 'null';
    var el = d.querySelector('[class*="select-UkzauqCm"]');
    if (!el) return 'null';
    var r = el.getBoundingClientRect();
    return JSON.stringify({cx: r.x+r.width/2, cy: r.y+r.height/2, text: el.textContent.trim().substring(0,40)});
  })()
`));
console.log('Condition dropdown:', condRect);

if (condRect && condRect.cx) {
  // Click the condition dropdown
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(condRect.cx), y: Math.round(condRect.cy), button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(condRect.cx), y: Math.round(condRect.cy), button: 'left', clickCount: 1 });
  await wait(1500);

  // Type "Prop" to filter
  await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 2, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
  await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
  await wait(100);
  await client.Input.insertText({ text: 'Prop' });
  await wait(800);

  // Click the Prop Desk item
  const propItem = JSON.parse(await evaluate(`
    (function(){
      var items = Array.from(document.querySelectorAll('[class*="menuItem-VfhgWFqC"]'));
      for (var i = 0; i < items.length; i++) {
        if (items[i].textContent.indexOf('Prop Desk AMD') !== -1) {
          var r = items[i].getBoundingClientRect();
          return JSON.stringify({x: r.x+r.width/2, y: r.y+r.height/2});
        }
      }
      return 'null';
    })()
  `));

  if (propItem) {
    await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(propItem.x), y: Math.round(propItem.y), button: 'left', clickCount: 1 });
    await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(propItem.x), y: Math.round(propItem.y), button: 'left', clickCount: 1 });
    await wait(1500);
    console.log('Selected Prop Desk');
  }
}

// Check what sub-conditions are now available (any new dropdown?)
const dialogState = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return JSON.stringify({err: 'no dialog'});
    var selects = Array.from(d.querySelectorAll('[class*="select-"], [role="combobox"]'));
    var visible = selects.filter(function(e){ var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    return JSON.stringify({
      selectCount: visible.length,
      selects: visible.map(function(e){ return {cls: e.className.substring(0,50), text: e.textContent.trim().substring(0,40)}; })
    });
  })()
`);
console.log('Dialog state after Prop Desk selection:', dialogState);

// Take a screenshot
const s1 = await capture.captureScreenshot({ region: 'full' });
console.log('Screenshot:', s1.file_path);

// Now click "Create" to capture the API call
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

if (createBtn) {
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(createBtn.x), y: Math.round(createBtn.y), button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(createBtn.x), y: Math.round(createBtn.y), button: 'left', clickCount: 1 });
  console.log('Clicked Create');
  await wait(3000);
}

// Get response bodies
for (const req of requests) {
  console.log('\n=== REQUEST ===');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('FULL Body:', req.body);
}

for (const resp of responses) {
  console.log('\n=== RESPONSE ===');
  try {
    const body = await client.Network.getResponseBody({ requestId: resp.requestId });
    console.log('URL:', resp.url, 'Status:', resp.status);
    console.log('Body:', body.body);
  } catch(e) {
    console.log('Could not get body:', e.message);
  }
}

await client.Network.disable();
process.exit(0);
