import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import { Client } from 'discord.js';
import { showCollectionStats, showEvents } from './magiceden';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

const client = new Client({ intents: [] });
const salesCache: number[] = [];

client.on('ready', async () => {
  console.log(`Logged in as ${client.user && client.user.tag}`);

  await showCollectionStats(client);
  setInterval(async () => {
    await showCollectionStats(client);
  }, 30000);

  await showEvents(client, salesCache);
  setInterval(async () => {
    await showEvents(client, salesCache);
  }, 60000);
});

client.login(process.env.DISCORD_BOT_TOKEN);

app.get('/', (req: Request, res: Response) => {
  res.send('The bot is running');
});

app.listen(port, () => {
  console.log(`Discord Bot app listening at http://localhost:${port}`);
});
