import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Get viewport size to calculate button position
const viewport = await evaluate(`({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio })`);
console.log('Viewport:', viewport);

// The "Continue as Yafa" Google button is in an iframe around the center-right of the dialog
// Dialog appears to be right half of screen, button is near top of sign-in form
// Based on screenshot: button is at roughly 75% of width, 52% of height
const x = Math.round(viewport.w * 0.75);
const y = Math.round(viewport.h * 0.52);
console.log(`Clicking at (${x}, ${y})`);

await client.Input.dispatchMouseEvent({ type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
await wait(5000);

// Check auth
const auth = await evaluate(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json()).then(d => d.s + ' count=' + d.r?.length).catch(e => e.message)
`);
console.log('Auth after click:', auth);
process.exit(0);
