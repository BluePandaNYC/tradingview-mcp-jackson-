import { evaluate, getClient } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Find and click the Connect button in the terminated session dialog
const btn = JSON.parse(await evaluate(`
  (function(){
    var btns = Array.from(document.querySelectorAll('button'));
    var connect = btns.find(b => b.textContent.trim() === 'Connect');
    if (!connect) return 'null';
    var r = connect.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) });
  })()
`));

if (!btn) { console.log('Connect button not found'); process.exit(1); }

console.log('Clicking Connect at', btn);
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
await wait(2000);

console.log('Done — check if login form appeared');
process.exit(0);
