const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  customId: 'staffapply_open',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('staffapply_submit')
      .setTitle('WAR SMP Staff Application');

    const ign = new TextInputBuilder()
      .setCustomId('ign')
      .setLabel('Minecraft Username (IGN)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Notch')
      .setRequired(true)
      .setMaxLength(16);

    const age = new TextInputBuilder()
      .setCustomId('age')
      .setLabel('Your Age')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(3);

    const staffRole = new TextInputBuilder()
      .setCustomId('staff_role')
      .setLabel('What role are you applying for?')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Moderator, Helper, Builder')
      .setRequired(true)
      .setMaxLength(50);

    const experience = new TextInputBuilder()
      .setCustomId('experience')
      .setLabel('Previous moderation / staff experience')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(500);

    const availability = new TextInputBuilder()
      .setCustomId('availability')
      .setLabel('Weekly availability (hours + timezone)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('e.g. 15 hrs/week, UTC-5, weekday evenings')
      .setRequired(true)
      .setMaxLength(300);

    modal.addComponents(
      new ActionRowBuilder().addComponents(ign),
      new ActionRowBuilder().addComponents(age),
      new ActionRowBuilder().addComponents(staffRole),
      new ActionRowBuilder().addComponents(experience),
      new ActionRowBuilder().addComponents(availability),
    );

    await interaction.showModal(modal);
  },
};
