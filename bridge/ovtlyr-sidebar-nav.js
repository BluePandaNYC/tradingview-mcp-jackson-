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

// Find sidebar section headers with their positions
const sidebarEls = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('*')).filter(el => {
    const t = el.innerText?.trim();
    const r = el.getBoundingClientRect();
    return t && r.width > 0 && r.width < 300 && r.height > 0 && r.height < 50 && r.x < 300 && (
      t === 'Building Your Plan' || t === 'Ovtlyr Plans' ||
      t === 'Application Interface' || t === 'Options Contracts' ||
      t === 'Charting' || t === 'Trading Psychology' || t === 'Theory and Emotion'
    ) && el.children.length < 5;
  }).map(el => ({
    text: el.innerText?.trim(),
    tag: el.tagName,
    x: Math.round(el.getBoundingClientRect().x),
    y: Math.round(el.getBoundingClientRect().y),
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height),
    class: el.className?.substring(0,50)
  })))`,
  returnByValue: true,
});
const els = JSON.parse(sidebarEls.result.value);
console.log('Sidebar elements:');
els.forEach((e,i) => console.log(`  ${i}: [${e.tag}] "${e.text}" at (${e.x},${e.y}) ${e.w}x${e.h}`));

// Click each sidebar section and capture content
const sectionsToClick = ['Ovtlyr Plans', 'Building Your Plan', 'Options Contracts', 'Charting', 'Application Interface'];

for (const section of sectionsToClick) {
  const el = els.find(e => e.text === section);
  if (!el) { console.log(`\n"${section}" not found`); continue; }

  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
  await wait(3000);

  // Get main content
  const content = await client.Runtime.evaluate({
    expression: `(function(){
      var main = document.querySelector('.playlist_211, .playlist_21, main, [class*="content"]');
      return main?.innerText?.substring(0, 5000) || document.body.innerText.substring(0, 5000);
    })()`,
    returnByValue: true,
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`SECTION: ${section}`);
  console.log(`${'='.repeat(60)}`);
  console.log(content.result.value.substring(400, 5000));
}

await client.close();
process.exit(0);
