import { getClient, evaluateAsync } from '../src/connection.js';

const client = await getClient();

// Get detailed cookie info
const { cookies } = await client.Network.getAllCookies();
const sessionCookie = cookies.find(c => c.name === 'sessionid');
console.log('sessionid expires:', sessionCookie ? new Date(sessionCookie.expires * 1000).toISOString() : 'not found');
console.log('sessionid httpOnly:', sessionCookie?.httpOnly);
console.log('sessionid secure:', sessionCookie?.secure);
console.log('sessionid domain:', sessionCookie?.domain);

// Try the TV user profile endpoint to confirm login
const userRes = await fetch('https://www.tradingview.com/api/v1/user/', {
  headers: {
    'Cookie': cookies.filter(c => c.domain.includes('tradingview')).map(c => `${c.name}=${c.value}`).join('; '),
    'Referer': 'https://www.tradingview.com/',
  },
});
console.log('\nUser API status:', userRes.status);
const userText = await userRes.text();
console.log('User API response:', userText.substring(0, 200));

// Current page URL
const url = await evaluateAsync(`window.location.href`);
console.log('\nCurrent page:', url);

process.exit(0);
