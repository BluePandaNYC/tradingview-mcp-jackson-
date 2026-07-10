import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

// Use a second connection approach - open a new target
const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

// Check the training/university page
await client.Page.navigate({ url: 'https://console.ovtlyr.com/training' });
await wait(6000);

const training = await client.Runtime.evaluate({
  expression: `JSON.stringify({ url: window.location.href, text: document.body?.innerText?.substring(0, 5000) })`,
  returnByValue: true,
});
const trainingData = JSON.parse(training.result.value);
console.log('=== TRAINING PAGE ===\n');
console.log(trainingData.text);

await client.close();
process.exit(0);
