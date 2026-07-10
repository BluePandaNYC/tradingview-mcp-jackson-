import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();
await evaluate(`(function(){ var btns = Array.from(document.querySelectorAll('button')); var c = btns.find(b => b.textContent.trim() === 'Connect'); if(c) c.click(); })() `);
await wait(2000);
process.exit(0);
