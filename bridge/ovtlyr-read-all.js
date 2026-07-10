import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

const pages = [
  { name: 'PLATFORM TRAINING', url: 'https://console.ovtlyr.com/platform-training' },
  { name: 'TRAINING TUTORIALS', url: 'https://console.ovtlyr.com/training-tutorials' },
  { name: 'DOCUMENTATION', url: 'https://console.ovtlyr.com/documentation' },
  { name: 'SECTOR INTELLIGENCE', url: 'https://console.ovtlyr.com/sector-intelligence-map' },
  { name: 'STOCKS-ETFS SCREENER', url: 'https://console.ovtlyr.com/stocks-etfs' },
];

for (const page of pages) {
  await client.Page.navigate({ url: page.url });
  await wait(6000);
  const content = await client.Runtime.evaluate({
    expression: `JSON.stringify({ url: window.location.href, text: document.body?.innerText?.substring(0, 4000) })`,
    returnByValue: true,
  });
  const data = JSON.parse(content.result.value);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`=== ${page.name} ===`);
  console.log(`URL: ${data.url}`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(data.text);
}

await client.close();
process.exit(0);
