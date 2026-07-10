/**
 * Summary Agent — cheap Haiku-based summarization.
 * Used when we need to condense large outputs before storing in memory.
 */
import { BaseAgent } from './base-agent.js';
import { MODELS } from '../config.js';

const SYSTEM = `You are a concise summarizer. Extract key facts and decisions.
Output bullet points. Max 200 words. No fluff.`;

export class SummaryAgent extends BaseAgent {
  constructor() {
    super('Summary');
  }

  async summarize(text) {
    return this.run({
      model: MODELS.fast,
      system: SYSTEM,
      task: `Summarize this:\n\n${text}`,
      tools: [],
      stream: true,
    });
  }
}
