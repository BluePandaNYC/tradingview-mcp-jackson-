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

// Find all elements containing "Bravo" or "Championship" or "Plans"
const targets2 = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('*')).filter(el => {
    const t = el.innerText?.trim();
    const r = el.getBoundingClientRect();
    return t && r.width > 50 && r.height > 0 && r.height < 60 && (
      t === 'Ovtlyr University - Bravo' ||
      t === '2026 US Investing Championship Trades' ||
      t === 'Ovtlyr Plans' ||
      t === 'Options Trading' ||
      t === 'Building Your Plan' ||
      t === 'OVTLYR Training' ||
      t === 'Stock and Options Trading Guidance'
    );
  }).map(el => ({
    tag: el.tagName,
    text: el.innerText?.trim(),
    x: Math.round(el.getBoundingClientRect().x),
    y: Math.round(el.getBoundingClientRect().y),
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height),
    class: el.className?.substring(0,80),
    id: el.id
  })))`,
  returnByValue: true,
});
const els = JSON.parse(targets2.result.value);
console.log('Target elements:');
els.forEach((e,i) => console.log(`  ${i}: [${e.tag}] "${e.text}" at (${e.x},${e.y}) ${e.w}x${e.h} class="${e.class}"`));

// Now click the Bravo playlist chip
const bravoEl = els.find(e => e.text === 'Ovtlyr University - Bravo');
const championEl = els.find(e => e.text === '2026 US Investing Championship Trades');
const plansEl = els.find(e => e.text === 'Ovtlyr Plans' || e.text === 'OVTLYR Training');

const toClick = [bravoEl, championEl, plansEl].filter(Boolean);

for (const el of toClick) {
  console.log(`\nClicking: "${el.text}" at (${el.x + el.w/2}, ${el.y + el.h/2})`);
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
  await wait(3000);

  const content = await client.Runtime.evaluate({
    expression: `document.body?.innerText?.substring(600, 6000)`,
    returnByValue: true,
  });
  console.log('\n--- Content after click ---');
  console.log(content.result.value);
}

await client.close();
process.exit(0);
