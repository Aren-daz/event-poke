import * as cheerio from 'cheerio';
import { fileURLToPath } from 'node:url';

const URL_EVENTS = 'https://www2.gamespirit.fr/996-evenements';

const normalize = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** @returns {{ total: number, events: object[] }} total = tous les produits de la page, events = ceux de Pokémon */
export function parsePage(html) {
  const $ = cheerio.load(html);
  const events = [];
  let total = 0;

  $('.product-miniature').each((_, el) => {
    total++;
    const card = $(el);
    const link = card.find('h5.product-name a').first();
    const title = link.text().trim();
    const parts = title.split(' - ').map((p) => p.trim());
    const game = parts.at(-1) ?? '';
    if (!normalize(game).includes('pokemon')) return;

    const time = title.match(/(\d{1,2}h\d{2})/)?.[1] ?? null;
    const date = title.match(/le (\d{2}\/\d{2}\/\d{2})/)?.[1] ?? null;
    const players = title.match(/(\d+) joueurs/)?.[1] ?? null;
    const stock = card.find('.product-availability span').first().text().trim() || null;

    events.push({
      id: card.attr('data-id-product'),
      name: parts[0],
      title,
      game,
      date,
      time,
      players,
      price: card.find('.price.product-price').first().text().trim() || null,
      stock,
      inStock: !/rupture/i.test(stock ?? ''),
      url: link.attr('href'),
    });
  });

  return { total, events };
}

export const parseEvents = (html) => parsePage(html).events;

export class NetworkError extends Error {}

async function fetchHtml(attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(URL_EVENTS, {
        headers: { 'User-Agent': 'Mozilla/5.0 events-poke-bot' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (i < attempts) await new Promise((r) => setTimeout(r, i * 4000));
    }
  }
  throw new NetworkError(`Gamespirit injoignable après ${attempts} essais : ${lastErr?.cause?.code ?? lastErr?.message}`);
}

export async function fetchPokemonEvents() {
  const { total, events } = parsePage(await fetchHtml());
  // Page lue mais sans aucun produit : structure changée ou page d'erreur, on ne touche pas à l'état
  if (total === 0) throw new Error('Aucun produit trouvé sur la page Gamespirit (structure changée ?)');
  return events;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(await fetchPokemonEvents());
}
