import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

// Inspect all clickable elements
const elements = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('button, a, [role="button"]')).map(el => ({
    tag: el.tagName,
    text: el.innerText?.trim().substring(0,50),
    href: el.href || '',
    class: el.className?.substring(0,50)
  })).filter(e => e.text))`,
  returnByValue: true,
});
const els = JSON.parse(elements.result.value);
console.log('Clickable elements:');
els.forEach((e,i) => console.log(`  ${i}: [${e.tag}] "${e.text}" href="${e.href.substring(0,60)}" class="${e.class}"`));

await client.close();
process.exit(0);
