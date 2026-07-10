import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

// Navigate directly to Google login URL
await client.Page.navigate({ url: 'https://console.ovtlyr.com/googlelogin?isGLogin=1' });
console.log('Navigating to Google login...');
await wait(5000);

const state = await client.Runtime.evaluate({
  expression: `JSON.stringify({ url: window.location.href, title: document.title, snippet: document.body?.innerText?.substring(0,300) })`,
  returnByValue: true,
});
const s = JSON.parse(state.result.value);
console.log('URL:', s.url);
console.log('Title:', s.title);
console.log('Content:', s.snippet);

await client.close();
process.exit(0);
