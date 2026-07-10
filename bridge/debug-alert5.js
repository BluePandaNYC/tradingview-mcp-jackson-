import { evaluate, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// The dropdown is already open. Let's type to filter.
// First clear the search field and type "Prop Desk"
console.log('Typing "Prop" to filter...');

// Select all + type to replace current text
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 2, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 }); // Ctrl+A
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
await wait(100);
await client.Input.insertText({ text: 'Prop' });
await wait(1000);

// Screenshot to see what filtered
const s1 = await capture.captureScreenshot({ region: 'full' });
console.log('Screenshot after typing:', s1.file_path);

// Get visible options
const options = await evaluate(`
  (function(){
    var vis = Array.from(document.querySelectorAll('[class*="item"], [role="option"], li')).filter(function(e){
      var r = e.getBoundingClientRect();
      return r.width > 50 && r.height > 10 && r.y > 100;
    });
    return JSON.stringify(vis.slice(0,10).map(function(e){ return {text: e.textContent.trim().substring(0,50), y: e.getBoundingClientRect().y, cls: e.className.substring(0,40)}; }));
  })()
`);
console.log('Filtered options:', options);

// Click "Prop Desk AMD+PBD+ORB v3" option
const clicked = await evaluate(`
  (function(){
    var items = Array.from(document.querySelectorAll('[class*="item"], [role="option"], li'));
    for (var i = 0; i < items.length; i++) {
      var t = items[i].textContent.trim();
      if (t.indexOf('Prop Desk AMD') !== -1) {
        var r = items[i].getBoundingClientRect();
        return JSON.stringify({found: true, text: t.substring(0,50), x: r.x+r.width/2, y: r.y+r.height/2});
      }
    }
    return JSON.stringify({found: false});
  })()
`);
console.log('Prop Desk item:', clicked);

const item = JSON.parse(clicked);
if (item.found) {
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(item.x), y: Math.round(item.y), button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(item.x), y: Math.round(item.y), button: 'left', clickCount: 1 });
  console.log('Clicked Prop Desk item');
  await wait(1500);
}

// Screenshot to see new state
const s2 = await capture.captureScreenshot({ region: 'full' });
console.log('Screenshot after selection:', s2.file_path);

// Check dialog state after selecting study
const state = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return JSON.stringify({err: 'no dialog'});
    var selects = Array.from(d.querySelectorAll('[class*="select-VfhgWFqC"]')).map(function(e){ return {cls: e.className.substring(0,60), text: e.textContent.trim().substring(0,40)}; });
    return JSON.stringify({selects: selects});
  })()
`);
console.log('Dialog state after study selection:', state);

process.exit(0);
