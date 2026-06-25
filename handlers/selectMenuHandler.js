const fs = require('fs');
const path = require('path');

async function loadSelectMenus(client) {
  const selectMenusPath = path.join(__dirname, '..', 'selectMenus');
  const files = fs.readdirSync(selectMenusPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const menu = require(path.join(selectMenusPath, file));
    if ('customId' in menu && 'execute' in menu) {
      client.selectMenus.set(menu.customId, menu);
      console.log(`[SelectMenus] Loaded: ${menu.customId}`);
    } else {
      console.warn(`[SelectMenus] Skipped ${file}: missing customId or execute`);
    }
  }
}

async function handleSelectMenu(interaction, client) {
  // Support parameterized IDs like "team_select:123" — exact match first, then prefix
  const menu =
    client.selectMenus.get(interaction.customId) ??
    client.selectMenus.get(interaction.customId.split(':')[0]);
  if (!menu) return;

  try {
    await menu.execute(interaction, client);
  } catch (err) {
    console.error(`[SelectMenuHandler] Error on "${interaction.customId}":`, err);
    const reply = { content: 'Something went wrong handling that selection.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

module.exports = { loadSelectMenus, handleSelectMenu };
