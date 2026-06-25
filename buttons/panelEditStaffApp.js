const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  customId: 'panel_edit_staff_app',

  async execute(interaction) {
    const application = db.prepare(
      `SELECT * FROM applications WHERE user_id = ? AND type = 'staff' AND status = 'pending' ORDER BY id DESC LIMIT 1`,
    ).get(interaction.user.id);

    if (!application) {
      return interaction.reply({
        content: 'You do not have a pending staff application to edit.',
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`staff_edit_submit:${application.id}`)
      .setTitle('Edit Staff Application');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('ign').setLabel('Minecraft Username (IGN)')
          .setStyle(TextInputStyle.Short).setValue(application.ign ?? '').setRequired(true).setMaxLength(16),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('staff_role').setLabel('Role you are applying for')
          .setStyle(TextInputStyle.Short).setValue(application.staff_role ?? '').setRequired(true).setMaxLength(50),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('experience').setLabel('Previous staff / moderation experience')
          .setStyle(TextInputStyle.Paragraph).setValue(application.experience ?? '').setRequired(true).setMaxLength(500),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('availability').setLabel('Weekly availability (hours + timezone)')
          .setStyle(TextInputStyle.Paragraph).setValue(application.availability ?? '').setRequired(true).setMaxLength(300),
      ),
    );

    await interaction.showModal(modal);
  },
};
