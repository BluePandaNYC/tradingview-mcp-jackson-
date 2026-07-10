import CDP from 'chrome-remote-interface';
const wait = ms => new Promise(r => setTimeout(r, ms));

const resp = await fetch('http://localhost:9222/json/list');
const targets = await resp.json();
const target = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url)) || targets.find(t => t.type === 'page');

const client = await CDP({ host: 'localhost', port: 9222, target: target.id });
await client.Runtime.enable();
await client.Page.enable();

// Navigate to OVTLYR login
await client.Page.navigate({ url: 'https://console.ovtlyr.com/login?isLogin=1' });
await wait(3000);

// Fill in email
await client.Runtime.evaluate({
  expression: `(function(){
    var emailInput = document.querySelector('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="Email" i]');
    if (emailInput) {
      emailInput.focus();
      emailInput.value = 'yafashriki@gmail.com';
      emailInput.dispatchEvent(new Event('input', {bubbles:true}));
      emailInput.dispatchEvent(new Event('change', {bubbles:true}));
      return 'Email filled';
    }
    return 'No email input found';
  })()`,
  returnByValue: true,
});

console.log('=== ACTION REQUIRED ===');
console.log('');
console.log('The Chrome browser window is showing the OVTLYR login page.');
console.log('Email is pre-filled with: yafashriki@gmail.com');
console.log('');
console.log('Please:');
console.log('1. Click on the Password field in the Chrome window');
console.log('2. Type your OVTLYR password');
console.log('3. Click Log In');
console.log('4. Tell me when you are logged in');

await client.close();
process.exit(0);
