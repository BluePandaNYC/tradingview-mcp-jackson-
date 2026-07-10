import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Click the "log in" link on the "Chart Not Found" page
const clicked = await evaluate(`
  (function(){
    var links = Array.from(document.querySelectorAll('a'));
    var login = links.find(a => /log.?in/i.test(a.textContent));
    if (!login) return 'not found';
    login.click();
    return 'clicked: ' + login.href;
  })()
`);
console.log(clicked);
await wait(2500);

// Fill email
const inputs = JSON.parse(await evaluate(`
  JSON.stringify(Array.from(document.querySelectorAll('input')).filter(i => i.getBoundingClientRect().width > 0).map(i => ({ type:i.type, name:i.name })))
`));
console.log('Inputs visible:', inputs);

process.exit(0);
