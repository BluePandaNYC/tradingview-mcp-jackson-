import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

// Wait for redirect to complete
await wait(4000);

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
console.log('All tabs:');
targets.forEach(t => console.log(`  ${t.url.substring(0, 100)}`));

// Connect to whatever is there and navigate to OVTLYR dashboard
const target = targets.find(t => t.type === 'page') || targets[0];
const client = await CDP({ host: 'localhost', port: 9222, target: target.id });
await client.Runtime.enable();
await client.Page.enable();

// Navigate directly to OVTLYR dashboard
await client.Page.navigate({ url: 'https://console.ovtlyr.com/dashboard/SPY' });
console.log('\nNavigating to OVTLYR dashboard...');
await wait(8000);

const state = await client.Runtime.evaluate({
  expression: `JSON.stringify({ url: window.location.href, title: document.title, text: document.body?.innerText?.substring(0, 5000) })`,
  returnByValue: true,
});
const s = JSON.parse(state.result.value);
console.log('URL:', s.url);
console.log('Title:', s.title);
console.log('\n=== CONTENT ===\n');
console.log(s.text);

await client.close();
process.exit(0);
