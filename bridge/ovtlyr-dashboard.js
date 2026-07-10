import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
console.log('All tabs:');
targets.forEach(t => console.log(`  ${t.url.substring(0, 100)}`));

const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
if (!ovtlyrTarget) {
  console.log('\nNo OVTLYR tab yet — navigating...');
  process.exit(0);
}

const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();
await wait(5000);

const state = await client.Runtime.evaluate({
  expression: `JSON.stringify({ url: window.location.href, title: document.title, text: document.body?.innerText?.substring(0, 5000) })`,
  returnByValue: true,
});
const s = JSON.parse(state.result.value);
console.log('\nURL:', s.url);
console.log('Title:', s.title);
console.log('\n=== CONTENT ===\n');
console.log(s.text);

await client.close();
process.exit(0);
