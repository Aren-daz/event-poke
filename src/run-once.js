// Exécution unique (GitHub Actions) : lit Gamespirit et envoie en DM aux ID listés dans
// SUBSCRIBER_IDS les événements Pokémon nouveaux OU de nouveau disponibles (un événement
// complet disparaît du site puis revient avec le même id quand une place se libère).
import 'dotenv/config';
import { fetchPokemonEvents, NetworkError } from './gamespirit.js';
import { loadState, saveState } from './store.js';
import { buildEmbed } from './notifier.js';

const API = 'https://discord.com/api/v10';
const token = process.env.DISCORD_TOKEN;
const ids = (process.env.SUBSCRIBER_IDS ?? '').split(/[\s,]+/).filter(Boolean);
const testMode = process.argv.includes('--test-event');
const MISSES_BEFORE_GONE = 2; // passages consécutifs sans voir l'événement avant de le considérer indisponible

if (!token) throw new Error('DISCORD_TOKEN manquant');
if (!ids.length) console.warn('SUBSCRIBER_IDS est vide : personne ne sera notifié');

async function discord(path, body, attempt = 0) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 429 && attempt < 3) {
    const { retry_after = 1 } = await res.json();
    await new Promise((r) => setTimeout(r, (retry_after + 0.2) * 1000));
    return discord(path, body, attempt + 1);
  }
  return res;
}

/** @returns {Promise<boolean>} true si le DM est bien parti */
async function sendDM(userId, ev, kind) {
  const dm = await discord('/users/@me/channels', { recipient_id: userId });
  if (!dm.ok) return console.error(`DM ${userId} : ouverture refusée (${dm.status}) ${await dm.text()}`), false;
  const { id } = await dm.json();
  const msg = await discord(`/channels/${id}/messages`, { embeds: [buildEmbed(ev, kind).toJSON()] });
  if (!msg.ok) return console.error(`DM ${userId} : envoi refusé (${msg.status}) ${await msg.text()}`), false;
  return true;
}

if (testMode) {
  const sample = {
    id: 'test', name: 'Défi de Ligue (TEST)', title: 'Défi de Ligue - 16 joueurs - 14h15 le 19/09/26 - Pokémon Trading Card Game',
    date: '19/09/26', time: '14h15', players: '16', price: '5,00 €', stock: 'En Stock',
    url: 'https://www2.gamespirit.fr/996-evenements',
  };
  for (const id of ids) console.log(id, (await sendDM(id, sample, 'new')) ? 'OK' : 'ÉCHEC');
  process.exit(0);
}

let events;
try {
  events = await fetchPokemonEvents();
} catch (err) {
  if (err instanceof NetworkError) {
    // Panne passagère du site : on ne fait pas échouer le workflow (sinon un mail d'erreur à chaque passage)
    console.log(`::warning::${err.message}`);
    process.exit(0);
  }
  throw err;
}

const prev = loadState();
const firstRun = prev === null;
const state = { ...(prev ?? {}) };
const current = new Map(events.map((e) => [e.id, e]));

const toNotify = [];
for (const ev of events) {
  const known = state[ev.id];
  if (!known) toNotify.push({ ev, kind: 'new' });
  else if (!known.inStock && ev.inStock) toNotify.push({ ev, kind: 'restock' });
  else state[ev.id] = { inStock: ev.inStock, misses: 0 };
}

// Événements connus qui ne sont plus sur la page (complets / retirés)
for (const [id, s] of Object.entries(state)) {
  if (current.has(id)) continue;
  const misses = (s.misses ?? 0) + 1;
  state[id] = { inStock: misses >= MISSES_BEFORE_GONE ? false : s.inStock, misses };
}

console.log(`${events.length} events Pokémon, ${toNotify.length} à notifier${firstRun ? ' (premier run, silencieux)' : ''}`);

for (const { ev, kind } of toNotify) {
  let delivered = firstRun || !ids.length;
  if (!firstRun) for (const id of ids) delivered = (await sendDM(id, ev, kind)) || delivered;
  if (delivered) {
    console.log(`${kind === 'restock' ? 'Retour en stock' : 'Nouveau'} : ${ev.title}`);
    state[ev.id] = { inStock: ev.inStock, misses: 0 };
  } else {
    console.error(`Aucun DM envoyé pour "${ev.name}" : réessai au prochain passage`);
  }
}
saveState(state);
