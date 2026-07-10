import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const challengeTarget = targets.find(t => t.type === 'page' && /google\.com/i.test(t.url));
if (!challengeTarget) {
  console.log('No Google tab found. Tabs:', targets.map(t=>t.url.substring(0,80)));
  process.exit(0);
}

const client = await CDP({ host: 'localhost', port: 9222, target: challengeTarget.id });
await client.Runtime.enable();
await wait(3000);

const state = await client.Runtime.evaluate({
  expression: `JSON.stringify({ url: window.location.href, title: document.title, text: document.body?.innerText?.substring(0,600) })`,
  returnByValue: true,
});
const s = JSON.parse(state.result.value);
console.log('URL:', s.url);
console.log('Title:', s.title);
console.log('Content:\n', s.text);

await client.close();
process.exit(0);
