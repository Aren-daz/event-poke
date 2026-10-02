import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN,
  pollMinutes: Number(process.env.POLL_INTERVAL_MINUTES) || 15,
};
