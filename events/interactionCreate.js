const { Events } = require('discord.js');
const { handleButton } = require('../handlers/buttonHandler');
const { handleModal } = require('../handlers/modalHandler');
const { handleSelectMenu } = require('../handlers/selectMenuHandler');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction, client);
      } catch (err) {
        console.error(`[Autocomplete] Error in ${interaction.commandName}:`, err);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[Commands] Error in /${interaction.commandName}:`, err);
        const reply = { content: 'An error occurred while running that command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction, client);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction, client);
      return;
    }

    if (
      interaction.isStringSelectMenu() ||
      interaction.isUserSelectMenu() ||
      interaction.isRoleSelectMenu() ||
      interaction.isChannelSelectMenu() ||
      interaction.isMentionableSelectMenu()
    ) {
      await handleSelectMenu(interaction, client);
    }
  },
};
