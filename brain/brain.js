#!/usr/bin/env node
/**
 * BARAK Brain CLI
 * Usage:
 *   node brain/brain.js "check OVTLYR signals and tell me what plan is active"
 *   node brain/brain.js --stats
 *   node brain/brain.js --memory
 *   node brain/brain.js --audit 5
 *   node brain/brain.js  (interactive mode)
 */
import 'dotenv/config';
import { createInterface } from 'readline';
import { run } from './core/orchestrator.js';
import { stats, recent } from './core/audit.js';
import { snapshot, search } from './core/memory.js';

const args = process.argv.slice(2);

// ── Utility commands ──────────────────────────────────────────
if (args[0] === '--stats') {
  const s = stats();
  console.log('\nBrain Stats:');
  console.log(`  Total tasks:  ${s.tasks}`);
  console.log(`  Total cost:   $${s.cost_usd}`);
  console.log(`  By model:     ${JSON.stringify(s.by_model)}`);
  process.exit(0);
}

if (args[0] === '--audit') {
  const n = parseInt(args[1]) || 5;
  const entries = recent(n);
  console.log(`\nLast ${n} brain decisions:\n`);
  for (const e of entries) {
    console.log(`[${e.at}] ${e.agent} | ${e.model} | complexity=${e.complexity}`);
    console.log(`  Task: ${e.task?.substring(0, 80)}`);
    console.log(`  Cost: $${e.cost_usd || 0} | Tokens: ${JSON.stringify(e.tokens)}`);
    console.log(`  Tools: ${e.tools_used?.join(', ') || 'none'}`);
    console.log('');
  }
  process.exit(0);
}

if (args[0] === '--memory') {
  const tag = args[1] || 'trading';
  const entries = snapshot(tag, 20);
  console.log(`\nMemory (tag=${tag}):\n`);
  for (const e of entries) {
    console.log(`  [${e.at}] ${e.key}: ${JSON.stringify(e.value).substring(0, 120)}`);
  }
  process.exit(0);
}

if (args[0] === '--search') {
  const query = args.slice(1).join(' ');
  const results = search(query, 10);
  console.log(`\nMemory search: "${query}"\n`);
  for (const e of results) {
    console.log(`  ${e.key} [${e.at}]: ${JSON.stringify(e.value).substring(0, 100)}`);
  }
  process.exit(0);
}

// ── Single task from CLI argument ─────────────────────────────
if (args.length > 0 && !args[0].startsWith('--')) {
  const task = args.join(' ');
  const result = await run(task);
  console.log(`\n[Done: ${result.duration_ms}ms | ${result.model} | tokens: ${JSON.stringify(result.tokens)}]`);
  process.exit(0);
}

// ── Interactive REPL mode ─────────────────────────────────────
console.log('\n🧠 BARAK Brain — Interactive Mode');
console.log('Commands: --stats, --audit N, --memory, --search <query>, exit\n');

const rl = createInterface({ input: process.stdin, output: process.stdout });
const prompt = () => rl.question('Brain> ', async (input) => {
  const trimmed = input.trim();
  if (!trimmed || trimmed === 'exit' || trimmed === 'quit') {
    console.log('Goodbye.');
    rl.close();
    return;
  }

  if (trimmed === '--stats') {
    const s = stats();
    console.log(`Tasks: ${s.tasks} | Cost: $${s.cost_usd} | Models: ${JSON.stringify(s.by_model)}`);
  } else if (trimmed.startsWith('--memory')) {
    const tag = trimmed.split(' ')[1] || 'trading';
    snapshot(tag, 10).forEach(e => console.log(`  ${e.key}: ${JSON.stringify(e.value).substring(0, 100)}`));
  } else if (trimmed.startsWith('--search ')) {
    search(trimmed.slice(9), 5).forEach(e => console.log(`  ${e.key}: ${JSON.stringify(e.value).substring(0, 100)}`));
  } else {
    try {
      const result = await run(trimmed);
      console.log(`\n[Done: ${result.duration_ms}ms | ${result.model} | $${result.tokens?.output ? ((result.tokens.output / 1e6) * 15).toFixed(5) : '?'}]\n`);
    } catch (err) {
      console.error(`\nError: ${err.message}\n`);
    }
  }

  prompt();
});

prompt();
