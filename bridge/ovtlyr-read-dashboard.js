import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
console.log('All tabs:');
targets.forEach(t => console.log(`  ${t.url.substring(0, 100)}`));

const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
if (!ovtlyrTarget) { console.log('No OVTLYR tab found'); process.exit(1); }

const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();
await wait(3000);

// Navigate to dashboard if not already there
const currentUrl = (await client.Runtime.evaluate({ expression: `window.location.href`, returnByValue: true })).result.value;
console.log('Current URL:', currentUrl);

if (!currentUrl.includes('/dashboard')) {
  await client.Page.navigate({ url: 'https://console.ovtlyr.com/dashboard/SPY' });
  await wait(8000);
}

const content = await client.Runtime.evaluate({
  expression: `JSON.stringify({ url: window.location.href, title: document.title, text: document.body?.innerText?.substring(0, 6000) })`,
  returnByValue: true,
});
const data = JSON.parse(content.result.value);
console.log('\nURL:', data.url);
console.log('Title:', data.title);
console.log('\n=== DASHBOARD CONTENT ===\n');
console.log(data.text);

await client.close();
process.exit(0);
