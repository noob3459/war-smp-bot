const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const { buildDashboardEmbeds } = require('../commands/admin/dashboard');

module.exports = {
  customId: 'dashboard_refresh',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    await interaction.deferUpdate();

    const embeds = buildDashboardEmbeds(interaction.guild);

    const refreshRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('dashboard_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),
    );

    await interaction.editReply({ embeds, components: [refreshRow] });
  },
};
