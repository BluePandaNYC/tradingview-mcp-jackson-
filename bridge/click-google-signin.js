import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

const result = await evaluate(`
  (function(){
    var btns = Array.from(document.querySelectorAll('button, [role="button"], a'));
    var google = btns.find(b => b.textContent.includes('yafashriki') || b.textContent.includes('Continue as'));
    if (!google) return 'not found';
    var r = google.getBoundingClientRect();
    google.click();
    return 'clicked: ' + google.textContent.trim().substring(0,50);
  })()
`);
console.log(result);
await wait(4000);

// Check auth
const auth = await evaluate(`fetch('https://pricealerts.tradingview.com/list_alerts',{credentials:'include'}).then(r=>r.json()).then(r=>r.s+' '+r.r?.length).catch(e=>e.message)`);
console.log('Auth check:', auth);
process.exit(0);
