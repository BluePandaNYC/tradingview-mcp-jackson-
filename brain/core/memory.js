/**
 * Simple persistent memory — JSON file, searchable by keyword.
 * No vector DB needed at our scale. Faster, zero extra deps, fully readable.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { PATHS } from '../config.js';

function ensureFile() {
  const dir = dirname(PATHS.memory);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(PATHS.memory)) writeFileSync(PATHS.memory, '{}', 'utf8');
}

function load() {
  ensureFile();
  try {
    return JSON.parse(readFileSync(PATHS.memory, 'utf8'));
  } catch {
    return {};
  }
}

function save(store) {
  ensureFile();
  writeFileSync(PATHS.memory, JSON.stringify(store, null, 2), 'utf8');
}

/**
 * Write a memory entry.
 * @param {string} key - e.g. 'spy_signal', 'last_trade', 'user_preference'
 * @param {any} value - anything JSON-serializable
 * @param {string} [tag] - optional category tag ('trading', 'user', 'research')
 */
export function remember(key, value, tag = 'general') {
  const store = load();
  store[key] = { value, tag, at: new Date().toISOString() };
  save(store);
}

/**
 * Read a memory entry by exact key.
 */
export function recall(key) {
  const store = load();
  return store[key]?.value ?? null;
}

/**
 * Search memory entries whose key or serialized value contains the query string.
 * Returns up to `limit` most recent matches.
 */
export function search(query, limit = 10) {
  const store = load();
  const q = query.toLowerCase();
  return Object.entries(store)
    .filter(([k, v]) =>
      k.toLowerCase().includes(q) ||
      JSON.stringify(v.value).toLowerCase().includes(q)
    )
    .sort((a, b) => new Date(b[1].at) - new Date(a[1].at))
    .slice(0, limit)
    .map(([k, v]) => ({ key: k, ...v }));
}

/**
 * Return all entries for a given tag, sorted newest first.
 */
export function recallByTag(tag, limit = 20) {
  const store = load();
  return Object.entries(store)
    .filter(([, v]) => v.tag === tag)
    .sort((a, b) => new Date(b[1].at) - new Date(a[1].at))
    .slice(0, limit)
    .map(([k, v]) => ({ key: k, ...v }));
}

/**
 * Delete a memory entry.
 */
export function forget(key) {
  const store = load();
  delete store[key];
  save(store);
}

/**
 * Snapshot the whole memory store (for agent context injection).
 */
export function snapshot(tag, limit = 15) {
  return recallByTag(tag, limit);
}
