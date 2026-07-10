import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

// Navigate to QQQ dashboard to see Nine for Nasdaq
await client.Page.navigate({ url: 'https://console.ovtlyr.com/dashboard/QQQ' });
await wait(8000);

const qqq = await client.Runtime.evaluate({
  expression: `JSON.stringify({ url: window.location.href, text: document.body?.innerText?.substring(0, 4000) })`,
  returnByValue: true,
});
const qqqData = JSON.parse(qqq.result.value);
console.log('=== QQQ DASHBOARD ===\n');
console.log(qqqData.text);

// Now go to market breadth
await client.Page.navigate({ url: 'https://console.ovtlyr.com/market-breadth' });
await wait(8000);

const breadth = await client.Runtime.evaluate({
  expression: `JSON.stringify({ url: window.location.href, text: document.body?.innerText?.substring(0, 4000) })`,
  returnByValue: true,
});
const breadthData = JSON.parse(breadth.result.value);
console.log('\n=== MARKET BREADTH ===\n');
console.log(breadthData.text);

await client.close();
process.exit(0);
