import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

await client.Page.navigate({ url: 'https://console.ovtlyr.com/dashboard/SPY' });
await wait(7000);

// Get all unique links from sidebar/nav only
const allLinks = await client.Runtime.evaluate({
  expression: `JSON.stringify(
    [...new Set(
      Array.from(document.querySelectorAll('nav a, header a, aside a, [class*="sidebar"] a, [class*="nav"] a, [class*="menu"] a'))
        .map(a => ({ text: a.innerText?.trim().substring(0,50), href: a.href }))
        .filter(e => e.text && e.href && !e.href.includes('/dashboard/'))
    )].slice(0,40)
  )`,
  returnByValue: true,
});
const links = JSON.parse(allLinks.result.value);
console.log('=== SIDEBAR / NAV LINKS ===');
links.forEach(l => console.log(`  "${l.text}" → ${l.href}`));

// Also get all unique hrefs on the entire page that aren't stock dashboards
const allPageLinks = await client.Runtime.evaluate({
  expression: `JSON.stringify(
    [...new Set(Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.href)
      .filter(h => h.includes('console.ovtlyr.com') && !h.includes('/dashboard/') && h !== 'https://console.ovtlyr.com/dashboard/SPY')
    )].slice(0,40)
  )`,
  returnByValue: true,
});
const pageLinks = JSON.parse(allPageLinks.result.value);
console.log('\n=== ALL UNIQUE CONSOLE URLS ===');
pageLinks.forEach(l => console.log(`  ${l}`));

await client.close();
process.exit(0);
