import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const googleTarget = targets.find(t => t.type === 'page' && /accounts\.google\.com/i.test(t.url));
const client = await CDP({ host: 'localhost', port: 9222, target: googleTarget.id });
await client.Runtime.enable();

// Find all interactive elements and their bounding boxes
const items = await client.Runtime.evaluate({
  expression: `JSON.stringify(Array.from(document.querySelectorAll('li, [role="link"], [data-authuser], [tabindex]')).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && el.innerText?.trim();
  }).slice(0,20).map(el => ({
    tag: el.tagName,
    role: el.getAttribute('role'),
    tabindex: el.getAttribute('tabindex'),
    text: el.innerText?.trim().substring(0,80),
    x: Math.round(el.getBoundingClientRect().x),
    y: Math.round(el.getBoundingClientRect().y),
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height),
  })))`,
  returnByValue: true,
});
const parsed = JSON.parse(items.result.value);
console.log('Interactive elements:');
parsed.forEach((e,i) => console.log(`  ${i}: [${e.tag} role=${e.role} tab=${e.tabindex}] "${e.text.substring(0,60)}" at (${e.x},${e.y})`));

// Find the account item and click it via mouse
const accountEl = parsed.find(e => e.text.includes('yafashriki') || e.text.includes('Yafa'));
if (accountEl) {
  const cx = accountEl.x + accountEl.w / 2;
  const cy = accountEl.y + accountEl.h / 2;
  console.log(`\nClicking at (${cx}, ${cy}) for: "${accountEl.text.substring(0,50)}"`);
  await client.Input.dispatchMouseEvent({ type: 'mouseMoved', x: cx, y: cy });
  await wait(200);
  await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
  await wait(100);
  await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
  console.log('Mouse click dispatched');
} else {
  console.log('Account element not found in list above');
}

await wait(5000);
const finalUrl = await client.Runtime.evaluate({ expression: `window.location.href`, returnByValue: true });
console.log('Final URL:', finalUrl.result.value);

await client.close();
process.exit(0);
