import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Check if password field has value
const fields = await evaluate(`
  (function(){
    var pw = document.querySelector('input[name="id_password"], input[type="password"]');
    var em = document.querySelector('input[name="id_username"], input[type="email"], input[type="text"]');
    return JSON.stringify({
      email: em ? em.value : 'not found',
      passwordFilled: pw ? pw.value.length > 0 : false,
      passwordLen: pw ? pw.value.length : 0
    });
  })()
`);
console.log('Fields:', fields);

const f = JSON.parse(fields);
if (f.passwordFilled) {
  console.log('Password is filled — clicking Sign in...');
  // Click Sign in button
  const signInBtn = JSON.parse(await evaluate(`
    (function(){
      var btns = Array.from(document.querySelectorAll('button'));
      var btn = btns.find(b => /sign.?in/i.test(b.textContent.trim()));
      if (!btn) return 'null';
      var r = btn.getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) });
    })()
  `));
  if (signInBtn) {
    await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: signInBtn.x, y: signInBtn.y, button: 'left', clickCount: 1 });
    await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: signInBtn.x, y: signInBtn.y, button: 'left', clickCount: 1 });
    console.log('Clicked Sign in at', signInBtn);
    await wait(4000);

    const auth = await evaluate(`
      fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
        .then(r => r.json()).then(d => d.s + ':' + (d.r ? d.r.length : 'null')).catch(e => 'err')
    `);
    console.log('Auth after submit:', auth);
  }
} else {
  console.log('Password field is empty. Focusing it now — please type your password in the Desktop app.');
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 754, y: 425, button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 754, y: 425, button: 'left', clickCount: 1 });
}
process.exit(0);
