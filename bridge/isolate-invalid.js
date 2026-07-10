/**
 * Isolates which field causes invalid_request.
 * Tests 4 variants of MAI Pro alert, changing one thing at a time.
 */
import { evaluateAsync } from '../src/connection.js';

const WEBHOOK_URL = 'https://150.136.121.101.nip.io/api/webhook/signal';

const BASE_INPUTS = {
  pineFeatures: '{"indicator":1,"plot":1,"ta":1,"math":1,"alertcondition":1,"request.security":1}',
  in_0: false, in_1: '1', in_2: '3', in_3: '5', in_4: '10',
  in_5: 4285982208, in_6: 4294656224, in_7: 4283477836, in_8: 4282726130, in_9: 4287003512,
  in_10: true, in_11: 4285982208, in_12: 4282726130, in_13: true, in_14: false, in_15: true,
  in_16: 4283477836, in_17: 4282726130, in_18: 30, in_19: false, in_20: 4283477836,
  in_21: 4282726130, in_22: 30, in_23: false, in_24: 4283477836, in_25: 4282726130,
  in_26: true, in_27: 4294926889, __fast_calc: false, __profile: false,
};

const BASE_OFFSETS = {
  plot_1: 0, plot_2: 0, plot_4: 0, plot_6: 0, plot_9: 0,
  plot_11: 0, plot_13: 0, plot_14: 0, plot_15: 0, plot_16: 0, plot_17: 0, plot_18: 0
};

const SYMBOL = '={"inputs":{},"symbol":{"backadjustment":"default","currency-id":"USD","session":"regular","symbol":"CME_MINI:ES1!"},"type":"BarSetHeikenAshi@tv-basicstudies-60!"}';
const URL = 'https://pricealerts.tradingview.com/create_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43';

async function tryCreate(label, overrides) {
  const payload = {
    payload: {
      conditions: [{
        type: 'alert_cond',
        frequency: 'on_first_fire',
        alert_cond_id: overrides.condId || 'plot_19',
        series: [{
          type: 'study',
          study: 'Script@tv-scripting-101',
          pine_id: 'PUB;164b07b76e42490e873676e8db5ea524',
          pine_version: '5.0',
          inputs: BASE_INPUTS,
          offsets_by_plot: BASE_OFFSETS,
        }],
        resolution: '5',
      }],
      symbol: SYMBOL,
      resolution: '5',
      message: overrides.msg || 'test msg',
      sound_file: 'alert/fired',
      sound_duration: 0,
      popup: true,
      auto_deactivate: false,
      email: overrides.email !== undefined ? overrides.email : true,
      sms_over_email: false,
      mobile_push: true,
      web_hook: overrides.web_hook !== undefined ? overrides.web_hook : null,
      name: null,
      expiration: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
      active: true,
      ignore_warnings: true,
    },
  };

  const result = await evaluateAsync(`
    fetch(${JSON.stringify(URL)}, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: ${JSON.stringify(JSON.stringify(payload))},
    }).then(r => r.json()).catch(e => ({ error: e.message }))
  `);

  const status = result?.s === 'ok' ? `✓ OK (id=${result.r?.alert_id})` : `✗ ${result?.code || result?.err?.code || JSON.stringify(result)}`;
  console.log(`[${label}] ${status}`);

  // Delete if created to keep things clean
  if (result?.s === 'ok' && result?.r?.alert_id) {
    await evaluateAsync(`
      fetch('https://pricealerts.tradingview.com/delete_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ payload: { alert_id: ${result.r.alert_id} } }),
      }).then(r => r.json())
    `);
    console.log(`  (auto-deleted)`);
  }
  return result;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

console.log('=== Isolating invalid_request cause ===\n');

// V1: Exact copy of working payload (plot_19, email:true, web_hook:null)
await tryCreate('V1 exact-match plot_19 email:true hook:null', { condId: 'plot_19', email: true, web_hook: null });
await wait(600);

// V2: Change only condId to plot_21
await tryCreate('V2 plot_21 email:true hook:null', { condId: 'plot_21', email: true, web_hook: null });
await wait(600);

// V3: plot_19 + add webhook URL (email:true)
await tryCreate('V3 plot_19 email:true hook:URL', { condId: 'plot_19', email: true, web_hook: WEBHOOK_URL });
await wait(600);

// V4: plot_19 + email:false (hook:null)
await tryCreate('V4 plot_19 email:false hook:null', { condId: 'plot_19', email: false, web_hook: null });
await wait(600);

// V5: plot_21 + email:false + hook:URL (what test-one-alert.js was doing)
await tryCreate('V5 plot_21 email:false hook:URL', { condId: 'plot_21', email: false, web_hook: WEBHOOK_URL });
await wait(600);

// V6: plot_20 + email:true hook:null (to verify plot_20 exists)
await tryCreate('V6 plot_20 email:true hook:null', { condId: 'plot_20', email: true, web_hook: null });
await wait(600);

console.log('\nDone. The first failing variant above identifies the root cause.');
process.exit(0);
