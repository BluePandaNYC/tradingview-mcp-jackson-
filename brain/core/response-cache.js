/**
 * Semantic response cache — stores full brain results keyed by normalized task hash.
 *
 * TTL by domain:
 *   lookup   →  5 min  (price quotes change fast)
 *   trading  → 15 min  (screener / dashboard refresh window)
 *   summary  → 30 min
 *   general  → 30 min
 *   strategy → 60 min  (strategic analysis is stable within a session)
 *   research → 2 hr    (research content doesn't change intra-day)
 *
 * Bypass keywords: if the task mentions "fresh", "live", "now", "force", "latest",
 * "current price", "right now", or "real-time" the cache is skipped entirely.
 * The execution domain is always bypassed (live trading action).
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PATHS } from '../config.js';

const CACHE_DIR = join(dirname(PATHS.audit), 'response-cache');

const TTL_MS = {
  lookup:    5  * 60 * 1000,
  trading:   15 * 60 * 1000,
  summary:   30 * 60 * 1000,
  general:   30 * 60 * 1000,
  strategy:  60 * 60 * 1000,
  research: 120 * 60 * 1000,
};

const BYPASS_RE = /\b(fresh|force|live|right now|real.?time|latest price|current price|update|refresh)\b/i;

const BYPASS_DOMAINS = new Set(['execution']);

function normalize(task) {
  return task.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[?.!,]/g, '');
}

function hashTask(normalized) {
  return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

function cacheFile(hash) {
  return join(CACHE_DIR, `${hash}.json`);
}

function ensureDir() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Check whether this task should bypass the cache entirely.
 */
export function shouldBypass(task, domain) {
  if (BYPASS_DOMAINS.has(domain)) return true;
  if (BYPASS_RE.test(task)) return true;
  return false;
}

/**
 * Look up a cached result. Returns the cached entry or null.
 */
export function get(task, domain) {
  try {
    const key = hashTask(normalize(task));
    const file = cacheFile(key);
    if (!existsSync(file)) return null;

    const entry = JSON.parse(readFileSync(file, 'utf8'));
    const ttl = TTL_MS[domain] ?? TTL_MS.general;
    if (Date.now() - entry.at > ttl) {
      unlinkSync(file);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

/**
 * Store a result in the cache.
 */
export function set(task, domain, result) {
  try {
    ensureDir();
    const normalized = normalize(task);
    const key = hashTask(normalized);
    const entry = {
      hash:       key,
      task:       normalized,
      domain,
      result_text: result.text,
      tools_used:  result.tools_used || [],
      model:       result.model,
      at:          Date.now(),
    };
    writeFileSync(cacheFile(key), JSON.stringify(entry, null, 2), 'utf8');
  } catch {
    // cache write failure is non-fatal
  }
}

/**
 * Evict all entries older than their TTL. Call occasionally to keep the dir small.
 */
export function evictExpired() {
  try {
    ensureDir();
    const files = readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    let evicted = 0;
    for (const f of files) {
      try {
        const entry = JSON.parse(readFileSync(join(CACHE_DIR, f), 'utf8'));
        const ttl = TTL_MS[entry.domain] ?? TTL_MS.general;
        if (Date.now() - entry.at > ttl) {
          unlinkSync(join(CACHE_DIR, f));
          evicted++;
        }
      } catch {
        unlinkSync(join(CACHE_DIR, f));
        evicted++;
      }
    }
    return evicted;
  } catch {
    return 0;
  }
}

/**
 * Return cache stats: total entries, total size estimate.
 */
export function stats() {
  try {
    ensureDir();
    const files = readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    return { entries: files.length, dir: CACHE_DIR };
  } catch {
    return { entries: 0, dir: CACHE_DIR };
  }
}
