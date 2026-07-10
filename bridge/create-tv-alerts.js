/**
 * One-time script: creates all Trading Desk AI webhook alerts in TradingView.
 * Run with: node bridge/create-tv-alerts.js
 *
 * Creates 16 alerts total:
 *  8 ON  — when each signal crosses above 0
 *  8 OFF — when each signal drops back to 0 (resets cloud state)
 */

import { evaluate, evaluateAsync, getClient } from '../src/connection.js';

const WEBHOOK_URL = 'https://150.136.121.101.nip.io/api/webhook/signal';
const wait = ms => new Promise(r => setTimeout(r, ms));

const ALERTS = [
  // Entry triggers — ON
  { study: 'Prop Desk AMD+PBD+ORB v3', output: 'AMD Long',      cross: 'up',   msg: 'AMD_LONG {{ticker}} {{close}}'       },
  { study: 'Prop Desk AMD+PBD+ORB v3', output: 'AMD Short',     cross: 'up',   msg: 'AMD_SHORT {{ticker}} {{close}}'      },
  { study: 'Prop Desk AMD+PBD+ORB v3', output: 'ORB Long',      cross: 'up',   msg: 'ORB_LONG {{ticker}} {{close}}'       },
  { study: 'Prop Desk AMD+PBD+ORB v3', output: 'ORB Short',     cross: 'up',   msg: 'ORB_SHORT {{ticker}} {{close}}'      },
  // Maverick + Trender context signals — ON
  { study: 'MaverickAI Pro',            output: 'Bullish Arrow', cross: 'up',   msg: 'MAVERICK_BULL {{ticker}} {{close}}'  },
  { study: 'MaverickAI Pro',            output: 'Bearish Arrow', cross: 'up',   msg: 'MAVERICK_BEAR {{ticker}} {{close}}'  },
  { study: 'MaverickTrender',           output: 'UpTrend',       cross: 'up',   msg: 'TRENDER_UP {{ticker}} {{close}}'     },
  { study: 'MaverickTrender',           output: 'DownTrend',     cross: 'up',   msg: 'TRENDER_DOWN {{ticker}} {{close}}'   },
  // Context signals — OFF (reset cloud state when signal dies)
  { study: 'Prop Desk AMD+PBD+ORB v3', output: 'AMD Long',      cross: 'down', msg: 'AMD_LONG_OFF {{ticker}} {{close}}'   },
  { study: 'Prop Desk AMD+PBD+ORB v3', output: 'AMD Short',     cross: 'down', msg: 'AMD_SHORT_OFF {{ticker}} {{close}}'  },
  { study: 'Prop Desk AMD+PBD+ORB v3', output: 'ORB Long',      cross: 'down', msg: 'ORB_LONG_OFF {{ticker}} {{close}}'   },
  { study: 'Prop Desk AMD+PBD+ORB v3', output: 'ORB Short',     cross: 'down', msg: 'ORB_SHORT_OFF {{ticker}} {{close}}'  },
  { study: 'MaverickAI Pro',            output: 'Bullish Arrow', cross: 'down', msg: 'MAVERICK_BULL_OFF {{ticker}} {{close}}' },
  { study: 'MaverickAI Pro',            output: 'Bearish Arrow', cross: 'down', msg: 'MAVERICK_BEAR_OFF {{ticker}} {{close}}' },
  { study: 'MaverickTrender',           output: 'UpTrend',       cross: 'down', msg: 'TRENDER_UP_OFF {{ticker}} {{close}}' },
  { study: 'MaverickTrender',           output: 'DownTrend',     cross: 'down', msg: 'TRENDER_DOWN_OFF {{ticker}} {{close}}' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function dismissAnyModal() {
  await evaluate(`
    (function() {
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var lbl = btns[i].getAttribute('aria-label') || '';
        var txt = btns[i].textContent.trim();
        if (/close|dismiss|cancel|got it/i.test(lbl) || /close|dismiss|got it/i.test(txt)) {
          btns[i].click(); return true;
        }
      }
      // Try clicking any visible X / close icon
      var closeEl = document.querySelector('[data-name="close"], [aria-label="Close"], .close-button');
      if (closeEl) { closeEl.click(); return true; }
      return false;
    })()
  `);
  await wait(800);
}

async function openCreateAlertDialog() {
  // Press Alt+A — TradingView keyboard shortcut for "Create Alert"
  const client = await getClient();
  await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 1, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
  await client.Input.dispatchKeyEvent({ type: 'keyUp',   key: 'a', code: 'KeyA' });
  await wait(1500);

  // Fallback: click the bell / "Create Alert" button directly
  const opened = await evaluate(`
    (function() {
      var btn = document.querySelector('[aria-label="Create alert"]')
            || document.querySelector('[data-name="create-alert-button"]')
            || document.querySelector('[aria-label="Add alert"]');
      if (btn) { btn.click(); return true; }
      return false;
    })()
  `);
  if (!opened) await wait(500);
  await wait(1200);
}

async function isDialogOpen() {
  return evaluate(`
    !!(document.querySelector('[data-name="alerts-create-edit-dialog"]')
    || document.querySelector('[class*="alertDialog"]')
    || document.querySelector('[aria-label="Create alert dialog"]')
    || document.querySelector('[aria-label="Edit alert dialog"]'))
  `);
}

async function clickDropdown(nth) {
  // Clicks the nth select/dropdown control inside the alert dialog (0-indexed)
  const clicked = await evaluate(`
    (function() {
      var dialog = document.querySelector('[data-name="alerts-create-edit-dialog"]')
                || document.querySelector('[class*="alertDialog"]')
                || document.body;
      var selects = dialog.querySelectorAll('[class*="select"], [class*="Select"], [role="combobox"], [role="listbox"]');
      var buttons  = dialog.querySelectorAll('button[class*="select"], div[class*="select__control"], [class*="dropdown"]');
      var targets  = selects.length > 0 ? selects : buttons;
      var el = targets[${nth}];
      if (!el) return false;
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true }));
      el.click();
      return true;
    })()
  `);
  await wait(700);
  return clicked;
}

async function typeInActiveInput(text) {
  const client = await getClient();
  await client.Input.insertText({ text });
  await wait(500);
}

async function clickOptionByText(text) {
  const clicked = await evaluate(`
    (function() {
      var text = ${JSON.stringify(text)};
      // Look in any open menu/list overlay
      var containers = [
        document.querySelector('[class*="menuList"]'),
        document.querySelector('[class*="menu"]'),
        document.querySelector('[class*="optionList"]'),
        document.querySelector('[class*="dropdown"]'),
        document.querySelector('[role="listbox"]'),
        document.body
      ];
      for (var c = 0; c < containers.length; c++) {
        if (!containers[c]) continue;
        var all = containers[c].querySelectorAll('[class*="option"], [role="option"], li, div');
        for (var i = 0; i < all.length; i++) {
          var t = all[i].textContent.trim();
          if (t === text || t.startsWith(text)) {
            all[i].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            all[i].dispatchEvent(new MouseEvent('mouseup',   { bubbles: true }));
            all[i].click();
            return { found: true, text: t };
          }
        }
      }
      return { found: false };
    })()
  `);
  await wait(600);
  return clicked;
}

async function setInputValue(labelHint, value) {
  await evaluate(`
    (function() {
      var hint  = ${JSON.stringify(labelHint)};
      var value = ${JSON.stringify(value)};
      var dialog = document.querySelector('[data-name="alerts-create-edit-dialog"]') || document.body;
      var inputs = dialog.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
      for (var i = 0; i < inputs.length; i++) {
        var row = inputs[i].closest('[class*="row"], [class*="field"], [class*="group"], tr');
        var label = row ? row.textContent : '';
        if (!hint || label.toLowerCase().indexOf(hint.toLowerCase()) !== -1 || inputs.length === 1) {
          var nset = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          nset.call(inputs[i], value);
          inputs[i].dispatchEvent(new Event('input',  { bubbles: true }));
          inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    })()
  `);
  await wait(300);
}

async function setWebhookAndMessage(webhookUrl, message) {
  // Click the Notifications tab
  await evaluate(`
    (function() {
      var dialog = document.querySelector('[data-name="alerts-create-edit-dialog"]') || document.body;
      var tabs = dialog.querySelectorAll('[role="tab"], button');
      for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i].textContent.trim().toLowerCase();
        if (t === 'notifications' || t === 'notify on app' || t.includes('notif')) {
          tabs[i].click(); return true;
        }
      }
      return false;
    })()
  `);
  await wait(700);

  // Enable webhook checkbox if not already enabled
  await evaluate(`
    (function() {
      var dialog = document.querySelector('[data-name="alerts-create-edit-dialog"]') || document.body;
      var labels = dialog.querySelectorAll('label, [class*="label"]');
      for (var i = 0; i < labels.length; i++) {
        if (/webhook/i.test(labels[i].textContent)) {
          var cb = labels[i].querySelector('input[type="checkbox"]') || labels[i].previousElementSibling;
          if (cb && cb.type === 'checkbox' && !cb.checked) { cb.click(); return true; }
          labels[i].click(); return true;
        }
      }
      // Also try finding any webhook-related input and enabling it
      var wbInputs = dialog.querySelectorAll('[placeholder*="webhook" i], [placeholder*="URL" i]');
      if (wbInputs.length > 0) return true;
      return false;
    })()
  `);
  await wait(500);

  // Set webhook URL
  await evaluate(`
    (function() {
      var url = ${JSON.stringify(webhookUrl)};
      var dialog = document.querySelector('[data-name="alerts-create-edit-dialog"]') || document.body;
      var inputs = dialog.querySelectorAll('input[type="url"], input[placeholder*="URL" i], input[placeholder*="webhook" i], input[type="text"]');
      for (var i = 0; i < inputs.length; i++) {
        var ph = inputs[i].placeholder || '';
        if (/url|webhook/i.test(ph)) {
          var nset = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          nset.call(inputs[i], url);
          inputs[i].dispatchEvent(new Event('input',  { bubbles: true }));
          inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    })()
  `);
  await wait(400);

  // Set message in textarea
  await evaluate(`
    (function() {
      var msg = ${JSON.stringify(message)};
      var dialog = document.querySelector('[data-name="alerts-create-edit-dialog"]') || document.body;
      var ta = dialog.querySelector('textarea[placeholder*="message" i], textarea[placeholder*="Message" i], textarea');
      if (ta) {
        var nset = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        nset.call(ta, msg);
        ta.dispatchEvent(new Event('input',  { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    })()
  `);
  await wait(400);
}

async function clickCreate() {
  const clicked = await evaluate(`
    (function() {
      var dialog = document.querySelector('[data-name="alerts-create-edit-dialog"]') || document.body;
      var btns = dialog.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var t = btns[i].textContent.trim();
        if (/^(save|create|submit|done)$/i.test(t)) {
          btns[i].click(); return true;
        }
      }
      // Fall back to looking for a primary/submit button
      var primary = dialog.querySelector('button[type="submit"], button[class*="primary"]');
      if (primary) { primary.click(); return true; }
      return false;
    })()
  `);
  await wait(1200);
  return clicked;
}

async function closeDialog() {
  await evaluate(`
    (function() {
      var el = document.querySelector('[data-name="alerts-create-edit-dialog"] [aria-label="close" i]')
            || document.querySelector('[data-name="alerts-create-edit-dialog"] button[class*="close"]');
      if (el) { el.click(); return true; }
      // ESC key equivalent
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape', keyCode: 27 }));
      return false;
    })()
  `);
  await wait(800);
}

// ── Main: create one alert ────────────────────────────────────────────────────

async function createAlert(alertDef, index) {
  const { study, output, cross, msg } = alertDef;
  console.log(`\n[${index + 1}/${ALERTS.length}] Creating: ${msg}`);

  // Open dialog
  await openCreateAlertDialog();

  const open = await isDialogOpen();
  if (!open) {
    console.log('  ✗ Dialog did not open — skipping');
    return false;
  }

  // ── Condition: first dropdown — pick the study ────────────────────────────
  await clickDropdown(0);
  await typeInActiveInput(study.split(' ')[0]); // type first word to filter
  await wait(400);
  const studySelected = await clickOptionByText(study);
  if (!studySelected?.found) {
    console.log(`  ✗ Study "${study}" not found in dropdown — trying partial match`);
    // Try clicking by partial text
    await evaluate(`
      (function() {
        var text = ${JSON.stringify(study)};
        var items = document.querySelectorAll('[class*="option"], [role="option"], li');
        for (var i = 0; i < items.length; i++) {
          if (items[i].textContent.includes(text.split(' ')[0])) {
            items[i].click(); return true;
          }
        }
        return false;
      })()
    `);
    await wait(600);
  }

  // ── Condition: second dropdown — pick the output ──────────────────────────
  await clickDropdown(1);
  await wait(400);
  const outputSelected = await clickOptionByText(output);
  if (!outputSelected?.found) {
    console.log(`  ✗ Output "${output}" not found`);
    await closeDialog();
    return false;
  }

  // ── Condition: third dropdown — "Crosses Above" or "Crosses Below" ────────
  const crossText = cross === 'up' ? 'Crossing Up' : 'Crossing Down';
  const crossAlt  = cross === 'up' ? 'Crosses Above' : 'Crosses Below';
  await clickDropdown(2);
  await wait(400);
  let crossSet = await clickOptionByText(crossText);
  if (!crossSet?.found) crossSet = await clickOptionByText(crossAlt);
  if (!crossSet?.found) {
    // Try any "cross" option
    await evaluate(`
      (function() {
        var dir = ${JSON.stringify(cross)};
        var items = document.querySelectorAll('[class*="option"], [role="option"], li');
        for (var i = 0; i < items.length; i++) {
          var t = items[i].textContent.toLowerCase();
          if (t.includes('cross') && t.includes(dir === 'up' ? 'up' : 'down')) {
            items[i].click(); return true;
          }
        }
        return false;
      })()
    `);
    await wait(600);
  }

  // ── Value: set to 0 ───────────────────────────────────────────────────────
  await setInputValue('value', '0');

  // ── Notifications: webhook URL + message ─────────────────────────────────
  await setWebhookAndMessage(WEBHOOK_URL, msg);

  // ── Submit ────────────────────────────────────────────────────────────────
  const created = await clickCreate();
  if (created) {
    console.log(`  ✓ Created: ${msg}`);
    return true;
  } else {
    console.log(`  ✗ Create button not found`);
    await closeDialog();
    return false;
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  console.log('Trading Desk AI — TradingView Alert Setup');
  console.log(`Webhook: ${WEBHOOK_URL}`);
  console.log(`Creating ${ALERTS.length} alerts...\n`);

  // Dismiss any open modals (session disconnect, etc.)
  await dismissAnyModal();
  await wait(1000);

  let created = 0;
  let failed  = 0;

  for (let i = 0; i < ALERTS.length; i++) {
    const ok = await createAlert(ALERTS[i], i);
    if (ok) created++; else failed++;
    await wait(500);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Done. Created: ${created}  Failed: ${failed}`);
  if (failed > 0) console.log('Re-run the script to retry failed alerts.');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
