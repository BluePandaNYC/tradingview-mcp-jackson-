import { getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Click the password field at (754, 425)
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 754, y: 425, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 754, y: 425, button: 'left', clickCount: 1 });
await wait(300);
console.log('Password field clicked — type your password in the TradingView Desktop app now');
process.exit(0);
