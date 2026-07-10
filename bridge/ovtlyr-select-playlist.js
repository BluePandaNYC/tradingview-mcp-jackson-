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

// Find all SELECT elements and their options
const selects = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('select')).map(sel => ({
    id: sel.id,
    name: sel.name,
    class: sel.className?.substring(0,50),
    options: Array.from(sel.options).map(o => ({ value: o.value, text: o.text.trim() }))
  })))`,
  returnByValue: true,
});
const selectData = JSON.parse(selects.result.value);
console.log('SELECT elements found:');
selectData.forEach((s,i) => {
  console.log(`  ${i}: id="${s.id}" name="${s.name}" class="${s.class}"`);
  s.options.forEach(o => console.log(`      option value="${o.value}": "${o.text}"`));
});

// For each playlist of interest, set the select value and capture the results
const playlistsToRead = [
  'Ovtlyr University - Bravo',
  'OVTLYR Training',
  '2026 US Investing Championship Trades',
  'Options Trading',
  'Ovtlyr thinkorswim',
  'Stock and Options Trading Guidance',
  'Building Your Plan',
];

// Find the playlist select
const playlistSelectIdx = selectData.findIndex(s => s.options.some(o => o.text.includes('Bravo')));
console.log(`\nPlaylist select index: ${playlistSelectIdx}`);

if (playlistSelectIdx === -1) {
  console.log('No playlist select found');
  process.exit(0);
}

for (const playlist of playlistsToRead) {
  const sel = selectData[playlistSelectIdx];
  const opt = sel.options.find(o => o.text === playlist || o.value === playlist);
  if (!opt) { console.log(`\nPlaylist "${playlist}" not found in options`); continue; }

  // Set the select value
  await client.Runtime.evaluate({
    expression: `(function(){
      var selects = document.querySelectorAll('select');
      var sel = selects[${playlistSelectIdx}];
      if (!sel) return 'no select';
      sel.value = '${opt.value}';
      sel.dispatchEvent(new Event('change', {bubbles:true}));
      sel.dispatchEvent(new Event('input', {bubbles:true}));
      return 'set to: ' + sel.value;
    })()`,
    returnByValue: true,
  });

  await wait(3000);

  const content = await client.Runtime.evaluate({
    expression: `document.body?.innerText?.substring(600, 8000)`,
    returnByValue: true,
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`PLAYLIST: ${playlist}`);
  console.log(`${'='.repeat(60)}`);
  console.log(content.result.value);
}

await client.close();
process.exit(0);
