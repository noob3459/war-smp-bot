require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { loadButtons } = require('./handlers/buttonHandler');
const { loadModals } = require('./handlers/modalHandler');
const { loadSelectMenus } = require('./handlers/selectMenuHandler');
const { startScheduler } = require('./utils/scheduler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();
client.selectMenus = new Collection();

(async () => {
  await loadCommands(client);
  await loadButtons(client);
  await loadModals(client);
  await loadSelectMenus(client);
  await loadEvents(client);
  await client.login(process.env.BOT_TOKEN);
  client.once('ready', () => startScheduler(client));
})();
