import { evaluate, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Inspect the current dialog state in detail
const info = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return JSON.stringify({err: 'no dialog'});
    // Get ALL interactive elements
    var all = Array.from(d.querySelectorAll('button, input, select, [role="combobox"], [role="listbox"], [class*="select"], [class*="dropdown"], a'));
    return JSON.stringify({
      count: all.length,
      elements: all.map(function(e){
        var r = e.getBoundingClientRect();
        return {
          tag: e.tagName,
          role: e.getAttribute('role'),
          cls: e.className.substring(0,60),
          text: e.textContent.trim().substring(0,40),
          label: e.getAttribute('aria-label')||'',
          visible: r.width > 0 && r.height > 0,
          x: Math.round(r.x), y: Math.round(r.y)
        };
      })
    });
  })()
`);
const parsed = JSON.parse(info);
console.log('Dialog elements (', parsed.count, 'total):');
parsed.elements.filter(e => e.visible).forEach(e => {
  console.log(`  [${e.tag}] "${e.text}" cls=${e.cls.substring(0,40)} at (${e.x},${e.y})`);
});

// Try clicking the first dropdown (the study name) to see if it opens an output sub-selector
const studyDropRect = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    var el = d && d.querySelector('[class*="select-UkzauqCm"]');
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return JSON.stringify({x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x+r.width/2, cy: r.y+r.height/2});
  })()
`);
console.log('\nStudy dropdown rect:', studyDropRect);

// Now let's also check: does the dialog show alert based on alertcondition() or output plot?
// Look at the "Message" field content to understand the mode
const msgContent = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return '';
    // Find message element
    var rows = Array.from(d.querySelectorAll('[class*="row"], [class*="Row"], tr, div'));
    for (var i = 0; i < rows.length; i++) {
      var txt = rows[i].textContent.trim();
      if (txt.startsWith('Message') || txt.startsWith('message')) {
        return txt.substring(0,100);
      }
    }
    return 'not found';
  })()
`);
console.log('\nMessage area:', msgContent);

// Let's check what the entire condition section structure looks like
const condHTML = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return '';
    var cond = d.querySelector('[class*="condition" i]') || d;
    // Get outer HTML but limit it
    var html = cond.innerHTML;
    return html.substring(0, 2000);
  })()
`);
console.log('\nCondition section HTML (first 2000 chars):', condHTML);

process.exit(0);
