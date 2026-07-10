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

// Find ALL left sidebar elements regardless of viewport visibility
const allLeft = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('button, p, h3, h4, a, li, span')).filter(el => {
    const r = el.getBoundingClientRect();
    const t = el.innerText?.trim();
    return t && t.length > 2 && t.length < 60 && r.x >= 0 && r.x < 300 && r.width > 0;
  }).map(el => ({
    text: el.innerText?.trim(),
    tag: el.tagName,
    x: Math.round(el.getBoundingClientRect().x),
    y: Math.round(el.getBoundingClientRect().y),
    class: el.className?.substring(0,40)
  })).sort((a,b) => a.y - b.y))`,
  returnByValue: true,
});
const leftEls = JSON.parse(allLeft.result.value);
console.log('Left sidebar elements (all):');
leftEls.forEach(e => console.log(`  y=${e.y} [${e.tag}] "${e.text}" class="${e.class}"`));

await client.close();
process.exit(0);
