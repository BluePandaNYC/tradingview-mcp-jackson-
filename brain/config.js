import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// Model tiers — swap any model here, every agent auto-updates
export const MODELS = {
  fast:    'claude-haiku-4-5-20251001',   // simple lookups, formatting, summaries
  smart:   'claude-sonnet-4-6',            // analysis, multi-step reasoning
  deep:    'claude-sonnet-4-6',            // complex strategy (upgrade to opus-4-8 anytime)
};

// Complexity → model tier mapping
export function modelForComplexity(score) {
  if (score <= 2) return MODELS.fast;
  if (score <= 3) return MODELS.smart;
  return MODELS.deep;
}

// Approximate token cost per 1M (USD) — used for audit cost estimates
export const COST_PER_1M = {
  [MODELS.fast]:  { input: 0.80,  output: 4.00  },
  [MODELS.smart]: { input: 3.00,  output: 15.00 },
  [MODELS.deep]:  { input: 3.00,  output: 15.00 },
};

// Paths
export const PATHS = {
  root:        ROOT,
  memory:      join(ROOT, 'brain', 'data', 'memory.json'),
  audit:       join(ROOT, 'brain', 'data', 'audit.ndjson'),
  rules:       join(ROOT, 'rules.json'),
  methodology: join(ROOT, 'OVTLYR_COMPLETE_METHODOLOGY.md'),
};

// Load rules.json once
export function loadRules() {
  try {
    return JSON.parse(readFileSync(PATHS.rules, 'utf8'));
  } catch {
    return {};
  }
}

// Anthropic API key — from env
export function getApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set in environment');
  return key;
}
