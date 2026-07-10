/**
 * Risk Agent — calculates position sizing, ATR-based stops, and risk metrics.
 * Uses Haiku for pure math tasks (cheap), Sonnet if analysis needed.
 */
import { BaseAgent } from './base-agent.js';
import { TV_TOOL_DEFS, executeTvTool } from '../tools/tv-tools.js';
import { recall } from '../core/memory.js';

const SYSTEM = `You are a precise risk management calculator for an options trend-trading system.

POSITION SIZING RULES:
- Max risk per trade: 6% of portfolio value
- ATR-based stop distance: use 1.5× ATR from entry as stop
- Position $ = Portfolio_Value × 0.06 ÷ ATR_stop_distance
- Options: use delta-adjusted sizing (80-delta option moves ~$0.80 per $1 stock move)
- Reduce position by 50% if ATR > 4% of stock price (high volatility)
- Rolling trigger: delta drops below 60 → evaluate rolling up and out

OUTPUT FORMAT:
Given: stock price, ATR, portfolio size
Output:
  Stop price: $X (1.5× ATR below entry)
  Risk $: $X (6% of portfolio)
  Share qty: X shares
  Options qty: X contracts
  Max loss: $X
  Notes: [any warnings about volatility]

Be precise. Show your math.`;

export class RiskAgent extends BaseAgent {
  constructor() {
    super('Risk');
  }

  async calculate(task, model) {
    const result = await this.run({
      model,
      system: SYSTEM,
      task,
      tools: TV_TOOL_DEFS,
      executeTool: executeTvTool,
      stream: true,
    });
    return result;
  }
}
