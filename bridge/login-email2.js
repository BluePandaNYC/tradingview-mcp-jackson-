import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Click Email at correct position (790, 517)
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 790, y: 517, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 790, y: 517, button: 'left', clickCount: 1 });
await wait(2000);

// Look for username input
const input = JSON.parse(await evaluate(`
  (function(){
    var inputs = Array.from(document.querySelectorAll('input'));
    var vis = inputs.filter(i => i.getBoundingClientRect().width > 0);
    return JSON.stringify(vis.map(i => {
      var r = i.getBoundingClientRect();
      return { type: i.type, name: i.name, placeholder: i.placeholder, x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) };
    }));
  })()
`));
console.log('Inputs:', input);

if (input.length > 0) {
  // Focus and fill username
  const usernameInput = input[0];
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: usernameInput.x, y: usernameInput.y, button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: usernameInput.x, y: usernameInput.y, button: 'left', clickCount: 1 });
  await wait(300);
  await client.Input.insertText({ text: 'yafashriki@gmail.com' });
  console.log('Typed email. Screenshot coming...');
} else {
  console.log('No input found after clicking Email');
}
process.exit(0);
