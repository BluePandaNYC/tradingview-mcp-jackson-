/**
 * Tests all 8 alert conditions without webhook (webhook blocked until 2FA enabled).
 * Verifies every condId is valid before we add the webhook URL.
 */
import { evaluateAsync } from '../src/connection.js';

const EXPIRATION = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
const URL = 'https://pricealerts.tradingview.com/create_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43';
const SYMBOL = '={"inputs":{},"symbol":{"backadjustment":"default","currency-id":"USD","session":"regular","symbol":"CME_MINI:ES1!"},"type":"BarSetHeikenAshi@tv-basicstudies-60!"}';

const PROP_DESK = {
  study: 'StrategyScript@tv-scripting-101',
  pine_id: 'USER;8e0d8cbe9139416780fa8aaceb41ca1d',
  pine_version: '3.0',
  offsets_by_plot: {},
  inputs: {
    pineFeatures: '{"strategy":1,"plot":1,"str":1,"ta":1,"math":1,"alertcondition":1,"table":1,"request.security":1}',
    in_0: 25, in_1: 0.5, in_2: true, in_3: 38.2, in_4: 61.8, in_5: 9, in_6: 21, in_7: 1.5, in_8: 14,
    in_9: 1, in_10: 2, in_11: 3, in_12: 4, in_13: 5, in_14: 1, in_15: true, in_16: 10000,
    in_17: 'fixed', in_18: 1, in_19: 0, in_20: false, in_21: false, in_22: 0, in_23: 'NONE',
    in_24: 0, in_25: 'percent', in_26: 0, in_27: false, in_28: 'FIFO', in_29: 100, in_30: 100,
    in_31: 2, in_32: false, in_33: false, in_34: 'BACKTEST', in_35: '', in_36: 'order_fills',
    in_37: '', in_38: true, in_39: '', in_40: false, __profile: false,
  },
};

const MAI_PRO = {
  study: 'Script@tv-scripting-101',
  pine_id: 'PUB;164b07b76e42490e873676e8db5ea524',
  pine_version: '5.0',
  offsets_by_plot: { plot_1: 0, plot_2: 0, plot_4: 0, plot_6: 0, plot_9: 0, plot_11: 0, plot_13: 0, plot_14: 0, plot_15: 0, plot_16: 0, plot_17: 0, plot_18: 0 },
  inputs: {
    pineFeatures: '{"indicator":1,"plot":1,"ta":1,"math":1,"alertcondition":1,"request.security":1}',
    in_0: false, in_1: '1', in_2: '3', in_3: '5', in_4: '10',
    in_5: 4285982208, in_6: 4294656224, in_7: 4283477836, in_8: 4282726130, in_9: 4287003512,
    in_10: true, in_11: 4285982208, in_12: 4282726130, in_13: true, in_14: false, in_15: true,
    in_16: 4283477836, in_17: 4282726130, in_18: 30, in_19: false, in_20: 4283477836,
    in_21: 4282726130, in_22: 30, in_23: false, in_24: 4283477836, in_25: 4282726130,
    in_26: true, in_27: 4294926889, __fast_calc: false, __profile: false,
  },
};

const MAVTRENDER = {
  study: 'Script@tv-scripting-101',
  pine_id: 'PUB;a5708a06663b461d9eb965478d6c13cd',
  pine_version: '1.0',
  offsets_by_plot: { plot_0: 0, plot_1: 0, plot_2: 0 },
  inputs: {
    pineFeatures: '{"indicator":1,"plot":1,"ta":1,"alertcondition":1,"label":1}',
    in_0: 5, in_1: 2, in_2: 4, in_3: 20, __profile: false,
  },
};

const TESTS = [
  { s: PROP_DESK, condId: 'plot_11', msg: 'AMD_LONG {{ticker}} {{close}}',    label: 'Prop Desk AMD Long'   },
  { s: PROP_DESK, condId: 'plot_12', msg: 'AMD_SHORT {{ticker}} {{close}}',   label: 'Prop Desk AMD Short'  },
  { s: PROP_DESK, condId: 'plot_13', msg: 'ORB_LONG {{ticker}} {{close}}',    label: 'Prop Desk ORB Long'   },
  { s: PROP_DESK, condId: 'plot_14', msg: 'ORB_SHORT {{ticker}} {{close}}',   label: 'Prop Desk ORB Short'  },
  { s: MAI_PRO,   condId: 'plot_21', msg: 'MAVERICK_BULL {{ticker}} {{close}}', label: 'MAI Pro Bullish Arrow' },
  { s: MAI_PRO,   condId: 'plot_22', msg: 'MAVERICK_BEAR {{ticker}} {{close}}', label: 'MAI Pro Bearish Arrow' },
  { s: MAVTRENDER, condId: 'plot_3', msg: 'TRENDER_UP {{ticker}} {{close}}',   label: 'MavTrender Uptrend'   },
  { s: MAVTRENDER, condId: 'plot_4', msg: 'TRENDER_DOWN {{ticker}} {{close}}', label: 'MavTrender Downtrend' },
];

const wait = ms => new Promise(r => setTimeout(r, ms));
const created = [];

for (const t of TESTS) {
  const payload = {
    payload: {
      conditions: [{
        type: 'alert_cond',
        frequency: 'on_first_fire',
        alert_cond_id: t.condId,
        series: [{ type: 'study', study: t.s.study, pine_id: t.s.pine_id, pine_version: t.s.pine_version, inputs: t.s.inputs, offsets_by_plot: t.s.offsets_by_plot }],
        resolution: '5',
      }],
      symbol: SYMBOL,
      resolution: '5',
      message: t.msg,
      sound_file: 'alert/fired',
      sound_duration: 0,
      popup: true,
      auto_deactivate: false,
      email: true,
      sms_over_email: false,
      mobile_push: true,
      web_hook: null,
      name: null,
      expiration: EXPIRATION,
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

  if (result?.s === 'ok') {
    const id = result.r?.alert_id;
    created.push(id);
    console.log(`✓ ${t.label} (id=${id})`);
  } else {
    console.log(`✗ ${t.label} — ${result?.code || result?.err?.code || JSON.stringify(result)}`);
  }
  await wait(600);
}

console.log(`\nCreated ${created.length}/8: ${created.join(', ')}`);

// Delete all test alerts
console.log('\nDeleting all test alerts...');
const DEL_URL = 'https://pricealerts.tradingview.com/delete_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43';
for (const id of created) {
  const r = await evaluateAsync(`
    fetch(${JSON.stringify(DEL_URL)}, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ payload: { alert_id: ${id} } }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
  `);
  console.log(`  ${id}: ${r?.s}`);
  await wait(300);
}

process.exit(0);
