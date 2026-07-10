import { getClient, evaluateAsync } from '../src/connection.js';
const client = await getClient();
const result = await evaluateAsync(`JSON.stringify({ url: window.location.href, title: document.title })`);
console.log('Current page:', result);
process.exit(0);
