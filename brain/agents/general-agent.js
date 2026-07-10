/**
 * General Agent — handles any task that doesn't fit a specialized agent.
 * Has access to all tools and full OVTLYR context.
 */
import { BaseAgent } from './base-agent.js';
import { OVTLYR_TOOL_DEFS, executeOvtlyrTool } from '../tools/ovtlyr-tools.js';
import { TV_TOOL_DEFS, executeTvTool } from '../tools/tv-tools.js';
import { WEB_TOOL_DEFS, executeWebTool } from '../tools/web-tools.js';
import { getOvtlyrContext } from '../knowledge/ovtlyr.js';
import { snapshot } from '../core/memory.js';
import { loadRules } from '../config.js';

const BASE_SYSTEM = `You are an intelligent AI assistant with expertise in trading, finance, research, and business.

You have access to TradingView market data, OVTLYR trading signals, and web search.

Trading philosophy you follow:
${getOvtlyrContext('minimal')}

Be direct, accurate, and actionable. Use tools when you need real data — don't guess at prices or signals.`;

export class GeneralAgent extends BaseAgent {
  constructor() {
    super('General');
  }

  async run_task(task, model) {
    // Inject relevant memory
    const recentMemory = snapshot('trading', 5);
    const memStr = recentMemory.length
      ? `\n\nRecent context:\n${recentMemory.map(m => `- ${m.key}: ${JSON.stringify(m.value).substring(0, 100)}`).join('\n')}`
      : '';

    const allTools = [...OVTLYR_TOOL_DEFS, ...TV_TOOL_DEFS, ...WEB_TOOL_DEFS];

    const result = await this.run({
      model,
      system: BASE_SYSTEM + memStr,
      task,
      tools: allTools,
      executeTool: async (name, input) => {
        if (OVTLYR_TOOL_DEFS.some(t => t.name === name)) return executeOvtlyrTool(name, input);
        if (TV_TOOL_DEFS.some(t => t.name === name))     return executeTvTool(name, input);
        return executeWebTool(name, input);
      },
      stream: true,
    });

    return result;
  }
}
