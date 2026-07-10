import { getClient, evaluateAsync } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

await client.Page.navigate({ url: 'https://console.ovtlyr.com/dashboard/SPY' });
await wait(5000);

const info = await evaluateAsync(`JSON.stringify({
  url: window.location.href,
  title: document.title,
  loggedIn: !document.body.innerText.includes('Sign in') && !document.body.innerText.includes('Log in') && !document.body.innerText.includes('sign up'),
  bodySnippet: document.body.innerText.substring(0, 500)
})`);
console.log(info);
process.exit(0);
