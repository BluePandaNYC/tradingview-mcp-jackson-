import { getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();
await client.Page.navigate({ url: 'https://www.tradingview.com/#signin' });
await wait(3000);
console.log('Navigated to sign-in page');
process.exit(0);
