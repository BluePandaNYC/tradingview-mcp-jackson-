import { getClient, evaluateAsync } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Navigate to homepage with sign-in hash
await client.Page.navigate({ url: 'https://www.tradingview.com/' });
await wait(2000);

// Click the sign-in button (person icon top right)
await evaluateAsync(`
  (function(){
    var btns = Array.from(document.querySelectorAll('button, a'));
    var signin = btns.find(b => b.getAttribute('data-name') === 'header-user-menu-button' || b.getAttribute('aria-label') === 'Open user menu');
    if (!signin) {
      // Find by position - top right area
      signin = Array.from(document.querySelectorAll('button')).find(b => {
        var r = b.getBoundingClientRect();
        return r.x > 800 && r.y < 60 && r.width > 0;
      });
    }
    if (signin) signin.click();
    return signin ? 'clicked' : 'not found';
  })()
`);
await wait(1500);

// Click Email button
await evaluateAsync(`
  (function(){
    var all = Array.from(document.querySelectorAll('*'));
    var el = all.find(e => e.children.length === 0 && /^email$/i.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0);
    if (el) { el.click(); return 'email clicked'; }
    return 'email not found';
  })()
`);
await wait(1500);

// Fill email
await evaluateAsync(`
  (function(){
    var input = document.querySelector('input[name="id_username"], input[type="email"], input[type="text"]');
    if (!input) return 'no input';
    input.focus();
    input.value = '';
  })()
`);
await client.Input.insertText({ text: 'yafashriki@gmail.com' });
await wait(300);

console.log('READY — The Chrome window titled "TradingView" is now showing the login form.');
console.log('Look for the window that just came to the front and type your password there.');
process.exit(0);
