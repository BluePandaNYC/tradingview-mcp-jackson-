import { evaluate, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Press Escape to close any open dialog
await client.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Escape', keyCode: 27, code: 'Escape' });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', code: 'Escape' });
console.log('Closed dialog with Escape');
await wait(1000);

// Click chart to focus
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 600, y: 350, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 600, y: 350, button: 'left', clickCount: 1 });
await wait(800);

// Open create alert dialog
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 1, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
await wait(2000);

// Take screenshot
const shot = await capture.captureScreenshot({ region: 'full' });
console.log('Screenshot:', shot.file_path);

// Inspect the dialog DOM
const info = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="dialog-"][class*="popup-"]');
    if (!d) {
      // Try to find any visible dialog
      var all = document.querySelectorAll('[role="dialog"], [data-name*="alert"], [class*="alertDialog"], [class*="AlertDialog"]');
      return JSON.stringify({found: false, tried: all.length});
    }
    var condSection = d.querySelector('[class*="condition" i], [class*="Condition"]');
    var allBtns = Array.from(d.querySelectorAll('button')).map(function(b){ return {text: b.textContent.trim().substring(0,30), label: b.getAttribute('aria-label')||''}; });
    var allSelects = Array.from(d.querySelectorAll('[role="combobox"], select')).map(function(s){ return {role: s.getAttribute('role'), text: s.textContent.trim().substring(0,30), val: s.value||''}; });
    var allDivs = Array.from(d.querySelectorAll('[class*="select" i], [class*="dropdown" i]')).slice(0,8).map(function(s){ return {cls: s.className.substring(0,50), text: s.textContent.trim().substring(0,30)}; });
    return JSON.stringify({
      found: true,
      cls: d.className.substring(0,80),
      buttons: allBtns.slice(0,10),
      selects: allSelects.slice(0,8),
      dropdowns: allDivs
    });
  })()
`);
console.log('Dialog DOM:', JSON.parse(info));

process.exit(0);
