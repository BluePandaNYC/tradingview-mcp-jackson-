import { evaluate, getClient } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Close any dialog
await client.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Escape', keyCode: 27, code: 'Escape' });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', code: 'Escape' });
await wait(600);

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

await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(condRect.cx), y: Math.round(condRect.cy), button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(condRect.cx), y: Math.round(condRect.cy), button: 'left', clickCount: 1 });
await wait(1500);

// Get ALL items in the dropdown (all possible class variations)
const allItems = await evaluate(`
  (function(){
    // Try multiple class patterns
    var found = new Set();
    var selectors = ['[class*="menuItem-VfhgWFqC"]', '[class*="itemTitle-VfhgWFqC"]', '[class*="item-BOZdoKo9"]'];
    selectors.forEach(function(s){
      Array.from(document.querySelectorAll(s)).forEach(function(el){
        var t = el.textContent.trim();
        if (t && t.length > 2 && t.length < 120) found.add(t);
      });
    });
    return JSON.stringify(Array.from(found));
  })()
`);

console.log('All dropdown items:');
JSON.parse(allItems).forEach(item => console.log(' -', item));

process.exit(0);
