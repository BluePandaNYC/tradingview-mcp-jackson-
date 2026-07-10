/**
 * TradingView tool wrappers for use inside brain agents.
 * Imports directly from src/core — same process, no subprocess overhead.
 */
import * as chart  from '../../src/core/chart.js';
import * as data   from '../../src/core/data.js';
import * as health from '../../src/core/health.js';

// Cached per-process result: null = unchecked, true/false = result
let tvAvailable = null;

async function isTvAvailable() {
  if (tvAvailable !== null) return tvAvailable;
  try {
    const abort = new AbortController();
    setTimeout(() => abort.abort(), 1500);
    const resp = await fetch('http://localhost:9222/json/list', { signal: abort.signal });
    const targets = await resp.json();
    tvAvailable = targets.some(t => t.type === 'page' && /tradingview\.com/i.test(t.url));
  } catch {
    tvAvailable = false;
  }
  return tvAvailable;
}

/**
 * Tool definitions for Anthropic tool_use (Claude sees these as available actions).
 */
export const TV_TOOL_DEFS = [
  {
    name: 'tv_get_quote',
    description: 'Get real-time price quote for a symbol currently on TradingView chart.',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Symbol to quote, e.g. SPY, QQQ, AAPL' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'tv_get_ohlcv',
    description: 'Get OHLCV price summary for a symbol (high, low, range, change%, avg volume, last 5 bars).',
    input_schema: {
      type: 'object',
      properties: {
        symbol:    { type: 'string' },
        timeframe: { type: 'string', description: 'e.g. D (daily), 60 (hourly), 5 (5-min)', default: 'D' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'tv_get_indicators',
    description: 'Get current indicator values (EMA, RSI, MACD, etc.) from the TradingView chart.',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Symbol to analyze' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'tv_health',
    description: 'Check if TradingView is connected and responding.',
    input_schema: { type: 'object', properties: {} },
  },
];

/**
 * Execute a TradingView tool call by name.
 * Returns a string result suitable for Claude's tool_result block.
 */
export async function executeTvTool(name, input) {
  if (name !== 'tv_health' && !await isTvAvailable()) {
    return 'TradingView not connected — open tradingview.com/chart in Chrome first.';
  }

  switch (name) {
    case 'tv_get_quote': {
      await chart.setSymbol({ symbol: input.symbol });
      await new Promise(r => setTimeout(r, 800));
      const result = await data.getQuote({});
      return JSON.stringify(result, null, 2);
    }

    case 'tv_get_ohlcv': {
      await chart.setSymbol({ symbol: input.symbol });
      if (input.timeframe) await chart.setTimeframe({ timeframe: input.timeframe });
      await new Promise(r => setTimeout(r, 800));
      const result = await data.getOhlcv({ summary: true, count: 5 });
      return JSON.stringify(result, null, 2);
    }

    case 'tv_get_indicators': {
      await chart.setSymbol({ symbol: input.symbol });
      await new Promise(r => setTimeout(r, 800));
      const result = await data.getStudyValues({});
      return JSON.stringify(result, null, 2);
    }

    case 'tv_health': {
      const result = await health.healthCheck();
      return JSON.stringify(result);
    }

    default:
      return `Unknown TV tool: ${name}`;
  }
}
