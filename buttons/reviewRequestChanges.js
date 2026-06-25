const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  customId: 'review_changes',

  async execute(interaction) {
    const [, appId] = interaction.customId.split(':');

    const modal = new ModalBuilder()
      .setCustomId(`review_changes_modal:${appId}`)
      .setTitle('Request Changes');

    const feedback = new TextInputBuilder()
      .setCustomId('feedback')
      .setLabel('Feedback for the applicant')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Describe the changes you want the applicant to make...')
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(feedback));

    await interaction.showModal(modal);
  },
};
