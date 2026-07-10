import { getClient } from '../src/connection.js';
const client = await getClient();

// List all CDP targets
const targets = await client.Target.getTargets();
console.log('All targets:');
targets.targetInfos.forEach(t => {
  console.log(`  [${t.type}] "${t.title?.substring(0,50)}" url=${t.url?.substring(0,60)}`);
});

// Also check cookies directly via CDP
const cookies = await client.Network.getAllCookies();
const tvCookies = cookies.cookies.filter(c => c.domain.includes('tradingview'));
console.log(`\nTradingView cookies (${tvCookies.length}):`);
tvCookies.forEach(c => console.log(`  ${c.name}=${c.value.substring(0,20)}... domain=${c.domain}`));

process.exit(0);
