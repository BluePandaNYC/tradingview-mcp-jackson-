import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const ovtlyrTarget = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));

if (!ovtlyrTarget) {
  console.log('No OVTLYR tab found');
  process.exit(1);
}

const client = await CDP({ host: 'localhost', port: 9222, target: ovtlyrTarget.id });
await client.Runtime.enable();
await client.Page.enable();

// Click "Login with Google"
const clicked = await client.Runtime.evaluate({
  expression: `(function(){
    var btns = Array.from(document.querySelectorAll('button, a, div'));
    var google = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('google'));
    if (google) { google.click(); return 'Clicked: ' + google.innerText.trim(); }
    return 'Google button not found. Buttons: ' + btns.slice(0,10).map(b=>b.innerText.trim()).filter(Boolean).join(' | ');
  })()`,
  returnByValue: true,
});
console.log(clicked.result.value);
await wait(4000);

// Check where we are now
const url = await client.Runtime.evaluate({
  expression: `window.location.href`,
  returnByValue: true,
});
console.log('After click URL:', url.result.value);

await client.close();
process.exit(0);
