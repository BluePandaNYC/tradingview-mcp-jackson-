import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// First press Escape to close the dropdown
await client.Input.dispatchKeyEvent({ type: 'keyDown', key: 'Escape', code: 'Escape', keyCode: 27 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', code: 'Escape' });
await wait(500);

// Click the Email button
const emailBtn = JSON.parse(await evaluate(`
  (function(){
    var btns = Array.from(document.querySelectorAll('button, [role="button"]'));
    var email = btns.find(b => b.textContent.trim() === 'Email');
    if (!email) return 'null';
    var r = email.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) });
  })()
`));

console.log('Email button at:', emailBtn);
if (!emailBtn) { console.log('Email button not found'); process.exit(1); }

await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: emailBtn.x, y: emailBtn.y, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: emailBtn.x, y: emailBtn.y, button: 'left', clickCount: 1 });
await wait(1500);

// Find the username/email input and type the email
const inputInfo = await evaluate(`
  (function(){
    var inputs = Array.from(document.querySelectorAll('input'));
    return JSON.stringify(inputs.map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder })));
  })()
`);
console.log('Inputs visible:', inputInfo);

// Focus and type email
const typed = await evaluate(`
  (function(){
    var input = document.querySelector('input[name="username"], input[type="email"], input[type="text"]');
    if (!input) return 'no input found';
    input.focus();
    return 'focused: ' + input.name;
  })()
`);
console.log(typed);
await wait(300);
await client.Input.insertText({ text: 'yafashriki@gmail.com' });
await wait(300);
console.log('Typed email. Now waiting for you to type your password and press Enter...');
process.exit(0);
