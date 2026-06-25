const { isAdmin } = require('../utils/permissions');
const { handleBrowser } = require('./adminApps');

module.exports = {
  customId: 'admin_apps_page',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    await interaction.deferUpdate();

    const [, status, indexStr] = interaction.customId.split(':');
    const index = Math.max(0, parseInt(indexStr) || 0);
    return handleBrowser(interaction, status, index, client);
  },
};
