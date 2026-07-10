import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const client = await getClient();
  
  // Click the close button by its class
  const closed = await evaluate(`
    (function() {
      var btn = document.querySelector('.closeButton-SiBYNi_V');
      if (btn) { btn.click(); return true; }
      // Also try the reload/reconnect button inside the modal
      var reloadBtn = document.querySelector('[class*="reloadButton"], [class*="reconnect"]');
      if (reloadBtn) { reloadBtn.click(); return 'reload'; }
      return false;
    })()
  `);
  console.log('Close modal:', closed);
  await wait(2000);

  // Check if modal is gone
  const state = await evaluate(`
    (function() {
      var disconnected = document.body.textContent.includes('Session disconnected');
      var modal = document.querySelector('.closeButton-SiBYNi_V');
      return { disconnected, modalCloseStillThere: !!modal };
    })()
  `);
  console.log('State after close:', JSON.stringify(state));
  
  if (state.disconnected) {
    // Try reloading the TradingView page
    console.log('Still disconnected — forcing page reload...');
    await evaluate(`window.location.reload()`);
    await wait(8000);
    console.log('Page reloaded');
  }
  
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
