import { evaluateAsync } from '../src/connection.js';

const list = await evaluateAsync(`
  fetch('https://pricealerts.tradingview.com/list_alerts', { credentials: 'include' })
    .then(r => r.json())
`);

console.log('Total alerts:', list.r?.length);
console.log('\n=== OUR 8 WEBHOOK ALERTS ===\n');

const ourAlerts = (list.r || []).filter(a => a.web_hook === 'https://150.136.121.101.nip.io/api/webhook/signal');

ourAlerts.forEach(a => {
  const cond = a.conditions?.[0] || a.condition;
  const condId = cond?.alert_cond_id || cond?.type;
  const msg = a.message;
  const toDate = t => { try { return t ? new Date(Number(t) * 1000).toISOString() : 'never'; } catch(e) { return String(t); } };
  const lastFire = toDate(a.last_fire_time);
  const lastBar  = toDate(a.last_fire_bar_time);
  const active = a.active;
  const lastErr = a.last_error || a.last_stop_reason || 'none';

  console.log(`Signal: ${msg}`);
  console.log(`  condId:     ${condId}`);
  console.log(`  active:     ${active}`);
  console.log(`  last fire:  ${lastFire}`);
  console.log(`  last bar:   ${lastBar}`);
  console.log(`  last error: ${lastErr}`);
  console.log();
});

if (ourAlerts.length === 0) {
  console.log('No webhook alerts found — listing all alerts:');
  list.r?.forEach(a => console.log(`  id=${a.alert_id} msg="${a.message}" hook=${a.web_hook} active=${a.active} lastFire=${a.last_fire_time ? new Date(a.last_fire_time*1000).toISOString() : 'never'}`));
}

process.exit(0);
