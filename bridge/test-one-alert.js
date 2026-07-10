/**
 * Test creating ONE alert with carefully matched payload.
 * Compare with what the MAI Pro test alert used.
 */
import { evaluateAsync } from '../src/connection.js';

// This is the EXACT payload that worked for MAI Pro (from get-maverick-ids.js capture)
// We just change alert_cond_id and message to match what we need
const testPayload = {
  payload: {
    conditions: [{
      type: 'alert_cond',
      frequency: 'on_first_fire',
      alert_cond_id: 'plot_21',  // Bullish Arrow (instead of plot_19 which was "All 4 Bullish")
      series: [{
        type: 'study',
        study: 'Script@tv-scripting-101',
        offsets_by_plot: {
          plot_1: 0, plot_2: 0, plot_4: 0, plot_6: 0, plot_9: 0,
          plot_11: 0, plot_13: 0, plot_14: 0, plot_15: 0, plot_16: 0, plot_17: 0, plot_18: 0
        },
        inputs: {
          pineFeatures: '{"indicator":1,"plot":1,"ta":1,"math":1,"alertcondition":1,"request.security":1}',
          in_0: false, in_1: '1', in_2: '3', in_3: '5', in_4: '10',
          in_5: 4285982208, in_6: 4294656224, in_7: 4283477836, in_8: 4282726130, in_9: 4287003512,
          in_10: true, in_11: 4285982208, in_12: 4282726130, in_13: true, in_14: false, in_15: true,
          in_16: 4283477836, in_17: 4282726130, in_18: 30, in_19: false, in_20: 4283477836,
          in_21: 4282726130, in_22: 30, in_23: false, in_24: 4283477836, in_25: 4282726130,
          in_26: true, in_27: 4294926889, __fast_calc: false, __profile: false,
        },
        pine_id: 'PUB;164b07b76e42490e873676e8db5ea524',
        pine_version: '5.0',
      }],
      resolution: '5',
    }],
    symbol: '={"inputs":{},"symbol":{"backadjustment":"default","currency-id":"USD","session":"regular","symbol":"CME_MINI:ES1!"},"type":"BarSetHeikenAshi@tv-basicstudies-60!"}',
    resolution: '5',
    message: 'MAVERICK_BULL {{ticker}} {{close}}',
    sound_file: 'alert/fired',
    sound_duration: 0,
    popup: true,
    auto_deactivate: false,
    email: false,
    sms_over_email: false,
    mobile_push: true,
    web_hook: 'https://150.136.121.101.nip.io/api/webhook/signal',
    name: null,
    expiration: '2027-07-09T18:29:44.789Z',
    active: true,
    ignore_warnings: true,
  },
};

const url = 'https://pricealerts.tradingview.com/create_alert?log_username=barakshriki&maintenance_unset_reason=initial_operated&build_time=2026-07-09T11%3A11%3A43';
const payloadStr = JSON.stringify(testPayload);

console.log('Sending payload:', payloadStr.substring(0, 300), '...');

const result = await evaluateAsync(`
  fetch(${JSON.stringify(url)}, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: ${JSON.stringify(payloadStr)},
  }).then(r => r.json()).catch(e => ({ error: e.message }))
`);

console.log('Result:', JSON.stringify(result, null, 2));

// If successful, also get the alert_cond info
if (result?.s === 'ok') {
  const condData = result?.r?.presentation_data?.studies;
  console.log('\nAlert conditions available:');
  for (const [key, study] of Object.entries(condData || {})) {
    console.log('  Study:', study.description);
    for (const [condId, cond] of Object.entries(study.alert_conditions || {})) {
      console.log(`    ${condId}: ${cond.title}`);
    }
  }
}

process.exit(0);
