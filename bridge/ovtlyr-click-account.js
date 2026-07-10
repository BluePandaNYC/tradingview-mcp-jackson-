import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const googleTarget = targets.find(t => t.type === 'page' && /accounts\.google\.com/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: googleTarget.id });
await client.Runtime.enable();
await client.Page.enable();

// Click the Yafa / yafashriki account
const clicked = await client.Runtime.evaluate({
  expression: `(function(){
    var all = Array.from(document.querySelectorAll('*'));
    // Look for the account list item containing yafashriki
    var el = all.find(e => e.innerText && e.innerText.includes('yafashriki@gmail.com') && e.children.length < 5);
    if (!el) {
      // Try clicking any list item that is an account chooser
      el = document.querySelector('[data-authuser]') || document.querySelector('li[data-identifier]') || document.querySelector('[jsname="UmAof"]');
    }
    if (el) { el.click(); return 'Clicked: ' + el.innerText?.trim().substring(0,60); }
    // Try finding by email text
    var divs = Array.from(document.querySelectorAll('div[role="link"], li, [tabindex="0"]'));
    var accountDiv = divs.find(d => d.innerText?.includes('yafashriki'));
    if (accountDiv) { accountDiv.click(); return 'Clicked account div: ' + accountDiv.innerText?.substring(0,60); }
    return 'Not found — visible text: ' + document.body.innerText.substring(0,200);
  })()`,
  returnByValue: true,
});
console.log('Click result:', clicked.result.value);
await wait(6000);

// Check where we ended up
const allTargets2 = await (await fetch('http://localhost:9222/json/list')).json();
console.log('\nAll tabs after login:');
allTargets2.forEach(t => console.log(`  ${t.url.substring(0,80)}`));

await client.close();
process.exit(0);
