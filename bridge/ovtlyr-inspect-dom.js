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

// Find ALL elements containing "Bravo" anywhere
const bravoEls = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('*')).filter(el => {
    return el.innerText?.includes('Bravo') && el.children.length < 10;
  }).map(el => ({
    tag: el.tagName,
    text: el.innerText?.trim().substring(0,60),
    x: Math.round(el.getBoundingClientRect().x),
    y: Math.round(el.getBoundingClientRect().y),
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height),
    visible: el.getBoundingClientRect().width > 0,
    class: el.className?.substring(0,60)
  })).slice(0,20))`,
  returnByValue: true,
});
const els = JSON.parse(bravoEls.result.value);
console.log('Elements containing "Bravo":');
els.forEach((e,i) => console.log(`  ${i}: [${e.tag}] visible=${e.visible} "${e.text}" at (${e.x},${e.y}) ${e.w}x${e.h} class="${e.class}"`));

// Get ALL visible text on page grouped by y position to understand layout
const layout = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('p, span, div, li, a, button, h1, h2, h3, h4, label')).filter(el => {
    const r = el.getBoundingClientRect();
    const t = el.childElementCount === 0 && el.innerText?.trim();
    return t && r.width > 0 && r.height > 0 && r.height < 50 && r.y < 500;
  }).map(el => ({
    text: el.innerText?.trim().substring(0,50),
    x: Math.round(el.getBoundingClientRect().x),
    y: Math.round(el.getBoundingClientRect().y),
    tag: el.tagName
  })).sort((a,b) => a.y - b.y).slice(0,60))`,
  returnByValue: true,
});
const layoutEls = JSON.parse(layout.result.value);
console.log('\nVisible elements in top 500px:');
layoutEls.forEach(e => console.log(`  y=${e.y} x=${e.x} [${e.tag}] "${e.text}"`));

await client.close();
process.exit(0);
