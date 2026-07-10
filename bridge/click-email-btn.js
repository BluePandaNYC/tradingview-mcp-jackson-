import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Find Email by any element type
const emailEl = JSON.parse(await evaluate(`
  (function(){
    var all = Array.from(document.querySelectorAll('*'));
    var el = all.find(e => e.children.length === 0 && e.textContent.trim() === 'Email');
    if (!el) el = all.find(e => /^email$/i.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0);
    if (!el) return 'null';
    var r = el.getBoundingClientRect();
    return JSON.stringify({ tag: el.tagName, x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) });
  })()
`));
console.log('Email element:', emailEl);

// Also click by approximate position from screenshot (Email button is at ~80% height of dialog)
// Viewport 1037x813, Email button at approx x=786, y=660 in CSS pixels
const clickX = 786, clickY = 660;
console.log(`Clicking Email at (${clickX}, ${clickY})`);
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: clickX, y: clickY, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: clickX, y: clickY, button: 'left', clickCount: 1 });
await wait(1500);

// Check for inputs
const inputs = JSON.parse(await evaluate(`
  JSON.stringify(Array.from(document.querySelectorAll('input')).map(i => ({
    type: i.type, name: i.name, placeholder: i.placeholder, visible: i.getBoundingClientRect().width > 0
  })))
`));
console.log('Inputs after click:', inputs);
process.exit(0);
