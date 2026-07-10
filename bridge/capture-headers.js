/**
 * Captures the EXACT headers TradingView sends when creating an alert.
 * We create one test alert via UI while monitoring network.
 */
import { evaluate, evaluateAsync, getClient } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Close any dialog
await client.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Escape', keyCode: 27, code: 'Escape' });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', code: 'Escape' });
await wait(600);

// Enable network monitoring for both requests and responses
await client.Network.enable();
const captures = {};

client.Network.requestWillBeSent((params) => {
  if (params.request.url.includes('pricealerts') || params.request.url.includes('create_alert')) {
    captures[params.requestId] = {
      url: params.request.url,
      method: params.request.method,
      headers: params.request.headers,
      body: params.request.postData || ''
    };
  }
});

// Open alert dialog
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 600, y: 350, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 600, y: 350, button: 'left', clickCount: 1 });
await wait(300);
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 1, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
await wait(2000);

// Click Create in the dialog (Price alert mode is fine, just need the headers)
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
  await wait(3000);
}

console.log('=== CAPTURED REQUESTS ===');
for (const [id, req] of Object.entries(captures)) {
  if (req.method === 'POST' && req.url.includes('create_alert')) {
    console.log('\nPOST to create_alert:');
    console.log('URL:', req.url);
    console.log('\nHEADERS:');
    for (const [k, v] of Object.entries(req.headers)) {
      console.log(`  ${k}: ${v}`);
    }
    console.log('\nBODY (first 500):', req.body.substring(0, 500));
  }
}

await client.Network.disable();
process.exit(0);
