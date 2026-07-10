import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const googleTarget = targets.find(t => t.type === 'page' && /accounts\.google\.com/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: googleTarget.id });
await client.Runtime.enable();
await client.Page.enable();

// Click the role=link div containing the account
const result = await client.Runtime.evaluate({
  expression: `(function(){
    var links = Array.from(document.querySelectorAll('[role="link"]'));
    var acc = links.find(el => el.innerText?.includes('yafashriki'));
    if (acc) {
      acc.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
      return 'Dispatched click on: ' + acc.innerText?.trim().substring(0,50);
    }
    return 'Not found';
  })()`,
  returnByValue: true,
});
console.log(result.result.value);
await wait(8000);

// Check all tabs
const allTargets = await (await fetch('http://localhost:9222/json/list')).json();
console.log('\nAll tabs now:');
allTargets.forEach(t => console.log(`  ${t.url.substring(0,100)}`));

await client.close();
process.exit(0);
