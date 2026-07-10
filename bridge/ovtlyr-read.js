import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

// Find the OVTLYR tab directly
const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
console.log('All open tabs:');
targets.forEach(t => console.log(`  [${t.type}] ${t.url.substring(0, 80)}`));

const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
if (!ovtlyrTarget) {
  console.log('\nNo OVTLYR tab found. Open tabs listed above.');
  process.exit(1);
}

console.log('\nConnecting to:', ovtlyrTarget.url);
const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

// Wait for page to fully load
await wait(8000);

const result = await client.Runtime.evaluate({
  expression: `JSON.stringify({
    url: window.location.href,
    title: document.title,
    text: document.body.innerText.substring(0, 4000)
  })`,
  returnByValue: true,
  awaitPromise: false,
});

const data = JSON.parse(result.result.value);
console.log('\nURL:', data.url);
console.log('Title:', data.title);
console.log('\n=== OVTLYR PAGE CONTENT ===\n');
console.log(data.text);

await client.close();
process.exit(0);
