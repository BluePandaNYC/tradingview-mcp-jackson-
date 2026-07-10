/**
 * Creates 8 Trading Desk AI webhook alerts via TradingView's internal API.
 * No UI automation needed — direct API calls using browser auth context.
 *
 * Pine IDs captured from actual TradingView network requests.
 */
import { evaluateAsync, getClient } from '../src/connection.js';

const WEBHOOK_URL = 'https://150.136.121.101.nip.io/api/webhook/signal';

// Symbol / chart config matching the current ES1! 5-minute HeikinAshi chart
const SYMBOL = '={"inputs":{},"symbol":{"backadjustment":"default","currency-id":"USD","session":"regular","symbol":"CME_MINI:ES1!"},"type":"BarSetHeikenAshi@tv-basicstudies-60!"}';
const RESOLUTION = '5';

// Expiration: 31 days (TradingView free plan limit)
const EXPIRATION = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

// ── Study definitions (pine_id + inputs captured from real TV network requests) ──

const PROP_DESK = {
  study: 'StrategyScript@tv-scripting-101',
  pine_id: 'USER;8e0d8cbe9139416780fa8aaceb41ca1d',
  pine_version: '3.0',
  inputs: {
    pineFeatures: '{"strategy":1,"plot":1,"str":1,"ta":1,"math":1,"alertcondition":1,"table":1,"request.security":1}',
    in_0: 25, in_1: 0.5, in_2: true, in_3: 38.2, in_4: 61.8, in_5: 9, in_6: 21, in_7: 1.5, in_8: 14,
    in_9: 1, in_10: 2, in_11: 3, in_12: 4, in_13: 5, in_14: 1, in_15: true, in_16: 10000,
    in_17: 'fixed', in_18: 1, in_19: 0, in_20: false, in_21: false, in_22: 0, in_23: 'NONE',
    in_24: 0, in_25: 'percent', in_26: 0, in_27: false, in_28: 'FIFO', in_29: 100, in_30: 100,
    in_31: 2, in_32: false, in_33: false, in_34: 'BACKTEST', in_35: '', in_36: 'order_fills',
    in_37: '', in_38: true, in_39: '', in_40: false, __profile: false,
  },
  offsets_by_plot: {},
};

const MAI_PRO = {
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
};

const MAVTRENDER = {
  study: 'Script@tv-scripting-101',
  pine_id: 'PUB;a5708a06663b461d9eb965478d6c13cd',
  pine_version: '1.0',
  inputs: {
    pineFeatures: '{"indicator":1,"plot":1,"ta":1,"alertcondition":1,"label":1}',
    in_0: 5, in_1: 2, in_2: 4, in_3: 20, __profile: false,
  },
  offsets_by_plot: { plot_0: 0, plot_1: 0, plot_2: 0 },
};

// ── Alert definitions ────────────────────────────────────────────────────────

const ALERTS = [
  // Prop Desk entry signals (alertcondition IDs from presentation_data)
  { studyDef: PROP_DESK, condId: 'plot_11', msg: 'AMD_LONG {{ticker}} {{close}}',  name: 'AMD Long Signal'  },
  { studyDef: PROP_DESK, condId: 'plot_12', msg: 'AMD_SHORT {{ticker}} {{close}}', name: 'AMD Short Signal' },
  { studyDef: PROP_DESK, condId: 'plot_13', msg: 'ORB_LONG {{ticker}} {{close}}',  name: 'ORB Long Signal'  },
  { studyDef: PROP_DESK, condId: 'plot_14', msg: 'ORB_SHORT {{ticker}} {{close}}', name: 'ORB Short Signal' },
  // MaverickAI Pro context signals
  { studyDef: MAI_PRO,   condId: 'plot_21', msg: 'MAVERICK_BULL {{ticker}} {{close}}', name: 'Bullish Arrow' },
  { studyDef: MAI_PRO,   condId: 'plot_22', msg: 'MAVERICK_BEAR {{ticker}} {{close}}', name: 'Bearish Arrow' },
  // MaverickTrender context signals
  { studyDef: MAVTRENDER, condId: 'plot_3', msg: 'TRENDER_UP {{ticker}} {{close}}',   name: 'Uptrend Signal'   },
  { studyDef: MAVTRENDER, condId: 'plot_4', msg: 'TRENDER_DOWN {{ticker}} {{close}}', name: 'Downtrend Signal' },
];

// ── API call ─────────────────────────────────────────────────────────────────

async function createAlert(alertDef, index) {
  const { studyDef, condId, msg, name } = alertDef;

  const payload = {
    payload: {
      conditions: [{
        type: 'alert_cond',
        frequency: 'on_first_fire',
        alert_cond_id: condId,
        series: [{
          type: 'study',
          study: studyDef.study,
          pine_id: studyDef.pine_id,
          pine_version: studyDef.pine_version,
          inputs: studyDef.inputs,
          offsets_by_plot: studyDef.offsets_by_plot,
        }],
        resolution: RESOLUTION,
      }],
      symbol: SYMBOL,
      resolution: RESOLUTION,
      message: msg,
      web_hook: WEBHOOK_URL,
      sound_file: 'alert/fired',
      sound_duration: 0,
      popup: true,
      auto_deactivate: false,
      email: false,
      sms_over_email: false,
      mobile_push: true,
      name: null,
      expiration: EXPIRATION,
      active: true,
      ignore_warnings: true,
    },
  };

  const payloadStr = JSON.stringify(payload);
  const url = 'https://pricealerts.tradingview.com/create_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43';

  const result = await evaluateAsync(`
    fetch(${JSON.stringify(url)}, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: ${JSON.stringify(payloadStr)},
    }).then(r => r.json()).catch(e => ({ error: e.message }))
  `);

  if (result?.s === 'ok') {
    const alertId = result?.r?.alert_id;
    console.log(`  [${index + 1}/8] ✓ ${name} — ${msg} (id: ${alertId})`);
    return alertId;
  } else {
    console.log(`  [${index + 1}/8] ✗ ${name} — Error:`, JSON.stringify(result));
    return null;
  }
}

// Delete alerts by ID array
async function deleteAlerts(alertIds) {
  const url = 'https://pricealerts.tradingview.com/delete_alerts';
  const result = await evaluateAsync(`
    fetch(${JSON.stringify(url)}, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ payload: { alert_ids: ${JSON.stringify(alertIds)} } }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
  `);
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('Trading Desk AI — Creating 8 Webhook Alerts');
console.log(`Webhook: ${WEBHOOK_URL}`);
console.log(`Expiration: ${EXPIRATION}\n`);

console.log('Creating 8 webhook alerts...\n');
const createdIds = [];
for (let i = 0; i < ALERTS.length; i++) {
  const id = await createAlert(ALERTS[i], i);
  if (id) createdIds.push(id);
  await new Promise(r => setTimeout(r, 800));
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Done. Created: ${createdIds.length}/8 alerts`);
console.log(`Alert IDs: ${createdIds.join(', ')}`);
if (createdIds.length === ALERTS.length) {
  console.log('\n✅ All alerts created successfully!');
  console.log('TradingView will now send webhooks to your cloud server when signals fire.');
} else {
  console.log('\n⚠️  Some alerts failed. Check errors above.');
}
process.exit(0);
