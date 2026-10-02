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

export const loadSeen = () => {
  const d = read(SEEN);
  return d ? new Set(d) : null;
};
export const saveSeen = (seen) => write(SEEN, [...seen]);

export const loadSubscribers = () => new Set(read(SUBS) ?? []);
export const saveSubscribers = (subs) => write(SUBS, [...subs]);
