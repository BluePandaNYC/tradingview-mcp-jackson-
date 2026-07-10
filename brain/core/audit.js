/**
 * Append-only audit log — every brain decision recorded as NDJSON.
 * Use: node brain/tools/audit-viewer.js to read.
 */
import { appendFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { dirname } from 'path';
import { PATHS, COST_PER_1M } from '../config.js';

function ensureDir() {
  const dir = dirname(PATHS.audit);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Log a completed brain decision.
 */
export function log(entry) {
  ensureDir();
  const line = JSON.stringify({
    id:        entry.id || crypto.randomUUID(),
    at:        new Date().toISOString(),
    task:      entry.task,
    agent:     entry.agent,
    model:     entry.model,
    complexity: entry.complexity,
    domain:    entry.domain,
    result:    entry.result,
    tools_used: entry.tools_used || [],
    tokens:    entry.tokens || {},
    cost_usd:  estimateCost(entry.model, entry.tokens),
    duration_ms: entry.duration_ms,
  }) + '\n';
  appendFileSync(PATHS.audit, line, 'utf8');
}

function estimateCost(model, tokens = {}) {
  const rates = COST_PER_1M[model];
  if (!rates) return null;
  const inputCost  = ((tokens.input  || 0) / 1_000_000) * rates.input;
  const outputCost = ((tokens.output || 0) / 1_000_000) * rates.output;
  return parseFloat((inputCost + outputCost).toFixed(6));
}

/**
 * Return the last N audit entries (for display/debugging).
 */
export function recent(n = 10) {
  try {
    ensureDir();
    if (!existsSync(PATHS.audit)) return [];
    const lines = readFileSync(PATHS.audit, 'utf8')
      .trim().split('\n').filter(Boolean);
    return lines.slice(-n).map(l => JSON.parse(l)).reverse();
  } catch {
    return [];
  }
}

/**
 * Summarize total cost and task count from audit log.
 */
export function stats() {
  try {
    if (!existsSync(PATHS.audit)) return { tasks: 0, cost_usd: 0 };
    const lines = readFileSync(PATHS.audit, 'utf8')
      .trim().split('\n').filter(Boolean)
      .map(l => JSON.parse(l));
    return {
      tasks:    lines.length,
      cost_usd: lines.reduce((s, l) => s + (l.cost_usd || 0), 0).toFixed(4),
      by_model: lines.reduce((acc, l) => {
        acc[l.model] = (acc[l.model] || 0) + 1;
        return acc;
      }, {}),
    };
  } catch {
    return { tasks: 0, cost_usd: 0 };
  }
}
