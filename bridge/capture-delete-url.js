/**
 * Captures the exact delete_alert URL by monitoring network while deleting an alert via UI.
 */
import { evaluate, evaluateAsync, getClient } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

await client.Network.enable();
const captured = {};

client.Network.requestWillBeSent((p) => {
  if (p.request.url.includes('pricealerts') || p.request.url.includes('delete')) {
    captured[p.requestId] = { url: p.request.url, method: p.request.method, body: p.request.postData || '' };
  }
});

// Open alerts panel
const alertsPanel = await evaluate(`
  (function(){
    // Look for the alerts button in sidebar
    var btns = Array.from(document.querySelectorAll('button, [data-name]'));
    var alertBtn = btns.find(b => (b.getAttribute('data-name') || '').toLowerCase().includes('alert') || b.getAttribute('aria-label') === 'Alerts');
    if (alertBtn) { var r = alertBtn.getBoundingClientRect(); return JSON.stringify({x: r.x+r.width/2, y: r.y+r.height/2}); }
    return 'null';
  })()
`);
console.log('Alerts button:', alertsPanel);

if (alertsPanel && JSON.parse(alertsPanel)) {
  const ab = JSON.parse(alertsPanel);
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: ab.x, y: ab.y, button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: ab.x, y: ab.y, button: 'left', clickCount: 1 });
  await wait(1500);
}

// Take screenshot to see current state
const s = await evaluate(`
  (function(){
    // Find any alert item with a delete button visible
    var rows = Array.from(document.querySelectorAll('[class*="alert-"][class*="row"], [class*="alertItem"], [class*="item-"][class*="alert"]'));
    return JSON.stringify({rowCount: rows.length, classes: rows.slice(0,3).map(r=>r.className.substring(0,60))});
  })()
`);
console.log('Alert rows:', s);

await wait(1000);
console.log('Now watching for delete_alert requests... Please delete an alert in the UI');
console.log('(I will wait 30 seconds)');
await wait(30000);

console.log('\n=== CAPTURED REQUESTS ===');
for (const [id, req] of Object.entries(captured)) {
  if (req.method === 'POST') {
    console.log(`${req.method} ${req.url}`);
    if (req.body) console.log('Body:', req.body.substring(0, 200));
    console.log('---');
  }
}

await client.Network.disable();
process.exit(0);
