/**
 * Claude Code session hook — preserves trading context through compaction.
 *
 * Events:
 *   precompact  → outputs recent brain decisions so compaction preserves them
 *   stop        → writes a session state snapshot from the audit log
 *
 * Usage (via .claude/settings.json):
 *   node .claude/hooks/session-summary.js precompact
 *   node .claude/hooks/session-summary.js stop
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dir, '..', '..');
const AUDIT_PATH   = join(PROJECT_ROOT, 'brain', 'data', 'audit.ndjson');
const STATE_FILE   = join(PROJECT_ROOT, '.claude', 'session-state.md');

const event = process.argv[2];

function readAuditRecent(n = 5) {
  try {
    if (!existsSync(AUDIT_PATH)) return [];
    const lines = readFileSync(AUDIT_PATH, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-n).map(l => JSON.parse(l)).reverse();
  } catch {
    return [];
  }
}

function buildStateMarkdown(entries) {
  if (!entries.length) return '# Trading Session State\n_No recent brain runs_\n';

  const lines = ['# Trading Session State', `_Updated: ${new Date().toISOString()}_`, ''];

  for (const e of entries) {
    const cost = e.cost_usd != null ? ` ($${e.cost_usd})` : '';
    const tools = e.tools_used?.length ? ` [${e.tools_used.join(', ')}]` : '';
    lines.push(`## ${e.at?.substring(0, 16)} — ${e.agent || 'brain'}${cost}`);
    lines.push(`**Task:** ${e.task}`);
    lines.push(`**Model:** ${e.model} | complexity ${e.complexity} | ${e.domain}${tools}`);
    if (e.result) lines.push(`**Result (excerpt):** ${String(e.result).substring(0, 300)}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  if (event === 'precompact') {
    if (existsSync(STATE_FILE)) {
      const state = readFileSync(STATE_FILE, 'utf8');
      process.stdout.write('\n=== BARAK BRAIN — TRADING SESSION STATE (preserve through compaction) ===\n');
      process.stdout.write(state);
      process.stdout.write('\n=== END TRADING SESSION STATE ===\n\n');
    } else {
      const entries = readAuditRecent(3);
      if (entries.length) {
        process.stdout.write('\n=== BARAK BRAIN — RECENT DECISIONS ===\n');
        for (const e of entries) {
          process.stdout.write(`[${e.at?.substring(0, 16)}] ${e.agent}: ${e.task} → ${String(e.result || '').substring(0, 150)}\n`);
        }
        process.stdout.write('=== END ===\n\n');
      }
    }
  } else if (event === 'stop') {
    const entries = readAuditRecent(5);
    const md = buildStateMarkdown(entries);
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, md, 'utf8');
  }
}

main().catch(() => {}).finally(() => process.exit(0));
