import { Client, GatewayIntentBits, Partials, ChannelType, ApplicationIntegrationType, InteractionContextType, MessageFlags } from 'discord.js';
import { config } from './config.js';
import { fetchPokemonEvents } from './gamespirit.js';
import { loadSeen, saveSeen, loadSubscribers, saveSubscribers } from './store.js';
import { buildEmbed } from './notifier.js';

if (!config.token) {
  console.error('DISCORD_TOKEN est requis (voir .env.example)');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

const subscribers = loadSubscribers();

const everywhere = {
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
};
const commands = [
  { name: 'abonner', description: 'Recevoir en DM les nouveaux événements Pokémon de Gamespirit', ...everywhere },
  { name: 'stop', description: 'Ne plus recevoir les notifications', ...everywhere },
  { name: 'pokemon', description: 'Afficher les événements Pokémon actuellement en ligne chez Gamespirit', ...everywhere },
];

client.on('interactionCreate', async (i) => {
  if (!i.isChatInputCommand()) return;
  const private_ = { flags: MessageFlags.Ephemeral };
  if (i.commandName === 'abonner') {
    subscribers.add(i.user.id);
    saveSubscribers(subscribers);
    await i.reply({ content: "C'est noté : je t'écris en DM dès qu'un nouvel événement Pokémon apparaît chez Gamespirit.", ...private_ });
  } else if (i.commandName === 'stop') {
    subscribers.delete(i.user.id);
    saveSubscribers(subscribers);
    await i.reply({ content: 'Notifications désactivées.', ...private_ });
  } else if (i.commandName === 'pokemon') {
    await i.deferReply();
    try {
      const events = await fetchPokemonEvents();
      if (!events.length) return void (await i.editReply('Aucun événement Pokémon en ligne chez Gamespirit pour le moment.'));
      await i.editReply({ embeds: events.slice(0, 10).map(buildEmbed) });
    } catch (err) {
      console.error(err);
      await i.editReply('Impossible de lire le site de Gamespirit pour le moment.');
    }
  }
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || msg.channel.type !== ChannelType.DM) return;
  const text = msg.content.trim().toLowerCase();
  if (['stop', '!stop'].includes(text)) {
    subscribers.delete(msg.author.id);
    saveSubscribers(subscribers);
    await msg.reply('Notifications désactivées. Écris-moi n\'importe quoi pour les réactiver.');
    return;
  }
  const isNew = !subscribers.has(msg.author.id);
  subscribers.add(msg.author.id);
  saveSubscribers(subscribers);
  await msg.reply(isNew
    ? 'C\'est noté : je t\'écris ici dès qu\'un nouvel événement Pokémon apparaît chez Gamespirit. Envoie "stop" pour arrêter.'
    : 'Tu es déjà abonné. Envoie "stop" pour arrêter.');
});

async function check() {
  try {
    const events = await fetchPokemonEvents();
    let seen = loadSeen();
    const firstRun = seen === null;
    seen ??= new Set();

    const fresh = events.filter((e) => !seen.has(e.id));
    console.log(`[${new Date().toISOString()}] ${events.length} events Pokémon, ${fresh.length} nouveaux${firstRun ? ' (premier run, silencieux)' : ''}`);

    if (!firstRun) {
      for (const ev of fresh) {
        for (const userId of subscribers) {
          try {
            const user = await client.users.fetch(userId);
            await user.send({ embeds: [buildEmbed(ev)] });
          } catch (err) {
            console.error(`DM impossible pour ${userId} :`, err.message);
          }
        }
      }
    }

    for (const e of fresh) seen.add(e.id);
    saveSeen(seen);
  } catch (err) {
    console.error('Erreur pendant la vérification :', err);
  }
}

client.once('clientReady', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  client.application.commands.set(commands).catch((err) => console.error('Enregistrement des commandes :', err));
  check();
  setInterval(check, config.pollMinutes * 60_000);
});

await client.login(config.token);
