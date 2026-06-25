const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  customId: 'apply_open',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('apply_submit')
      .setTitle('WAR SMP Player Application');

    const ign = new TextInputBuilder()
      .setCustomId('ign')
      .setLabel('Minecraft Username (IGN)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Notch')
      .setRequired(true)
      .setMaxLength(16);

    const timezone = new TextInputBuilder()
      .setCustomId('timezone')
      .setLabel('Timezone')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. EST, UTC+5, GMT')
      .setRequired(true)
      .setMaxLength(30);

    const pvpRating = new TextInputBuilder()
      .setCustomId('pvp_rating')
      .setLabel('PvP Rating (1–10)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(2);

    const buildingRating = new TextInputBuilder()
      .setCustomId('building_rating')
      .setLabel('Building Rating (1–10)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(2);

    const hoursPerWeek = new TextInputBuilder()
      .setCustomId('hours_per_week')
      .setLabel('Hours Per Week')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 15')
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
