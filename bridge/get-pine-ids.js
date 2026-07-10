/**
 * Gets the pine IDs for all indicators on the chart.
 * TradingView stores these in the chart's internal state.
 */
import { evaluate, evaluateAsync, getClient } from '../src/connection.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// Method 1: Extract pine IDs from TradingView's internal chart manager
const pineIds = await evaluate(`
  (function() {
    try {
      // Look for TradingView's internal window object
      var tw = null;
      for (var k of Object.keys(window)) {
        if (window[k] && window[k].activeChart && typeof window[k].activeChart === 'function') {
          tw = window[k]; break;
        }
      }
      if (!tw) return JSON.stringify({err: 'no TradingView object found'});
      var chart = tw.activeChart();
      var studies = chart._chartWidget._studyWatcher._seriesMap;
      return JSON.stringify({found: 'TradingView object'});
    } catch(e) {
      return JSON.stringify({err: e.message});
    }
  })()
`);
console.log('Method 1:', pineIds);

// Method 2: Read from TradingView's internal state via global variables
const state2 = await evaluate(`
  (function() {
    // Look for indicators in common TradingView global variables
    var result = {};
    var keys = ['tvWidget', 'TradingViewApi', '__TVWidget', '_tvWidget'];
    for (var k of keys) {
      if (window[k]) result[k] = typeof window[k];
    }
    // Also check for any variable with 'pine_id' or 'study' data
    return JSON.stringify(result);
  })()
`);
console.log('Method 2 - global vars:', state2);

// Method 3: Read from the DOM - TradingView embeds some data as data attributes
const domData = await evaluate(`
  (function() {
    // Check for any data-* attributes with study info
    var studyEls = document.querySelectorAll('[data-script-type], [data-study-id], [data-pine-id]');
    return JSON.stringify(Array.from(studyEls).slice(0,10).map(function(e){
      return { tag: e.tagName, scriptType: e.getAttribute('data-script-type'), studyId: e.getAttribute('data-study-id'), pineId: e.getAttribute('data-pine-id') };
    }));
  })()
`);
console.log('Method 3 - DOM data:', domData);

// Method 4: Use the chart's session to get study metadata via WebSocket or internal API
const sessionData = await evaluateAsync(`
  // Try fetching from TradingView's study-metadata API
  // Studies might have a metadata API
  fetch('https://www.tradingview.com/pine_pubs/pine_saved_scripts/', { credentials: 'include' })
    .then(r => r.json())
    .catch(e => ({ error: e.message }))
`);
console.log('Method 4 - pine saved scripts:', JSON.stringify(sessionData).substring(0, 200));

// Method 5: Look for pine IDs in window's JavaScript heap
// TradingView's React components store indicator data
const heapSearch = await evaluate(`
  (function() {
    // Search for pine IDs in React fiber tree
    var studies = [];
    var indicators = ['Prop Desk AMD', 'MaverickAI Pro', 'MaverickTrender', 'TH_RSIMACD'];

    // Walk the React fiber tree
    function walkFiber(fiber, depth) {
      if (!fiber || depth > 20) return;
      try {
        var props = fiber.memoizedProps || fiber.pendingProps;
        if (props && props.pine_id && typeof props.pine_id === 'string' && props.pine_id.startsWith('PUB;')) {
          studies.push({ pine_id: props.pine_id, desc: props.description || '' });
        }
        if (props && props.studyInfo && props.studyInfo.pine_id) {
          studies.push({ pine_id: props.studyInfo.pine_id, desc: props.studyInfo.description || '' });
        }
        walkFiber(fiber.child, depth + 1);
        walkFiber(fiber.sibling, depth + 1);
      } catch(e) {}
    }

    // Find React root
    var roots = Object.keys(document.getElementById('tv_chart_content') || document.body);
    var root = roots.find(function(k){ return k.startsWith('__reactFiber'); });
    if (root) walkFiber(document.getElementById('tv_chart_content')[root], 0);

    return JSON.stringify({studies: studies.slice(0,20)});
  })()
`);
console.log('Method 5 - React fiber:', heapSearch);

// Method 6: Enable CDP network monitoring and try to create one alert to capture the API call
console.log('\n=== Enabling Network Monitoring ===');
await client.Network.enable();

// Listen for network requests
const capturedRequests = [];
client.Network.requestWillBeSent((params) => {
  if (params.request.url.includes('alert') || params.request.url.includes('pricealerts')) {
    capturedRequests.push({
      url: params.request.url,
      method: params.request.method,
      body: params.request.postData?.substring(0, 500)
    });
  }
});

// Open alert dialog
await client.Input.dispatchMouseEvent({ type: 'mousePressed', x: 600, y: 350, button: 'left', clickCount: 1 });
await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x: 600, y: 350, button: 'left', clickCount: 1 });
await wait(300);
await client.Input.dispatchKeyEvent({ type: 'keyDown', modifiers: 1, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
await client.Input.dispatchKeyEvent({ type: 'keyUp', key: 'a', code: 'KeyA' });
await wait(2000);

// Click Create to capture the network request (dialog is in default "Price" mode)
const createBtn = await evaluate(`
  (function(){
    var d = document.querySelector('[class*="popup-LEkd5gPO"]');
    if (!d) return false;
    var btns = Array.from(d.querySelectorAll('button'));
    var create = btns.find(function(b){ return /^create$/i.test(b.textContent.trim()); });
    if (create) { create.click(); return true; }
    return false;
  })()
`);
console.log('Clicked Create:', createBtn);
await wait(2000);

// Check what network requests were captured
console.log('Captured alert requests:', JSON.stringify(capturedRequests, null, 2));

await client.Network.disable();
process.exit(0);
