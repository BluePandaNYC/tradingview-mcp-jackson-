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

// Playlist value map from earlier: 1=Alpha, 2=Bravo, 5=Stock&Options, 6=Options, 7=OVTLYR Training, 8=thinkorswim, 10=Championship, 11=Psychology, 12=Retired
const playlists = [
  { value: '2', name: 'Bravo University' },
  { value: '10', name: '2026 Championship' },
  { value: '7', name: 'OVTLYR Training' },
  { value: '6', name: 'Options Trading' },
  { value: '5', name: 'Stock & Options Guidance' },
];

for (const pl of playlists) {
  // Use React nativeInputValueSetter trick
  await client.Runtime.evaluate({
    expression: `(function(){
      var sel = document.getElementById('playlistDropdown');
      if (!sel) return 'no select';
      var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      nativeSetter.call(sel, '${pl.value}');
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return 'set to ' + sel.value + ' = ' + sel.options[sel.selectedIndex]?.text;
    })()`,
    returnByValue: true,
  }).then(r => console.log(`Set result for ${pl.name}:`, r.result.value));

  await wait(4000);

  // Extract video list - look for all video card titles
  const videos = await client.Runtime.evaluate({
    expression: `(function(){
      // Get all video entries - look for elements with playlist prefix patterns
      var spans = Array.from(document.querySelectorAll('span, a, h3, h4, p'));
      var videoTitles = [];
      spans.forEach(el => {
        const t = el.innerText?.trim();
        const r = el.getBoundingClientRect();
        if (t && r.width > 0 && r.height > 0 && r.height < 50 &&
            (t.match(/^(AlphaU|BravoU|OvtlyrU|OVTLYR|Champ|Plan|Option|Stock|Swing|Income|TQQQ|QQQ|ETF|SPY|Trade|Signal|How to|What|Why|When)/i) ||
             t.match(/^[A-Z][a-z]+ (trade|entry|exit|plan|signal|strategy)/i))) {
          videoTitles.push(t.substring(0,100));
        }
      });
      // Also grab entire main content area text
      var mainContent = document.querySelector('.playlist_211, .playlist_21, .tab-content, main');
      return JSON.stringify({
        titles: [...new Set(videoTitles)].slice(0,50),
        mainText: mainContent?.innerText?.substring(0, 6000) || document.body.innerText.substring(600, 6000)
      });
    })()`,
    returnByValue: true,
  });

  const data = JSON.parse(videos.result.value);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PLAYLIST: ${pl.name} (value=${pl.value})`);
  console.log(`${'='.repeat(60)}`);
  console.log(data.mainText);
}

await client.close();
process.exit(0);
