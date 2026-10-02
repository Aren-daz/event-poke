import * as cheerio from 'cheerio';
import { fileURLToPath } from 'node:url';

const URL_EVENTS = 'https://www2.gamespirit.fr/996-evenements';

const normalize = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function parseEvents(html) {
  const $ = cheerio.load(html);
  const events = [];

  $('.product-miniature').each((_, el) => {
    const card = $(el);
    const link = card.find('h5.product-name a').first();
    const title = link.text().trim();
    const parts = title.split(' - ').map((p) => p.trim());
    const game = parts.at(-1) ?? '';
    if (!normalize(game).includes('pokemon')) return;

    const time = title.match(/(\d{1,2}h\d{2})/)?.[1] ?? null;
    const date = title.match(/le (\d{2}\/\d{2}\/\d{2})/)?.[1] ?? null;
    const players = title.match(/(\d+) joueurs/)?.[1] ?? null;

    events.push({
      id: card.attr('data-id-product'),
      name: parts[0],
      title,
      game,
      date,
      time,
      players,
      price: card.find('.price.product-price').first().text().trim() || null,
      stock: card.find('.product-availability span').first().text().trim() || null,
      url: link.attr('href'),
    });
  });

  return events;
}

export async function fetchPokemonEvents() {
  const res = await fetch(URL_EVENTS, { headers: { 'User-Agent': 'Mozilla/5.0 events-poke-bot' } });
  if (!res.ok) throw new Error(`Gamespirit HTTP ${res.status}`);
  const html = await res.text();
  return parseEvents(html);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(await fetchPokemonEvents());
}
