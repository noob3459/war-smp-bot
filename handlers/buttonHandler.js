const fs = require('fs');
const path = require('path');

async function loadButtons(client) {
  const buttonsPath = path.join(__dirname, '..', 'buttons');
  const buttonFiles = fs.readdirSync(buttonsPath).filter(f => f.endsWith('.js'));

  for (const file of buttonFiles) {
    const button = require(path.join(buttonsPath, file));
    if ('customId' in button && 'execute' in button) {
      client.buttons.set(button.customId, button);
      console.log(`[Buttons] Loaded: ${button.customId}`);
    } else {
      console.warn(`[Buttons] Skipped ${file}: missing customId or execute`);
    }
  }
}

async function handleButton(interaction, client) {
  // Support parameterized IDs like "review_accept:123" — exact match first, then prefix
  const button =
    client.buttons.get(interaction.customId) ??
    client.buttons.get(interaction.customId.split(':')[0]);
  if (!button) return;

  try {
    await button.execute(interaction, client);
  } catch (err) {
    console.error(`[ButtonHandler] Error on "${interaction.customId}":`, err);
    const reply = { content: 'Something went wrong handling that button.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

module.exports = { loadButtons, handleButton };
