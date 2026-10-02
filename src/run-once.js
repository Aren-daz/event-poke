// Exécution unique (GitHub Actions) : lit Gamespirit et envoie les nouveaux
// événements Pokémon en DM aux ID listés dans SUBSCRIBER_IDS, sans connexion gateway.
import 'dotenv/config';
import { fetchPokemonEvents } from './gamespirit.js';
import { loadSeen, saveSeen } from './store.js';
import { buildEmbed } from './notifier.js';

const API = 'https://discord.com/api/v10';
const token = process.env.DISCORD_TOKEN;
const ids = (process.env.SUBSCRIBER_IDS ?? '').split(/[\s,]+/).filter(Boolean);
const testMode = process.argv.includes('--test-event');

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
async function sendDM(userId, ev) {
  const dm = await discord('/users/@me/channels', { recipient_id: userId });
  if (!dm.ok) return console.error(`DM ${userId} : ouverture refusée (${dm.status}) ${await dm.text()}`), false;
  const { id } = await dm.json();
  const msg = await discord(`/channels/${id}/messages`, { embeds: [buildEmbed(ev).toJSON()] });
  if (!msg.ok) return console.error(`DM ${userId} : envoi refusé (${msg.status}) ${await msg.text()}`), false;
  return true;
}

if (testMode) {
  const sample = {
    id: 'test', name: 'Défi de Ligue (TEST)', title: 'Défi de Ligue - 16 joueurs - 14h15 le 19/09/26 - Pokémon Trading Card Game',
    date: '19/09/26', time: '14h15', players: '16', price: '5,00 €', stock: 'En Stock',
    url: 'https://www2.gamespirit.fr/996-evenements',
  };
  for (const id of ids) console.log(id, (await sendDM(id, sample)) ? 'OK' : 'ÉCHEC');
  process.exit(0);
}

const events = await fetchPokemonEvents();
let seen = loadSeen();
const firstRun = seen === null;
seen ??= new Set();
const fresh = events.filter((e) => !seen.has(e.id));
console.log(`${events.length} events Pokémon, ${fresh.length} nouveaux${firstRun ? ' (premier run, silencieux)' : ''}`);

for (const ev of fresh) {
  let delivered = firstRun || !ids.length;
  if (!firstRun) for (const id of ids) delivered = (await sendDM(id, ev)) || delivered;
  if (delivered) seen.add(ev.id);
  else console.error(`Aucun DM envoyé pour "${ev.name}" : réessai au prochain passage`);
}
saveSeen(seen);
