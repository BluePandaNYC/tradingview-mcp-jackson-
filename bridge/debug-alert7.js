import { evaluate, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Close current dialog
await client.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Escape', keyCode: 27, code: 'Escape' });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', code: 'Escape' });
await wait(800);

// Click chart to focus, then open alert dialog
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 600, y: 350, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 600, y: 350, button: 'left', clickCount: 1 });
await wait(500);
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 1, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
await wait(2000);
console.log('Dialog opened');

// Click the "Price" dropdown to open it
const rect = JSON.parse(await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return 'null';
    var el = d.querySelector('[class*="select-UkzauqCm"]');
    if (!el) return 'null';
    var r = el.getBoundingClientRect();
    return JSON.stringify({cx: r.x+r.width/2, cy: r.y+r.height/2});
  })()
`));
if (rect && rect.cx) {
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(rect.cx), y: Math.round(rect.cy), button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(rect.cx), y: Math.round(rect.cy), button: 'left', clickCount: 1 });
  await wait(1500);
  console.log('Clicked condition dropdown');
}

// Scroll to the bottom of the dropdown to see all items
await evaluate(`
  (function(){
    var menus = Array.from(document.querySelectorAll('[class*="menu-"], [class*="menuBody"], [class*="scrollable"]')).filter(function(e){
      var r = e.getBoundingClientRect();
      return r.width > 100 && r.height > 100;
    });
    if (menus.length > 0) menus[0].scrollTop = 99999;
  })()
`);
await wait(800);

// Get ALL items in the dropdown
const allItems = await evaluate(`
  (function(){
    var containers = [
      document.querySelector('[class*="menu-"]'),
      document.querySelector('[class*="menuBody"]'),
      document.querySelector('[class*="menuList"]'),
      document.querySelector('[class*="optionList"]'),
      document.querySelector('[class*="scrollable"]')
    ].filter(Boolean);

    var items = [];
    for (var c of containers) {
      var r = c.getBoundingClientRect();
      if (r.width < 100 || r.height < 50) continue;
      var els = Array.from(c.querySelectorAll('[class*="item"], [class*="Item"], [role="option"], li'));
      els.forEach(function(e){
        var t = e.textContent.trim();
        if (t && t.length > 0 && t.length < 100) {
          var br = e.getBoundingClientRect();
          items.push({text: t.substring(0,60), y: Math.round(br.y), cls: e.className.substring(0,40)});
        }
      });
      if (items.length > 0) break;
    }
    return JSON.stringify(items.slice(0,50));
  })()
`);
const items = JSON.parse(allItems);
console.log(`\nAll ${items.length} dropdown items:`);
items.forEach(item => console.log(`  [${item.y}] "${item.text}"`));

// Also type "AMD" to see if there are specific output entries
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 2, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
await wait(100);
await client.Input.insertText({ text: 'AMD' });
await wait(1000);

const amdItems = await evaluate(`
  (function(){
    var all = Array.from(document.querySelectorAll('[class*="item"], [class*="Item"], [role="option"], li'));
    var vis = all.filter(function(e){
      var r = e.getBoundingClientRect();
      return r.width > 50 && r.height > 5 && r.y > 200;
    });
    return JSON.stringify(vis.map(function(e){ return {text: e.textContent.trim().substring(0,60), cls: e.className.substring(0,40)}; }).slice(0,20));
  })()
`);
console.log('\nItems after typing "AMD":', JSON.parse(amdItems));

const s1 = await capture.captureScreenshot({ region: 'full' });
console.log('\nScreenshot:', s1.file_path);

process.exit(0);
