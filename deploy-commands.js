require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

function collectCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectCommands(fullPath);
    } else if (entry.name.endsWith('.js')) {
      const command = require(fullPath);
      if ('data' in command) {
        commands.push(command.data.toJSON());
        console.log(`[Deploy] Queued: ${command.data.name}`);
      }
    }
  }
}

collectCommands(commandsPath);

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`[Deploy] Deploying ${commands.length} command(s)...`);

    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    await rest.put(route, { body: commands });

    if (process.env.GUILD_ID) {
      console.log(`[Deploy] Done — deployed to guild ${process.env.GUILD_ID} (instant)`);
    } else {
      console.log('[Deploy] Done — deployed globally (up to 1 hour to propagate)');
    }
  } catch (err) {
    console.error('[Deploy] Error:', err);
    process.exit(1);
  }
})();
