import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));

// Click Close button
await evaluate(`
  (function(){
    var btns = Array.from(document.querySelectorAll('button'));
    var close = btns.find(b => b.textContent.trim() === 'Close');
    if (close) close.click();
  })()
`);
await wait(1000);

// Hard reload the page to get a fresh login state
const client = await getClient();
await client.Page.reload({ ignoreCache: true });
await wait(4000);

const url = await evaluate(`window.location.href`);
console.log('Page after reload:', url);
process.exit(0);
