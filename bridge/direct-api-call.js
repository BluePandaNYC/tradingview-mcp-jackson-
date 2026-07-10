/**
 * Makes the create_alert API call directly from Node.js using CDP cookies.
 * Bypasses browser CORS entirely.
 */
import { getClient } from '../src/connection.js';

const client = await getClient();

// Get all cookies via CDP
const { cookies } = await client.Network.getAllCookies();
const tvCookies = cookies.filter(c => c.domain.includes('tradingview'));

// Build cookie header string
const cookieHeader = tvCookies.map(c => `${c.name}=${c.value}`).join('; ');
console.log('Cookie count:', tvCookies.length);
console.log('Has sessionid:', tvCookies.some(c => c.name === 'sessionid'));

// Test: list_alerts via Node.js fetch (no CORS restriction)
const listRes = await fetch('https://pricealerts.tradingview.com/list_alerts', {
  method: 'GET',
  headers: {
    'Cookie': cookieHeader,
    'Referer': 'https://www.tradingview.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'Origin': 'https://www.tradingview.com',
  },
});
const listData = await listRes.json();
console.log('\nlist_alerts via Node.js:', listData?.s, 'count:', listData?.r?.length, 'err:', listData?.err?.code || '');

if (listData?.s !== 'ok') {
  console.log('Full response:', JSON.stringify(listData));
  process.exit(1);
}

console.log('\nAuthenticated! Creating test alert via Node.js...');

const EXPIRATION = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
const WEBHOOK_URL = 'https://150.136.121.101.nip.io/api/webhook/signal';
const SYMBOL = '={"inputs":{},"symbol":{"backadjustment":"default","currency-id":"USD","session":"regular","symbol":"CME_MINI:ES1!"},"type":"BarSetHeikenAshi@tv-basicstudies-60!"}';
const URL = 'https://pricealerts.tradingview.com/create_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43';

const testPayload = {
  payload: {
    conditions: [{
      type: 'alert_cond',
      frequency: 'on_first_fire',
      alert_cond_id: 'plot_21',
      series: [{
        type: 'study',
        study: 'Script@tv-scripting-101',
        pine_id: 'PUB;164b07b76e42490e873676e8db5ea524',
        pine_version: '5.0',
        inputs: {
          pineFeatures: '{"indicator":1,"plot":1,"ta":1,"math":1,"alertcondition":1,"request.security":1}',
          in_0: false, in_1: '1', in_2: '3', in_3: '5', in_4: '10',
          in_5: 4285982208, in_6: 4294656224, in_7: 4283477836, in_8: 4282726130, in_9: 4287003512,
          in_10: true, in_11: 4285982208, in_12: 4282726130, in_13: true, in_14: false, in_15: true,
          in_16: 4283477836, in_17: 4282726130, in_18: 30, in_19: false, in_20: 4283477836,
          in_21: 4282726130, in_22: 30, in_23: false, in_24: 4283477836, in_25: 4282726130,
          in_26: true, in_27: 4294926889, __fast_calc: false, __profile: false,
        },
        offsets_by_plot: { plot_1: 0, plot_2: 0, plot_4: 0, plot_6: 0, plot_9: 0, plot_11: 0, plot_13: 0, plot_14: 0, plot_15: 0, plot_16: 0, plot_17: 0, plot_18: 0 },
      }],
      resolution: '5',
    }],
    symbol: SYMBOL,
    resolution: '5',
    message: 'MAVERICK_BULL {{ticker}} {{close}}',
    sound_file: 'alert/fired',
    sound_duration: 0,
    popup: true,
    auto_deactivate: false,
    email: true,
    sms_over_email: false,
    mobile_push: true,
    web_hook: WEBHOOK_URL,
    name: null,
    expiration: EXPIRATION,
    active: true,
    ignore_warnings: true,
  },
};

const createRes = await fetch(URL, {
  method: 'POST',
  headers: {
    'Cookie': cookieHeader,
    'Content-Type': 'text/plain;charset=UTF-8',
    'Referer': 'https://www.tradingview.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'Origin': 'https://www.tradingview.com',
  },
  body: JSON.stringify(testPayload),
});
const createData = await createRes.json();
console.log('Test create result:', createData?.s, createData?.r?.alert_id || createData?.err?.code || JSON.stringify(createData));

process.exit(0);
