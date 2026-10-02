// Teste si le bot peut écrire dans un groupe de DM existant.
// Usage : GROUP_CHANNEL_ID=123... node scripts/test-group.js   (token lu dans .env)
import 'dotenv/config';

const id = process.env.GROUP_CHANNEL_ID;
if (!process.env.DISCORD_TOKEN || !id) {
  console.error('Il faut DISCORD_TOKEN (dans .env) et GROUP_CHANNEL_ID');
  process.exit(1);
}
const res = await fetch(`https://discord.com/api/v10/channels/${id}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Test du bot Events Poke' }),
});
console.log(res.status, await res.text());
