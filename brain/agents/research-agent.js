/**
 * Research Agent — general-purpose knowledge and web research.
 * Used for: explaining concepts, researching companies, answering questions.
 */
import { BaseAgent } from './base-agent.js';
import { WEB_TOOL_DEFS, executeWebTool } from '../tools/web-tools.js';
import { TV_TOOL_DEFS, executeTvTool } from '../tools/tv-tools.js';
import { recall, remember } from '../core/memory.js';
import { loadRules } from '../config.js';

const SYSTEM = `You are a research assistant with expertise in trading, finance, and general business.

You have access to:
- Web fetch tool to read any URL
- TradingView tools to get market data

When researching trading topics, always relate findings back to practical trading decisions.
Be thorough but concise. Cite sources when fetching web content.
Store key findings as structured summaries.`;

export class ResearchAgent extends BaseAgent {
  constructor() {
    super('Research');
  }

  async research(task, model) {
    const rules = loadRules();
    const systemWithContext = `${SYSTEM}\n\nUser's current trading strategy context:\n${JSON.stringify(rules?.strategies || {}, null, 2).substring(0, 1000)}`;

    const tools = [...WEB_TOOL_DEFS, ...TV_TOOL_DEFS];

    const result = await this.run({
      model,
      system: systemWithContext,
      task,
      tools,
      executeTool: async (name, input) => {
        if (WEB_TOOL_DEFS.some(t => t.name === name)) return executeWebTool(name, input);
        return executeTvTool(name, input);
      },
      stream: true,
    });

    // Cache research results
    const key = `research_${Date.now()}`;
    remember(key, { task, summary: result.text.substring(0, 600) }, 'research');

    return result;
  }
}
