const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');

module.exports = {
  customId: 'panel_withdraw_app',

  async execute(interaction) {
    const application = db.prepare(
      `SELECT * FROM applications WHERE user_id = ? AND type = 'player' AND status = 'pending' ORDER BY id DESC LIMIT 1`,
    ).get(interaction.user.id);

    if (!application) {
      return interaction.reply({
        content: 'You do not have a pending application to withdraw.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Withdraw Application?')
      .setDescription(
        `Are you sure you want to withdraw **Application #${application.id}**?\n\n` +
        'This action cannot be undone. You may re-apply in the future.',
      )
      .setColor(0xe74c3c);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`withdraw_confirm:${application.id}`)
        .setLabel('Yes, Withdraw')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('withdraw_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
