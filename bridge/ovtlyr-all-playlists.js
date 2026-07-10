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

// Click each playlist and extract video titles
const playlists = [
  'Ovtlyr University - Alpha',
  'Ovtlyr University - Bravo',
  'OVTLYR Plans',
  '2026 US Investing Championship Trades',
  'Options Trading',
  'Building Your Plan',
];

for (const playlist of playlists) {
  // Click on the playlist
  const clicked = await client.Runtime.evaluate({
    expression: `(function(){
      var els = Array.from(document.querySelectorAll('*'));
      var el = els.find(e => e.innerText?.trim() === '${playlist}' && e.getBoundingClientRect().width > 0);
      if (el) { el.click(); return 'clicked'; }
      return 'not found';
    })()`,
    returnByValue: true,
  });

  if (clicked.result.value !== 'clicked') {
    console.log(`Playlist "${playlist}": NOT FOUND`);
    continue;
  }

  await wait(3000);

  // Extract all video titles visible
  const videos = await client.Runtime.evaluate({
    expression: `JSON.stringify(Array.from(document.querySelectorAll('[class*="video"], [class*="lesson"], [class*="item"], .card, article'))
      .filter(el => el.innerText?.trim() && el.getBoundingClientRect().height > 20 && el.getBoundingClientRect().height < 200)
      .map(el => el.innerText?.trim().substring(0, 100))
      .filter(t => t && t.length > 3)
      .slice(0, 50))`,
    returnByValue: true,
  });

  // Also get raw text
  const rawText = await client.Runtime.evaluate({
    expression: `document.body?.innerText?.substring(0, 8000)`,
    returnByValue: true,
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`PLAYLIST: ${playlist}`);
  console.log(`${'='.repeat(50)}`);
  console.log(rawText.result.value);
}

await client.close();
process.exit(0);
