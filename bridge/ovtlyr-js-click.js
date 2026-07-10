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

// Click "Ovtlyr Plans" section using JS click
const clickResult = await client.Runtime.evaluate({
  expression: `(function(){
    var btns = Array.from(document.querySelectorAll('button.nav-link, button.lnk_globaltopicid, button[class*="lnk_global"]'));
    console.log('Found nav buttons:', btns.length, btns.map(b=>b.innerText?.trim().substring(0,30)));
    var plans = btns.find(b => b.innerText?.includes('Ovtlyr Plans'));
    if (plans) {
      plans.click();
      return 'clicked Ovtlyr Plans';
    }
    // Try all buttons with the accordion class
    var all = Array.from(document.querySelectorAll('button'));
    var plansBtn = all.find(b => b.innerText?.includes('Plans') && !b.innerText.includes('Plan '));
    if (plansBtn) { plansBtn.click(); return 'clicked via all: ' + plansBtn.innerText?.trim().substring(0,40); }
    return 'not found. Available: ' + all.slice(0,10).map(b=>b.innerText?.trim().substring(0,30)).join(' | ');
  })()`,
  returnByValue: true,
});
console.log('Click result:', clickResult.result.value);
await wait(2000);

// Now check what sub-items are visible
const afterClick = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('button')).filter(el => {
    const r = el.getBoundingClientRect();
    return r.x < 300 && r.width > 0;
  }).map(el => ({
    text: el.innerText?.trim().substring(0,50),
    y: Math.round(el.getBoundingClientRect().y),
    class: el.className?.substring(0,40)
  })).sort((a,b) => a.y - b.y))`,
  returnByValue: true,
});
const btns = JSON.parse(afterClick.result.value);
console.log('\nSidebar buttons after click:');
btns.forEach(b => console.log(`  y=${b.y} "${b.text}" class="${b.class}"`));

// Click each sub-item under Plans
const planSubItems = btns.filter(b => !b.class.includes('lnk_globaltopicid') && !b.text.includes('keyboard') && !b.text.includes('help') && b.text !== 'Theory and Emotion' && b.text !== 'Fundamentals' && b.text !== 'Books');
console.log('\nPlan sub-items found:', planSubItems.map(i => i.text));

for (const item of planSubItems) {
  await client.Runtime.evaluate({
    expression: `(function(){
      var btns = Array.from(document.querySelectorAll('button'));
      var btn = btns.find(b => b.innerText?.trim() === '${item.text}' && b.getBoundingClientRect().x < 300);
      if (btn) { btn.click(); return 'clicked: ' + btn.innerText?.trim(); }
      return 'not found: ${item.text}';
    })()`,
    returnByValue: true,
  });
  await wait(3000);

  const content = await client.Runtime.evaluate({
    expression: `document.body.innerText.substring(600, 6000)`,
    returnByValue: true,
  });
  console.log(`\n=== Plans Sub-topic: "${item.text}" ===`);
  console.log(content.result.value);
}

await client.close();
process.exit(0);
