import { evaluate, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// -- Step 1: click the "Price" dropdown (first condition selector)
console.log('Clicking "Price" dropdown...');
const priceClicked = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]') || document.querySelector('[class*="dialog-f4TzBb"]');
    if (!d) return {err: 'no dialog'};
    // The first condition dropdown: class includes select-UkzauqCm
    var el = d.querySelector('[class*="select-UkzauqCm"]');
    if (!el) {
      // Fallback: first select-VfhgWFqC
      el = d.querySelector('[class*="select-VfhgWFqC"]');
    }
    if (!el) return {err: 'no price dropdown', els: Array.from(d.querySelectorAll('[class*="select"]')).slice(0,5).map(function(e){ return e.className.substring(0,60); })};
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    el.click();
    return {ok: true, tag: el.tagName, cls: el.className.substring(0,60)};
  })()
`);
console.log('Price click result:', priceClicked);
await wait(1500);

// Screenshot to see dropdown options
const s1 = await capture.captureScreenshot({ region: 'full' });
console.log('Screenshot after clicking Price:', s1.file_path);

// Check what options appeared
const opts = await evaluate(`
  (function(){
    // Look for any open dropdown menu
    var menus = document.querySelectorAll('[class*="menu"], [class*="Menu"], [class*="option"], [role="option"], [role="listbox"]');
    var visible = Array.from(menus).filter(function(m){
      var r = m.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return JSON.stringify(visible.slice(0,3).map(function(m){ return {cls: m.className.substring(0,60), items: Array.from(m.querySelectorAll('li, [role="option"], div')).slice(0,10).map(function(i){ return i.textContent.trim().substring(0,30); }).filter(Boolean) }; }));
  })()
`);
console.log('Dropdown options:', opts);

// Also check for any search input that appeared
const searchInput = await evaluate(`
  (function(){
    var inputs = document.querySelectorAll('input[placeholder*="search" i], input[placeholder*="filter" i], input[placeholder*="type" i], input[class*="search" i]');
    var vis = Array.from(inputs).filter(function(i){ var r = i.getBoundingClientRect(); return r.width > 0; });
    return JSON.stringify(vis.map(function(i){ return {ph: i.placeholder, cls: i.className.substring(0,50)}; }));
  })()
`);
console.log('Search inputs:', searchInput);

process.exit(0);
