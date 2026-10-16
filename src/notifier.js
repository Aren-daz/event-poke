import { EmbedBuilder } from 'discord.js';

export function buildEmbed(ev, kind = 'new') {
  const soldOut = /rupture/i.test(ev.stock ?? '');
  return new EmbedBuilder()
    .setTitle(ev.name)
    .setURL(ev.url)
    .setColor(soldOut ? 0x95a5a6 : 0xffcb05)
    .setAuthor({ name: kind === 'restock' ? 'Gamespirit – de nouveau disponible (Pokémon)' : 'Gamespirit – nouvel événement Pokémon' })
    .setDescription(ev.title)
    .addFields(
      { name: 'Prix', value: ev.price ?? 'Non communiqué', inline: true },
      { name: 'Date', value: ev.date ?? '?', inline: true },
      { name: 'Heure', value: ev.time ?? '?', inline: true },
      { name: 'Joueurs max', value: ev.players ?? '?', inline: true },
      { name: 'Stock', value: ev.stock ?? '?', inline: true },
    )
    .setTimestamp();
}
