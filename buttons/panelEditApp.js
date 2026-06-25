const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  customId: 'panel_edit_app',

  async execute(interaction) {
    const application = db.prepare(
      `SELECT * FROM applications WHERE user_id = ? AND type = 'player' AND status = 'pending' ORDER BY id DESC LIMIT 1`,
    ).get(interaction.user.id);

    if (!application) {
      return interaction.reply({
        content: 'You do not have a pending application to edit.',
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`edit_submit:${application.id}`)
      .setTitle('Edit Your Application');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('ign').setLabel('Minecraft Username (IGN)')
          .setStyle(TextInputStyle.Short).setValue(application.ign).setRequired(true).setMaxLength(16),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('timezone').setLabel('Timezone')
          .setStyle(TextInputStyle.Short).setValue(application.timezone ?? '').setRequired(true).setMaxLength(30),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pvp_rating').setLabel('PvP Rating (1–10)')
          .setStyle(TextInputStyle.Short).setValue(application.pvp_rating ?? '').setRequired(true).setMaxLength(2),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('building_rating').setLabel('Building Rating (1–10)')
          .setStyle(TextInputStyle.Short).setValue(application.building_rating ?? '').setRequired(true).setMaxLength(2),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('hours_per_week').setLabel('Hours Per Week')
          .setStyle(TextInputStyle.Short).setValue(application.hours_per_week ?? '').setRequired(true).setMaxLength(3),
      ),
    );

    await interaction.showModal(modal);
  },
};
