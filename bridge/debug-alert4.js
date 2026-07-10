import { evaluate, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Get the bounding rect of the first condition dropdown ("Price")
const rects = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return JSON.stringify({err: 'no dialog'});
    var el = d.querySelector('[class*="select-UkzauqCm"]');
    if (!el) return JSON.stringify({err: 'no select'});
    var r = el.getBoundingClientRect();
    return JSON.stringify({x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width/2, cy: r.y + r.height/2});
  })()
`);
console.log('Price dropdown rect:', rects);

const rect = JSON.parse(rects);
if (rect.cx) {
  // Use CDP to physically click at those coordinates
  const x = Math.round(rect.cx);
  const y = Math.round(rect.cy);
  console.log(`CDP-clicking at (${x}, ${y})`);

  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 100));
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await wait(1500);
}

const s1 = await capture.captureScreenshot({ region: 'full' });
console.log('Screenshot:', s1.file_path);

// Check what menu opened
const menu = await evaluate(`
  (function(){
    // Find any large visible container that appeared
    var all = document.querySelectorAll('[class*="menu-"], [class*="option"], [class*="list"], [class*="dropdown"]');
    var vis = Array.from(all).filter(function(e){
      var r = e.getBoundingClientRect();
      return r.width > 50 && r.height > 50;
    }).slice(0,5);
    return JSON.stringify(vis.map(function(e){
      var items = Array.from(e.querySelectorAll('li, [role="option"], [class*="item"]')).map(function(i){ return i.textContent.trim().substring(0,40); }).filter(Boolean);
      return {cls: e.className.substring(0,60), height: e.getBoundingClientRect().height, items: items.slice(0,15)};
    }));
  })()
`);
console.log('Visible menus after click:', menu);

process.exit(0);
