/**
 * TradingView Bridge Server
 * Exposes TradingView MCP core tools as REST + WebSocket.
 * Desktop runs this; Oracle Cloud / iPhone connect to it.
 */
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Core MCP modules (direct import — no CLI overhead)
import * as health from '../src/core/health.js';
import * as data from '../src/core/data.js';
import * as chart from '../src/core/chart.js';
import * as watchlist from '../src/core/watchlist.js';
import * as morning from '../src/core/morning.js';
import * as capture from '../src/core/capture.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '..', 'rules.json');
const PORT = process.env.BRIDGE_PORT || 3001;

const app = express();
app.use(express.json());

// ── CORS — allow Oracle Cloud and localhost ──────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, err, code = 500) {
  console.error('[bridge]', err?.message || err);
  res.status(code).json({ success: false, error: err?.message || String(err) });
}

function loadRules() {
  if (!existsSync(RULES_PATH)) return {};
  return JSON.parse(readFileSync(RULES_PATH, 'utf8'));
}

// Fast check: is TradingView's CDP port open? (~10ms, no retries)
async function isCdpUp() {
  try {
    const r = await fetch('http://localhost:9222/json/version', { signal: AbortSignal.timeout(800) });
    return r.ok;
  } catch { return false; }
}

// Wrap any CDP call with a timeout so hung connections never block the server
async function withCdp(fn, res) {
  if (!(await isCdpUp())) {
    return res.status(503).json({ success: false, cdp_connected: false, error: 'TradingView not running. Launch it with the debug script first.' });
  }
  try { return await fn(); }
  catch (e) { fail(res, e); }
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Health — always responds instantly
app.get('/health', async (req, res) => {
  const cdpUp = await isCdpUp();
  if (!cdpUp) return ok(res, { cdp_connected: false, bridge: 'running', tradingview: 'offline' });
  try { ok(res, await health.healthCheck()); }
  catch (e) { fail(res, e); }
});

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Live quote for a symbol
app.get('/quote/:symbol', (req, res) =>
  withCdp(async () => {
    await chart.setSymbol({ symbol: req.params.symbol });
    await wait(1200);
    ok(res, { symbol: req.params.symbol, quote: await data.getQuote() });
  }, res)
);

// OHLCV summary for a symbol
app.get('/ohlcv/:symbol', (req, res) =>
  withCdp(async () => {
    const tf = req.query.tf || '5';
    await chart.setSymbol({ symbol: req.params.symbol });
    await chart.setTimeframe({ timeframe: tf });
    await wait(1200);
    ok(res, { symbol: req.params.symbol, timeframe: tf, bars: await data.getOhlcv({ count: 50, summary: true }) });
  }, res)
);

// All indicator values for current chart
app.get('/indicators', (req, res) =>
  withCdp(async () => ok(res, { values: await data.getStudyValues() }), res)
);

// Watchlist with last prices
app.get('/watchlist', (req, res) =>
  withCdp(async () => ok(res, { watchlist: await watchlist.get() }), res)
);

// Morning brief (uses rules.json)
app.get('/brief', (req, res) =>
  withCdp(async () => {
    const brief = await morning.runBrief({ rules_path: RULES_PATH });
    ok(res, { brief, rules: loadRules() });
  }, res)
);

// Screenshot of current chart
app.get('/screenshot', (req, res) =>
  withCdp(async () => {
    ok(res, { screenshot: await capture.captureScreenshot({ region: req.query.region || 'chart' }) });
  }, res)
);

// Strategy rules — static, never needs TradingView
app.get('/rules', (req, res) => {
  try { ok(res, { rules: loadRules() }); }
  catch (e) { fail(res, e); }
});

// Current chart snapshot — NO symbol switching, instant response
app.get('/current', (req, res) =>
  withCdp(async () => {
    const h = await health.healthCheck();
    const quote = await data.getQuote();
    const values = await data.getStudyValues();
    ok(res, { symbol: h.chart_symbol, resolution: h.chart_resolution, quote, indicators: values, rules: loadRules() });
  }, res)
);

// Multi-symbol batch quote
app.post('/quotes', (req, res) =>
  withCdp(async () => {
    const { symbols } = req.body;
    if (!Array.isArray(symbols) || symbols.length === 0)
      return fail(res, new Error('symbols array required'), 400);
    const results = {};
    for (const sym of symbols.slice(0, 10)) {
      try {
        await chart.setSymbol({ symbol: sym });
        results[sym] = await data.getQuote();
      } catch (e) { results[sym] = { error: e.message }; }
    }
    ok(res, { quotes: results });
  }, res)
);

// ── HTTP + WebSocket server ──────────────────────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/live' });

// Push quote updates every 5s to all connected WebSocket clients
const liveClients = new Set();
wss.on('connection', (ws) => {
  console.log('[bridge] WebSocket client connected');
  liveClients.add(ws);
  ws.on('close', () => liveClients.delete(ws));
  ws.on('error', () => liveClients.delete(ws));
});

async function broadcastQuotes() {
  if (liveClients.size === 0) return;

  if (!(await isCdpUp())) {
    const payload = JSON.stringify({ type: 'status', cdp_connected: false, ts: Date.now() });
    for (const ws of liveClients) { if (ws.readyState === 1) ws.send(payload); }
    return;
  }

  try {
    // Only read the current chart — never switch symbols in the background
    const h = await health.healthCheck();
    const currentSymbol = h.chart_symbol;
    if (!currentSymbol) return;

    const quote = await data.getQuote();
    const quotes = { [currentSymbol]: quote };

    const payload = JSON.stringify({ type: 'quotes', data: quotes, ts: Date.now() });
    for (const ws of liveClients) { if (ws.readyState === 1) ws.send(payload); }
  } catch { /* don't crash the broadcast loop */ }
}

setInterval(broadcastQuotes, 5000);

// ── Signal monitor — push to iPhone via ntfy.sh when AMD/ORB signals fire ────
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'trading-desk-barak';
const NTFY_URL   = `https://ntfy.sh/${NTFY_TOPIC}`;

const firedSignals = new Set();  // which signals have already notified this activation
let signalResetDate = '';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Extract values object for a named study from whatever getStudyValues() returns
function findStudyValues(raw, nameFragment) {
  const studies = raw?.studies ?? raw?.values?.studies;
  if (Array.isArray(studies)) {
    const s = studies.find(s => typeof s.name === 'string' && s.name.includes(nameFragment));
    return s?.values ?? null;
  }
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (k.includes(nameFragment) && v && typeof v === 'object') return v.values ?? v;
  }
  return null;
}

