const fs = require('fs');
const path = require('path');

async function loadModals(client) {
  const modalsPath = path.join(__dirname, '..', 'modals');
  const modalFiles = fs.readdirSync(modalsPath).filter(f => f.endsWith('.js'));

  for (const file of modalFiles) {
    const modal = require(path.join(modalsPath, file));
    if ('customId' in modal && 'execute' in modal) {
      client.modals.set(modal.customId, modal);
      console.log(`[Modals] Loaded: ${modal.customId}`);
    } else {
      console.warn(`[Modals] Skipped ${file}: missing customId or execute`);
    }
  }
}

async function handleModal(interaction, client) {
  // Support parameterized IDs like "edit_submit:123" — exact match first, then prefix
  const modal =
    client.modals.get(interaction.customId) ??
    client.modals.get(interaction.customId.split(':')[0]);
  if (!modal) return;

  try {
    await modal.execute(interaction, client);
  } catch (err) {
    console.error(`[ModalHandler] Error on "${interaction.customId}":`, err);
    const reply = { content: 'Something went wrong handling that form submission.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

module.exports = { loadModals, handleModal };
