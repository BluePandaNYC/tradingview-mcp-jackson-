/**
 * Orchestrator — the brain's central router.
 * Receives a task, decides which agent handles it, logs the decision.
 */
import { route, detectDomain } from './model-router.js';
import { log as auditLog } from './audit.js';
import { shouldBypass, get as cacheGet, set as cacheSet, evictExpired } from './response-cache.js';
import { MarketAnalystAgent } from '../agents/market-analyst.js';
import { ResearchAgent }      from '../agents/research-agent.js';
import { RiskAgent }          from '../agents/risk-agent.js';
import { SummaryAgent }       from '../agents/summary-agent.js';
import { GeneralAgent }       from '../agents/general-agent.js';

// Agent registry — domain → agent class
const AGENT_REGISTRY = {
  trading:   () => new MarketAnalystAgent(),
  strategy:  () => new MarketAnalystAgent(),
  execution: () => new MarketAnalystAgent(),
  research:  () => new ResearchAgent(),
  lookup:    () => new GeneralAgent(),
  summary:   () => new SummaryAgent(),
  general:   () => new GeneralAgent(),
};

/**
 * Run a task through the brain.
 *
 * @param {string} task - Natural language task description
 * @param {object} [opts]
 * @param {string} [opts.domain] - Override domain detection
 * @param {boolean} [opts.verbose] - Print routing decision
 * @returns {object} { text, agent, model, domain, complexity, tokens, cost_usd }
 */
export async function run(task, opts = {}) {
  const start = Date.now();

  // Route the task
  const { domain, complexity, model } = route(task, opts.domain);
  const agentName = domain === 'summary' ? 'Summary' : domain;

  // Opportunistically evict stale cache entries (fast, non-blocking)
  evictExpired();

  // Cache lookup — skip for execution domain and bypass-keyword tasks
  if (!opts.noCache && !shouldBypass(task, domain)) {
    const cached = cacheGet(task, domain);
    if (cached) {
      if (opts.verbose !== false) {
        console.log(`\n[Brain] Cache hit for: "${task.substring(0, 80)}"`);
        console.log(`[Brain] Domain: ${domain} | Cached at: ${new Date(cached.at).toISOString()}\n${'─'.repeat(60)}`);
        process.stdout.write(cached.result_text + '\n');
      }
      return {
        text:       cached.result_text,
        agent:      agentName,
        model:      cached.model,
        domain,
        complexity,
        tokens:     { input: 0, output: 0 },
        duration_ms: 0,
        fromCache:  true,
      };
    }
  }

  if (opts.verbose !== false) {
    console.log(`\n[Brain] Task: "${task.substring(0, 80)}"`);
    console.log(`[Brain] Domain: ${domain} | Complexity: ${complexity}/5 | Model: ${model}`);
    console.log(`[Brain] Agent: ${agentName}\n${'─'.repeat(60)}`);
  }

  // Instantiate agent
  const agentFactory = AGENT_REGISTRY[domain] || AGENT_REGISTRY.general;
  const agent = agentFactory();

  // Execute
  let result;
  try {
    if (domain === 'trading' || domain === 'strategy' || domain === 'execution') {
      result = await agent.analyze(task, model);
    } else if (domain === 'research') {
      result = await agent.research(task, model);
    } else if (domain === 'summary') {
      result = await agent.summarize(task);
    } else if (domain === 'lookup' && agent.calculate) {
      result = await agent.calculate(task, model);
    } else {
      result = await agent.run_task(task, model);
    }
  } catch (err) {
    console.error(`\n[Brain] Agent error: ${err.message}`);
    result = { text: `Error: ${err.message}`, tools_used: [], tokens: {} };
  }

  const duration_ms = Date.now() - start;

  // Store result in cache for future identical/similar tasks
  if (!opts.noCache && !shouldBypass(task, domain) && result.text) {
    cacheSet(task, domain, { ...result, model });
  }

  // Audit log
  auditLog({
    task,
    agent:       agent.name,
    model,
    complexity,
    domain,
    result:      result.text?.substring(0, 500),
    tools_used:  result.tools_used,
    tokens:      result.tokens,
    duration_ms,
  });

  return {
    text:       result.text,
    agent:      agent.name,
    model,
    domain,
    complexity,
    tokens:     result.tokens,
    duration_ms,
  };
}
