const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  customId: 'ticket_close',

  async execute(interaction) {
    const ticketId = interaction.customId.split(':')[1];
    const ticket   = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);

    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({ content: 'This ticket is already closed.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`ticket_close_modal:${ticketId}`)
      .setTitle('Close Ticket')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('close_reason')
            .setLabel('Reason for closing')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Optional: describe why this ticket is being closed'),
        ),
      );

    await interaction.showModal(modal);
  },
};
