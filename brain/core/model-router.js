/**
 * Model Router — classifies task complexity and selects the right model.
 * This is what makes the brain cost-efficient: don't use Opus to format a date.
 */
import { modelForComplexity } from '../config.js';

// Domain → default complexity baseline
const DOMAIN_BASELINE = {
  lookup:    1,  // "what is the current price of X"
  summary:   1,  // "summarize this text"
  trading:   3,  // "check OVTLYR signals and decide"
  research:  3,  // "research this topic"
  strategy:  4,  // "build a trading plan for this week"
  execution: 3,  // "place a trade with these parameters"
  general:   2,  // everything else
};

// Keywords that push complexity UP
const COMPLEXITY_BOOSTERS = [
  { keywords: ['compare', 'analyze', 'synthesize', 'evaluate', 'why', 'should i'],  delta: +1 },
  { keywords: ['strategy', 'plan', 'optimize', 'backtest', 'portfolio'],              delta: +1 },
  { keywords: ['comprehensive', 'thorough', 'deep dive', 'full analysis'],            delta: +2 },
  { keywords: ['9 confirmation', 'ovtlyr', 'nine', 'checklist'],                     delta: +1 },
];

// Keywords that push complexity DOWN
const COMPLEXITY_REDUCERS = [
  { keywords: ['quick', 'brief', 'simple', 'just', 'what is', 'price of'],  delta: -1 },
  { keywords: ['format', 'list', 'show me', 'display', 'print'],             delta: -1 },
  { keywords: ['yes or no', 'is it', 'did it'],                              delta: -1 },
];

/**
 * Detect domain from task text.
 */
export function detectDomain(task) {
  const t = task.toLowerCase();
  if (/\b(spy|qqq|tqqq|ovtlyr|signal|breadth|sector|screener|trade|stock|etf|option|position)\b/.test(t)) return 'trading';
  if (/\b(research|news|article|learn|explain|what is|how does)\b/.test(t)) return 'research';
  if (/\b(strategy|plan|portfolio|allocation|rebalance)\b/.test(t)) return 'strategy';
  if (/\b(buy|sell|order|execute|place|open|close)\b/.test(t)) return 'execution';
  if (/\b(price|quote|how much|current|value)\b/.test(t)) return 'lookup';
  if (/\b(summarize|summary|brief|tldr)\b/.test(t)) return 'summary';
  return 'general';
}

/**
 * Score task complexity 1-5 and return the appropriate model.
 */
export function route(task, domainOverride) {
  const domain = domainOverride || detectDomain(task);
  let score = DOMAIN_BASELINE[domain] ?? 2;
  const t = task.toLowerCase();

  for (const { keywords, delta } of COMPLEXITY_BOOSTERS) {
    if (keywords.some(k => t.includes(k))) score += delta;
  }
  for (const { keywords, delta } of COMPLEXITY_REDUCERS) {
    if (keywords.some(k => t.includes(k))) score += delta;
  }

  score = Math.max(1, Math.min(5, score));
  const model = modelForComplexity(score);

  return { domain, complexity: score, model };
}
