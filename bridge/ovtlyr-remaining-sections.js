import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

await client.Page.navigate({ url: 'https://console.ovtlyr.com/training-tutorials' });
await wait(5000);

// Helper: click a top-level section by name using JS .click()
async function clickSection(name) {
  const result = await client.Runtime.evaluate({
    expression: `(function(){
      var btns = Array.from(document.querySelectorAll('button'));
      var btn = btns.find(b => b.innerText?.includes('${name}') && b.className?.includes('lnk_globaltopicid'));
      if (btn) { btn.click(); return 'clicked ' + btn.innerText?.trim().substring(0,40); }
      return 'not found: ${name}';
    })()`,
    returnByValue: true,
  });
  console.log('Section click:', result.result.value);
  await wait(3000);
}

// Helper: get sub-items for a section (non-lnk_globaltopicid buttons in sidebar)
async function getSubItems() {
  const r = await client.Runtime.evaluate({
    expression: `JSON.stringify(Array.from(document.querySelectorAll('button')).filter(el => {
      const rect = el.getBoundingClientRect();
      const cls = el.className || '';
      const txt = el.innerText?.trim();
      return rect.x < 300 && rect.width > 0 && txt && !cls.includes('lnk_globaltopicid') && !txt.includes('keyboard') && !txt.includes('help');
    }).map(el => ({ text: el.innerText?.trim(), y: Math.round(el.getBoundingClientRect().y) })).sort((a,b)=>a.y-b.y))`,
    returnByValue: true,
  });
  return JSON.parse(r.result.value);
}

// Helper: click sub-item by name
async function clickSubItem(name) {
  const result = await client.Runtime.evaluate({
    expression: `(function(){
      var btns = Array.from(document.querySelectorAll('button'));
      var btn = btns.find(b => b.innerText?.trim() === '${name}' && b.getBoundingClientRect().x < 300);
      if (btn) { btn.click(); return 'clicked: ' + btn.innerText?.trim(); }
      return 'not found: ${name}';
    })()`,
    returnByValue: true,
  });
  console.log('Sub-item click:', result.result.value);
  await wait(3000);
}

// Helper: read current video list
async function readContent() {
  const r = await client.Runtime.evaluate({
    expression: `document.body.innerText.substring(500, 8000)`,
    returnByValue: true,
  });
  return r.result.value;
}

// ======= SECTION: Options Contracts =======
console.log('\n' + '='.repeat(60));
console.log('SECTION: Options Contracts');
console.log('='.repeat(60));
await clickSection('Options Contracts');

const optSubItems = await getSubItems();
console.log('Sub-items:', optSubItems.map(i => i.text));

for (const item of optSubItems) {
  await clickSubItem(item.text);
  const content = await readContent();
  console.log(`\n--- Sub-topic: "${item.text}" ---`);
  console.log(content);
}

// ======= SECTION: Charting =======
console.log('\n' + '='.repeat(60));
console.log('SECTION: Charting');
console.log('='.repeat(60));
await clickSection('Charting');
await wait(1000);

const chartSubItems = await getSubItems();
console.log('Sub-items:', chartSubItems.map(i => i.text));

for (const item of chartSubItems) {
  await clickSubItem(item.text);
  const content = await readContent();
  console.log(`\n--- Sub-topic: "${item.text}" ---`);
  console.log(content);
}

// ======= SECTION: Building Your Plan =======
console.log('\n' + '='.repeat(60));
console.log('SECTION: Building Your Plan');
console.log('='.repeat(60));
await clickSection('Building Your Plan');
await wait(1000);

const planSubItems = await getSubItems();
console.log('Sub-items:', planSubItems.map(i => i.text));

for (const item of planSubItems) {
  await clickSubItem(item.text);
  const content = await readContent();
  console.log(`\n--- Sub-topic: "${item.text}" ---`);
  console.log(content);
}

// ======= SECTION: Application Interface =======
console.log('\n' + '='.repeat(60));
console.log('SECTION: Application Interface');
console.log('='.repeat(60));
await clickSection('Application Interface');
await wait(1000);

const appSubItems = await getSubItems();
console.log('Sub-items:', appSubItems.map(i => i.text));

for (const item of appSubItems) {
  await clickSubItem(item.text);
  const content = await readContent();
  console.log(`\n--- Sub-topic: "${item.text}" ---`);
  console.log(content);
}

// ======= SECTION: Trading Psychology =======
console.log('\n' + '='.repeat(60));
console.log('SECTION: Trading Psychology');
console.log('='.repeat(60));
await clickSection('Trading Psychology');
await wait(1000);

const psychSubItems = await getSubItems();
console.log('Sub-items:', psychSubItems.map(i => i.text));

for (const item of psychSubItems.slice(0, 5)) {
  await clickSubItem(item.text);
  const content = await readContent();
  console.log(`\n--- Sub-topic: "${item.text}" ---`);
  console.log(content);
}

await client.close();
process.exit(0);
