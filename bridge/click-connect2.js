import { evaluate, evaluateAsync } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));

// Click via JS directly
const result = await evaluate(`
  (function(){
    var btns = Array.from(document.querySelectorAll('button'));
    var connect = btns.find(b => b.textContent.trim() === 'Connect');
    if (!connect) return 'not found';
    connect.click();
    return 'clicked: ' + connect.textContent.trim();
  })()
`);
console.log(result);
await wait(2000);

// Also try any anchor or link with "Connect"
const linkResult = await evaluate(`
  (function(){
    var all = Array.from(document.querySelectorAll('a, button, [role="button"]'));
    return all.filter(e => /connect|sign in|log in/i.test(e.textContent)).map(e => e.textContent.trim()).join(' | ');
  })()
`);
console.log('Clickable elements:', linkResult);
process.exit(0);
