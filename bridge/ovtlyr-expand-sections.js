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

// Section buttons at known y positions: 283=Building Your Plan, 340=Ovtlyr Plans, 397=App Interface, 454=Options Contracts, 511=Charting
const sections = [
  { name: 'Building Your Plan', y: 283 },
  { name: 'Ovtlyr Plans', y: 340 },
  { name: 'Options Contracts', y: 454 },
  { name: 'Charting', y: 511 },
];

for (const section of sections) {
  // Click the section button
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 100, y: section.y + 10, button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 100, y: section.y + 10, button: 'left', clickCount: 1 });
  await wait(2000);

  // Find newly visible sub-items (buttons in the sidebar that appeared)
  const subItems = await client.Runtime.evaluate({
    expression: `JSON.stringify(Array.from(document.querySelectorAll('button')).filter(el => {
      const r = el.getBoundingClientRect();
      const t = el.innerText?.trim();
      return t && !t.includes('keyboard_arrow') && !t.includes('help') && r.x < 300 && r.width > 0;
    }).map(el => ({
      text: el.innerText?.trim(),
      y: Math.round(el.getBoundingClientRect().y),
      class: el.className?.substring(0,40)
    })).sort((a,b) => a.y - b.y))`,
    returnByValue: true,
  });
  const items = JSON.parse(subItems.result.value);
  console.log(`\n=== ${section.name} — Sub-items: ===`);
  items.forEach(i => console.log(`  y=${i.y} "${i.text}" class="${i.class}"`));

  // Click the first sub-item that's new (below the section button)
  const newItems = items.filter(i => i.y > section.y + 30 && i.y < section.y + 150 && !i.class.includes('lnk_globaltopicid'));
  console.log(`  New sub-items to click: ${newItems.map(i=>i.text).join(', ')}`);

  for (const item of newItems.slice(0, 4)) {
    await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 100, y: item.y + 5, button: 'left', clickCount: 1 });
    await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 100, y: item.y + 5, button: 'left', clickCount: 1 });
    await wait(3000);

    const content = await client.Runtime.evaluate({
      expression: `(function(){
        var cards = Array.from(document.querySelectorAll('.card, article, [class*="video_"], [class*="lesson"]'));
        if (cards.length) return JSON.stringify(cards.slice(0,20).map(c => c.innerText?.trim().substring(0,150)));
        // Fall back to text between specific markers
        var body = document.body.innerText;
        var start = body.indexOf('instant_mix');
        return body.substring(start, start + 4000);
      })()`,
      returnByValue: true,
    });

    console.log(`\n  >> Sub-topic: "${item.text}"`);
    console.log(content.result.value.substring(0, 2000));
  }
}

await client.close();
process.exit(0);
