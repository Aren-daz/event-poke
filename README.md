# Events Poke

Bot Discord qui surveille https://www2.gamespirit.fr/996-evenements et poste un embed
(titre, prix, date, heure, joueurs, stock, lien) à chaque nouvel événement Pokémon.

## Installation
1. https://discord.com/developers/applications → ton app (ID `1555636888763895908`) → Bot → copier le **token**.
2. Inviter le bot sur un serveur que tu possèdes (nécessaire pour pouvoir lui écrire en DM) :
   https://discord.com/oauth2/authorize?client_id=1555636888763895908&scope=bot&permissions=0
3. `cp .env.example .env` puis remplir `DISCORD_TOKEN`.
4. `npm install` puis `npm start`.
5. Envoie-lui un DM (n'importe quoi) : tu es abonné. `stop` pour te désabonner.

Les notifications arrivent uniquement en message privé, aux abonnés (`data/subscribers.json`).

Au premier lancement, les événements déjà en ligne sont mémorisés sans notification
(`data/seen-events.json`). Seuls les suivants sont envoyés.

`npm run scrape` affiche les événements Pokémon trouvés, sans Discord.

## Hébergement gratuit avec GitHub Actions (sans serveur)

Le workflow `.github/workflows/check.yml` lance `src/run-once.js` toutes les 5 min (minimum possible sur GitHub)
(les exécutions peuvent être retardées de quelques minutes). Pas de commandes slash dans ce mode.

1. Créer un dépôt **public** sur GitHub (gratuit et illimité en minutes) et y pousser le projet.
   Le `.env` est ignoré par git : le token ne part pas.
2. Settings → Secrets and variables → Actions :
   - onglet *Secrets* : `DISCORD_TOKEN` = token du bot.
   - onglet *Variables* : `SUBSCRIBER_IDS` = ID Discord des membres, séparés par des virgules.
3. Chaque membre autorise l'app : https://discord.com/oauth2/authorize?client_id=1555636888763895908&integration_type=1&scope=applications.commands (« Add to my apps »).
4. Onglet Actions → *Vérifier les événements Pokémon* → Run workflow, case « DM de test » cochée : chacun doit recevoir un DM.
