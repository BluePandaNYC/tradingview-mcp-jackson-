import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
console.log('All tabs:');
targets.forEach(t => console.log(`  ${t.url.substring(0, 100)}`));

const googleTarget = targets.find(t => t.type === 'page' && /google\.com/i.test(t.url));
if (!googleTarget) { console.log('No Google tab'); process.exit(0); }

const client = await CDP({ host: 'localhost', port: 9222, target: googleTarget.id });
await client.Runtime.enable();
await client.Page.enable();
await wait(2000);

const state = await client.Runtime.evaluate({
  expression: `JSON.stringify({ url: window.location.href, title: document.title, text: document.body?.innerText?.substring(0, 800) })`,
  returnByValue: true,
});
const s = JSON.parse(state.result.value);
console.log('\nURL:', s.url);
console.log('Content:', s.text);

// Try clicking any Continue/Allow/Next button
const clicked = await client.Runtime.evaluate({
  expression: `(function(){
    var btns = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'));
    var allow = btns.find(b => /continue|allow|next|confirm|yes/i.test(b.innerText || b.value));
    if (allow) { allow.click(); return 'Clicked: ' + (allow.innerText || allow.value); }
    return 'No continue button found. Buttons: ' + btns.map(b => b.innerText || b.value).filter(Boolean).join(' | ');
  })()`,
  returnByValue: true,
});
console.log('\nButton click result:', clicked.result.value);
await wait(5000);

const finalUrl = await client.Runtime.evaluate({ expression: `window.location.href`, returnByValue: true });
console.log('Final URL:', finalUrl.result.value);

await client.close();
process.exit(0);
