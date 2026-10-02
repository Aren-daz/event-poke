// Teste si le bot peut ouvrir un DM avec un utilisateur et lui écrire.
// Usage : TEST_USER_ID=123... node scripts/test-dm.js
import 'dotenv/config';

const h = { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' };
const api = 'https://discord.com/api/v10';
const dm = await fetch(`${api}/users/@me/channels`, { method: 'POST', headers: h, body: JSON.stringify({ recipient_id: process.env.TEST_USER_ID }) });
const dmBody = await dm.json();
console.log('create DM:', dm.status, dmBody.id ?? JSON.stringify(dmBody));
if (!dm.ok) process.exit(1);
const msg = await fetch(`${api}/channels/${dmBody.id}/messages`, { method: 'POST', headers: h, body: JSON.stringify({ content: 'Test du bot Events Poke (DM sans serveur commun)' }) });
console.log('send:', msg.status, msg.ok ? 'OK' : await msg.text());
