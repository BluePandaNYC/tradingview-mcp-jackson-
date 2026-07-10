/**
 * OVTLYR domain knowledge — structured rules for the 9-confirmation system.
 * Agents inject this as context so Claude reasons correctly about signals.
 */

export const NINE_CONFIRMATIONS = `
OVTLYR 9-CONFIRMATION CHECKLIST (check in order, stop if any layer fails):

LAYER 1 — Market Trend (SPY daily chart)
  BULLISH: 10 EMA > 20 EMA AND price > 50 EMA
  BEARISH: 10 EMA crosses below 20 EMA OR price below 50 EMA

LAYER 2 — Market Signal
  OVTLYR BUY or SELL signal on SPY. Must be BUY to proceed.

LAYER 3 — Market Breadth
  Green line (% bullish stocks) vs Red line (10 EMA of that %).
  GREEN: green line above red AND rising (expanding participation).
  RED: green line below red OR falling.

LAYER 4 — Sector Fear & Greed Heatmap
  Find the sector recovering from fear (turning green). AVOID Healthcare.

LAYER 5 — Sector Breadth
  % of stocks in chosen sector meeting bullish criteria. Must be expanding.

LAYER 6 — Stock Trend
  Same 10/20/50 EMA template on the individual stock.

LAYER 7 — Stock Signal
  OVTLYR BUY signal on the stock itself.

LAYER 8 — Stock Fear & Greed
  Stock-level sentiment heatmap. Extreme fear = opportunity. Greed stall = exit.

LAYER 9 — OVTLYR Order Blocks
  Institutional price zones. Use for entry refinement and exit signals.
`;

export const PLAN_RULES = `
TRADING PLANS:

Plan M (Momentum — individual stocks):
  - All 9 layers green
  - Options: deep ITM calls, ~80 delta
  - Exit: 10/20 EMA cross down, stop loss, order block hit, or F&G stall
  - Avoid Healthcare sector

Plan ETF (ETF/TQQQ):
  - SPY AND QQQ both: uptrend + OVTLYR BUY signal
  - Position building: 40% initial → 30% on first confirm → 30% on second confirm (slingshot)
  - Tools: OVTLYR Channels (donkey channels) + Value Zone indicator
  - Exit: OVTLYR signal flip or 10/20 EMA cross down
  - CURRENTLY INACTIVE if QQQ SELL signal

Plan SICADFU (default when bearish):
  - Park capital in: BOXX (most tax-efficient), SGVA (wider duration), SGOV (original)
  - Earn ~3.9–4.1% APY while waiting
  - Avoid SGOV in December (annual dip)
  - Full portfolio allocation when market not bullish

Golden Rule: Market + Sector (70%) must be right BEFORE looking at stocks (30%).
NEVER sell options. Only BUY deep ITM calls (~80 delta).
`;

export const EXIT_SIGNALS = `
EXIT SIGNALS (any one triggers exit):
1. 10 EMA crosses below 20 EMA (trailing stop)
2. Hard stop loss hit
3. OVTLYR order block hit (price reaches block zone)
4. Fear & Greed heatmap stall (greed peaks, momentum reverses)
5. Gap and go vs crap check (morning gap fails to continue)
`;

export const POSITION_SIZING = `
POSITION SIZING:
- Risk % per trade: max 6% of portfolio
- ATR-adjusted: higher ATR (volatile stock) = smaller position
- Formula: Position $ = Portfolio × 0.06 ÷ ATR_distance_to_stop
- Rolling trigger: when option delta drops below ~60
- Roll up and out for a credit (ideal) or small debit
`;

export const SECTORS_TO_AVOID = ['Healthcare', 'Pharmaceuticals', 'Biotech'];

export const CASH_ALTERNATIVES = [
  { ticker: 'BOXX', description: 'Alpha Architect box-spread ETF, ~4.1% APY, most tax-efficient (capital gains, no dividends)', preferred: true },
  { ticker: 'SGVA', description: 'F/m Accumulator Ultrashort Treasury 0-12M, slightly higher yield than SGOV' },
  { ticker: 'SGOV', description: 'iShares 0-3M T-Bills, ~3.9% APY — avoid December (annual dip from dividend)' },
];

/**
 * Returns a compact context string for injection into agent system prompts.
 */
export function getOvtlyrContext(level = 'full') {
  if (level === 'minimal') return NINE_CONFIRMATIONS;
  return [NINE_CONFIRMATIONS, PLAN_RULES, EXIT_SIGNALS, POSITION_SIZING].join('\n\n');
}
