import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../data/', import.meta.url));
const SEEN = DIR + 'seen-events.json';
const SUBS = DIR + 'subscribers.json';

const read = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
const write = (file, data) => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
};

/**
 * État des événements connus : { [id]: { inStock: boolean, misses: number } }
 * (l'ancien format, un simple tableau d'ids, est converti). null = premier lancement.
 */
export function loadState() {
  const d = read(SEEN);
  if (d === null) return null;
  if (Array.isArray(d)) return Object.fromEntries(d.map((id) => [id, { inStock: true, misses: 0 }]));
  return d;
}
export const saveState = (state) => write(SEEN, state);

// Anciennes API (bot gateway index.js)
export const loadSeen = () => {
  const s = loadState();
  return s ? new Set(Object.keys(s)) : null;
};
export const saveSeen = (seen) => write(SEEN, [...seen]);

export const loadSubscribers = () => new Set(read(SUBS) ?? []);
export const saveSubscribers = (subs) => write(SUBS, [...subs]);
