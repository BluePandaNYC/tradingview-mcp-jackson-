import { getClient, evaluateAsync } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Wait for dynamic content to load
await wait(8000);

const data = await evaluateAsync(`JSON.stringify({
  url: window.location.href,
  title: document.title,
  fullText: document.body.innerText.substring(0, 3000)
})`);

const parsed = JSON.parse(data);
console.log('URL:', parsed.url);
console.log('Title:', parsed.title);
console.log('\n=== PAGE CONTENT ===\n');
console.log(parsed.fullText);
process.exit(0);
