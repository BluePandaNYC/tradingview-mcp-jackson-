import { evaluate, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Click the "Prop Desk AMD+PBD+ORB v3" item (highlighted at bottom of dropdown)
const propDeskItem = JSON.parse(await evaluate(`
  (function(){
    var items = Array.from(document.querySelectorAll('[class*="menuItem-VfhgWFqC"], [class*="item-BOZdoKo9"]'));
    for (var i = 0; i < items.length; i++) {
      if (items[i].textContent.indexOf('Prop Desk AMD') !== -1) {
        var r = items[i].getBoundingClientRect();
        return JSON.stringify({x: r.x+r.width/2, y: r.y+r.height/2, text: items[i].textContent.trim().substring(0,50)});
      }
    }
    return 'null';
  })()
`));

if (propDeskItem) {
  console.log('Clicking Prop Desk at:', propDeskItem);
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: Math.round(propDeskItem.x), y: Math.round(propDeskItem.y), button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: Math.round(propDeskItem.x), y: Math.round(propDeskItem.y), button: 'left', clickCount: 1 });
  await wait(1500);
}

// Take screenshot immediately
const s1 = await capture.captureScreenshot({ region: 'full' });
console.log('Screenshot after Prop Desk selection:', s1.file_path);

// Inspect ALL elements in dialog
const info = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return JSON.stringify({err: 'no dialog'});
    var all = Array.from(d.querySelectorAll('*')).filter(function(e){
      var r = e.getBoundingClientRect();
      return r.width > 20 && r.height > 5;
    });
    return JSON.stringify({
      count: all.length,
      elements: all.slice(0,40).map(function(e){
        var r = e.getBoundingClientRect();
        return {
          tag: e.tagName,
          cls: e.className.substring(0,50),
          text: e.textContent.trim().substring(0,40),
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h)
        };
      })
    });
  })()
`);
const parsed = JSON.parse(info);
console.log('\nDialog elements after selection:');
parsed.elements.forEach(e => {
  if (e.text) console.log(`  [${e.tag}] "${e.text}" at y=${e.y} cls=${e.cls.substring(0,40)}`);
});

// Specifically look for any dropdown/select that contains output names
const outputs = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return '[]';
    var dropdowns = Array.from(d.querySelectorAll('[class*="select"], [role="combobox"], [class*="dropdown"]'));
    return JSON.stringify(dropdowns.map(function(e){
      var r = e.getBoundingClientRect();
      return {text: e.textContent.trim().substring(0,60), cls: e.className.substring(0,60), visible: r.width > 0, y: Math.round(r.y)};
    }));
  })()
`);
console.log('\nAll selects/dropdowns in dialog:', JSON.parse(outputs));

process.exit(0);
