/**
 * Market Analyst Agent
 * Reads OVTLYR signals + TradingView data and makes trade decisions
 * using the full OVTLYR 9-confirmation framework.
 */
import { BaseAgent } from './base-agent.js';
import { OVTLYR_TOOL_DEFS, executeOvtlyrTool } from '../tools/ovtlyr-tools.js';
import { TV_TOOL_DEFS, executeTvTool } from '../tools/tv-tools.js';
import { getOvtlyrContext } from '../knowledge/ovtlyr.js';
import { recall, remember } from '../core/memory.js';

const SYSTEM = `You are the Market Analyst for a disciplined OVTLYR trend-following trading system.

Your job: read live market signals and give a clear, actionable trading decision.

${getOvtlyrContext('full')}

BEHAVIOR RULES:
- Always check OVTLYR dashboard first (SPY/QQQ scores)
- If QQQ < 5/9 or SELL signal → recommend Plan SICADFU immediately
- If SPY ≥ 6/9 BUY → check sectors, then stocks
- State exactly which plan is active (Plan M, Plan ETF, SICADFU)
- Give specific ticker recommendations with confirmation count
- Never recommend selling options
- Be concise and decisive — no hedging on clear signals

Output format:
MARKET STATUS: [BULLISH/BEARISH/MIXED]
ACTIVE PLAN: [Plan M / Plan ETF / Plan SICADFU]
SPY: X/9 [BUY/SELL]
QQQ: X/9 [BUY/SELL]
BEST SECTOR: [sector name]
TOP CANDIDATES: [list of tickers with scores]
ACTION: [specific recommendation]
REASONING: [brief explanation]`;

export class MarketAnalystAgent extends BaseAgent {
  constructor() {
    super('MarketAnalyst');
  }

  async analyze(task, model) {
    // Inject recent memory context
    const lastSignal = recall('last_market_status');
    const taskWithContext = lastSignal
      ? `${task}\n\n[Previous signal: ${JSON.stringify(lastSignal)}]`
      : task;

    const tools = [...OVTLYR_TOOL_DEFS, ...TV_TOOL_DEFS];

    const result = await this.run({
      model,
      system: SYSTEM,
      task: taskWithContext,
      tools,
      executeTool: async (name, input) => {
        if (OVTLYR_TOOL_DEFS.some(t => t.name === name)) {
          return executeOvtlyrTool(name, input);
        }
        return executeTvTool(name, input);
      },
      stream: true,
    });

    // Store the signal in memory
    remember('last_market_status', { text: result.text.substring(0, 500), at: new Date().toISOString() }, 'trading');

    return result;
  }
}
