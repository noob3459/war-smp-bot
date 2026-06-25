const fs = require('fs');
const path = require('path');

async function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.js')) {
        const command = require(fullPath);
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          console.log(`[Commands] Loaded: ${command.data.name}`);
        } else {
          console.warn(`[Commands] Skipped ${entry.name}: missing data or execute`);
        }
      }
    }
  }

  walk(commandsPath);
}

module.exports = { loadCommands };
