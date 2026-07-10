import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Click the person icon (top right)
const personBtn = JSON.parse(await evaluate(`
  (function(){
    var btns = Array.from(document.querySelectorAll('button, a'));
    var signin = btns.find(b => /sign.?in|log.?in/i.test(b.textContent) || b.getAttribute('aria-label') === 'Open user menu' || b.getAttribute('data-name') === 'header-user-menu-button');
    if (!signin) {
      // Try the person icon by position (top right area)
      var all = Array.from(document.querySelectorAll('button'));
      var topRight = all.filter(b => { var r = b.getBoundingClientRect(); return r.x > 900 && r.y < 60 && r.width > 0; });
      signin = topRight[0];
    }
    if (!signin) return 'null';
    signin.click();
    return JSON.stringify({ found: true, text: signin.textContent.trim().substring(0,30) });
  })()
`));
console.log('Clicked:', personBtn);
await wait(2000);

// Check for email/password inputs
const inputs = await evaluate(`
  (function(){
    var inputs = Array.from(document.querySelectorAll('input[type="email"], input[type="password"], input[name="username"], input[name="password"], input[type="text"]'));
    return inputs.map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder }));
  })()
`);
console.log('Login inputs visible:', inputs);
process.exit(0);
