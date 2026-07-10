import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

// Try to find the nav links available to a logged-in member
await client.Page.navigate({ url: 'https://console.ovtlyr.com/dashboard/SPY' });
await wait(6000);

// Extract all nav links
const navLinks = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('a, [href]')).filter(el => {
    const h = el.href || el.getAttribute('href') || '';
    return h.includes('ovtlyr.com') && el.getBoundingClientRect().width > 0;
  }).map(el => ({ text: el.innerText?.trim().substring(0,40), href: el.href || el.getAttribute('href') }))
  .filter(e => e.text && e.href).slice(0,50))`,
  returnByValue: true,
});
const links = JSON.parse(navLinks.result.value);
console.log('=== ALL NAVIGATION LINKS ===');
links.forEach(l => console.log(`  "${l.text}" → ${l.href}`));

// Navigate to coverage list (where stocks/ETFs live)
await client.Page.navigate({ url: 'https://console.ovtlyr.com/coverage' });
await wait(6000);
const coverage = await client.Runtime.evaluate({
  expression: `JSON.stringify({ url: window.location.href, text: document.body?.innerText?.substring(0, 3000) })`,
  returnByValue: true,
});
const covData = JSON.parse(coverage.result.value);
console.log('\n=== COVERAGE PAGE ===\n');
console.log(covData.text);

await client.close();
process.exit(0);
