import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

await client.Page.navigate({ url: 'https://console.ovtlyr.com/training-tutorials' });
await wait(6000);

// Get full content
const full = await client.Runtime.evaluate({
  expression: `document.body?.innerText`,
  returnByValue: true,
});
const text = full.result.value;

// Find playlist sections - get all video titles
console.log('=== FULL TRAINING TUTORIALS CONTENT ===\n');
console.log(text.substring(0, 12000));

await client.close();
process.exit(0);