function toNum(v) {
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/,/g, '')) || 0;
}

async function sendNtfy(title, body, priority = 4) {
  try {
    await fetch(NTFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: NTFY_TOPIC, title, message: body, priority, tags: ['rotating_light', 'chart_increasing'] }),
      signal: AbortSignal.timeout(6000),
    });
    console.log(`[monitor] notified: ${title}`);
  } catch (e) {
    console.error('[monitor] ntfy error:', e.message);
  }
}

async function checkSignals() {
  // Clear fired-state at start of each new calendar day
  const today = todayStr();
  if (today !== signalResetDate) {
    firedSignals.clear();
    signalResetDate = today;
  }

  if (!(await isCdpUp())) return;

  try {
    const h      = await health.healthCheck();
    const quote  = await data.getQuote();
    const values = await data.getStudyValues();

    const pd      = findStudyValues(values, 'Prop Desk AMD');
    const mav     = findStudyValues(values, 'MaverickAI Pro');
    const trender = findStudyValues(values, 'MaverickTrender');
    const rsimacd = findStudyValues(values, 'TH_RSIMACD');

    if (!pd) return; // no entry triggers without Prop Desk study

    const symbol = h.chart_symbol || 'ES1!';
    const price  = toNum(quote?.last ?? quote?.close ?? quote?.price ?? 0);
    const ema9   = toNum(pd['Fast EMA (9)']);
    const ema21  = toNum(pd['Slow EMA (21)']);

    // Pull Maverick values (0 if study not on chart)
    const bullArrow  = mav ? toNum(mav['Bullish Arrow'])     : 0;
    const bearArrow  = mav ? toNum(mav['Bearish Arrow'])     : 0;
    const mavGuide   = mav ? toNum(mav['MaverickGuide Data'] || mav['MaverickGuide']) : 0;
    const mav200     = mav ? toNum(mav['Maverick200 Data'])  : 0;
    const upTrend    = trender ? toNum(trender['UpTrend'])   : 0;
    const downTrend  = trender ? toNum(trender['DownTrend']) : 0;
    const histogram  = rsimacd ? toNum(rsimacd['Histogram']) : 0;

    // 6-condition scoring — each = 1 point
    function scoreLong() {
      let n = 0;
      if (ema9 > ema21)                       n++; // 1. EMA trend bullish
      if (upTrend > 0)                        n++; // 2. MaverickTrender bullish
      if (bullArrow > 0)                      n++; // 3. Maverick Arrow bullish
      if (mavGuide > 0 && price > mavGuide)   n++; // 4. Price above MaverickGuide
      if (mav200 > 0 && price > mav200)       n++; // 5. Price above Maverick200
      if (histogram > 0)                      n++; // 6. RSI MACD momentum bullish
      return n;
    }

    function scoreShort() {
      let n = 0;
      if (ema9 < ema21)                       n++;
      if (downTrend > 0)                      n++;
      if (bearArrow > 0)                      n++;
      if (mavGuide > 0 && price < mavGuide)   n++;
      if (mav200 > 0 && price < mav200)       n++;
      if (histogram < 0)                      n++;
      return n;
    }

    // Entry triggers only — Maverick is confirmation, not a standalone alert
    const ENTRY_SIGNALS = [
      { key: 'AMD_LONG',  name: 'AMD Long',  val: toNum(pd['AMD Long']),  dir: 'long',  emoji: '⚡' },
      { key: 'AMD_SHORT', name: 'AMD Short', val: toNum(pd['AMD Short']), dir: 'short', emoji: '⚡' },
      { key: 'ORB_LONG',  name: 'ORB Long',  val: toNum(pd['ORB Long']),  dir: 'long',  emoji: '📈' },
      { key: 'ORB_SHORT', name: 'ORB Short', val: toNum(pd['ORB Short']), dir: 'short', emoji: '📉' },
    ];

    for (const sig of ENTRY_SIGNALS) {
      const alreadyFired = firedSignals.has(sig.key);

      if (sig.val > 0 && !alreadyFired) {
        firedSignals.add(sig.key);

        const score = sig.dir === 'long' ? scoreLong() : scoreShort();

        if (score < 3) {
          console.log(`[monitor] ${sig.key} fired — only ${score}/6 conditions met, skipping`);
          continue;
        }

        const label = score >= 5 ? '🔥 STRONG' : '✅ SETUP';
        await sendNtfy(
          `${label} — ${sig.emoji} ${sig.name} — ${symbol}`,
          `Price: ${price.toFixed(2)}  |  ${score}/6 conditions met\nEMA 9: ${ema9.toFixed(2)}  |  EMA 21: ${ema21.toFixed(2)}\nOpen Trading Desk AI → ✓ Check Trade`
        );
      } else if (sig.val === 0 && alreadyFired) {
        firedSignals.delete(sig.key);
      }
    }
  } catch (e) {
    console.log('[monitor] poll error:', e.message);
  }
}

setInterval(checkSignals, 60 * 1000);
console.log(`[monitor] Signal watch active — ntfy.sh topic: ${NTFY_TOPIC}`);

server.listen(PORT, () => {
  console.log(`[bridge] TradingView bridge running on http://localhost:${PORT}`);
  console.log(`[bridge] WebSocket live feed on ws://localhost:${PORT}/live`);
});
