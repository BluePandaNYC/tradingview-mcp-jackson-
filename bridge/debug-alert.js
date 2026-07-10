import { evaluate, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';

const wait = ms => new Promise(r => setTimeout(r, ms));

const client = await getClient();

// Click center of chart to give it keyboard focus
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 600, y: 400, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 600, y: 400, button: 'left', clickCount: 1 });
console.log('1. Clicked chart at (600, 400)');
await wait(1000);

const focused = await evaluate('document.activeElement ? document.activeElement.tagName : "none"');
console.log('2. Focused element:', focused);

// Press Alt+A
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 1, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
console.log('3. Sent Alt+A');
await wait(2500);

// Screenshot to see what happened
const shot = await capture.captureScreenshot({ region: 'full' });
console.log('4. Screenshot:', shot.file_path);

// Check what dialogs are open
const info = await evaluate(`
  (function() {
    var els = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'));
    var named = Array.from(document.querySelectorAll('[data-name]')).filter(function(e){
      return /alert/i.test(e.getAttribute('data-name'));
    });
    var byClass = Array.from(document.querySelectorAll('[class*="dialog" i], [class*="Dialog"], [class*="modal" i], [class*="Modal"]')).slice(0,5);
    return JSON.stringify({
      roleDialogs: els.map(function(e){ return {dn: e.getAttribute('data-name'), cls: e.className.substring(0,50)}; }),
      namedAlerts: named.map(function(e){ return {dn: e.getAttribute('data-name'), tag: e.tagName}; }),
      classMatches: byClass.map(function(e){ return {cls: e.className.substring(0,60), tag: e.tagName}; })
    });
  })()
`);
console.log('5. Dialog info:', info);

// Also try finding the create alert button directly
const btns = await evaluate(`
  (function() {
    var all = document.querySelectorAll('button, [role="button"]');
    return JSON.stringify(Array.from(all).filter(function(b){
      var l = b.getAttribute('aria-label') || '';
      var t = b.textContent.trim();
      return /alert/i.test(l) || /alert/i.test(t);
    }).slice(0,5).map(function(b){ return {label: b.getAttribute('aria-label'), text: b.textContent.trim().substring(0,30)}; }));
  })()
`);
console.log('6. Alert buttons:', btns);

process.exit(0);
