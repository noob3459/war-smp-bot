const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  customId: 'edit_open',

  async execute(interaction) {
    const [, appId] = interaction.customId.split(':');
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(appId));

    if (!application || application.user_id !== interaction.user.id) {
      return interaction.reply({ content: 'Application not found.', ephemeral: true });
    }

    if (application.status !== 'pending') {
      return interaction.reply({ content: 'You can only edit a pending application.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`edit_submit:${application.id}`)
      .setTitle('Edit Your Application');

    const ign = new TextInputBuilder()
      .setCustomId('ign')
      .setLabel('Minecraft Username (IGN)')
      .setStyle(TextInputStyle.Short)
      .setValue(application.ign)
      .setRequired(true)
      .setMaxLength(16);

    const timezone = new TextInputBuilder()
      .setCustomId('timezone')
      .setLabel('Timezone')
      .setStyle(TextInputStyle.Short)
      .setValue(application.timezone ?? '')
      .setRequired(true)
      .setMaxLength(30);

    const pvpRating = new TextInputBuilder()
      .setCustomId('pvp_rating')
      .setLabel('PvP Rating (1–10)')
      .setStyle(TextInputStyle.Short)
      .setValue(application.pvp_rating ?? '')
      .setRequired(true)
      .setMaxLength(2);

    const buildingRating = new TextInputBuilder()
      .setCustomId('building_rating')
      .setLabel('Building Rating (1–10)')
      .setStyle(TextInputStyle.Short)
      .setValue(application.building_rating ?? '')
      .setRequired(true)
      .setMaxLength(2);

    const hoursPerWeek = new TextInputBuilder()
      .setCustomId('hours_per_week')
      .setLabel('Hours Per Week')
      .setStyle(TextInputStyle.Short)
      .setValue(application.hours_per_week ?? '')
      .setRequired(true)
      .setMaxLength(3);

    modal.addComponents(
      new ActionRowBuilder().addComponents(ign),
      new ActionRowBuilder().addComponents(timezone),
      new ActionRowBuilder().addComponents(pvpRating),
      new ActionRowBuilder().addComponents(buildingRating),
      new ActionRowBuilder().addComponents(hoursPerWeek),
    );

    await interaction.showModal(modal);
  },
};
