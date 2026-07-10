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

// Find and list all playlist elements with their positions
const playlistEls = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('*')).filter(el => {
    const t = el.innerText?.trim();
    const r = el.getBoundingClientRect();
    return t && r.width > 0 && r.height > 0 && r.height < 40 && el.children.length === 0 && (
      t.includes('Alpha') || t.includes('Bravo') || t.includes('Championship') ||
      t.includes('Options') || t.includes('Building') || t.includes('Plans') ||
      t.includes('Guidance') || t.includes('thinkorswim') || t.includes('Psychology') || t.includes('Retired')
    );
  }).map(el => ({
    text: el.innerText?.trim(),
    x: Math.round(el.getBoundingClientRect().x),
    y: Math.round(el.getBoundingClientRect().y),
    tag: el.tagName,
    class: el.className?.substring(0,50)
  })))`,
  returnByValue: true,
});
const els = JSON.parse(playlistEls.result.value);
console.log('Playlist elements found:');
els.forEach((e,i) => console.log(`  ${i}: [${e.tag}] "${e.text}" at (${e.x},${e.y}) class="${e.class}"`));

// Click each one and capture results
const playlistNames = [...new Set(els.map(e => e.text))];
console.log('\nUnique playlists:', playlistNames);

for (const name of playlistNames.slice(0, 8)) {
  const el = els.find(e => e.text === name);
  if (!el) continue;

  // Mouse click
  await client.Input.dispatchMouseEvent({ type: 'mouseMoved', x: el.x + 5, y: el.y + 5 });
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: el.x + 5, y: el.y + 5, button: 'left', clickCount: 1 });
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: el.x + 5, y: el.y + 5, button: 'left', clickCount: 1 });
  await wait(3000);

  const content = await client.Runtime.evaluate({
    expression: `document.body?.innerText?.substring(500, 5000)`,
    returnByValue: true,
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`PLAYLIST: ${name}`);
  console.log(`${'='.repeat(50)}`);
  console.log(content.result.value);
}

await client.close();
process.exit(0);
