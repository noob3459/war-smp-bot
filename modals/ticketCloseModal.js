const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const cfg = require('../utils/config');
const { generate } = require('../utils/transcript');
const { log } = require('../utils/logger');

module.exports = {
  customId: 'ticket_close_modal',

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const ticketId = interaction.customId.split(':')[1];
    const reason   = interaction.fields.getTextInputValue('close_reason') || 'No reason provided';
    const ticket   = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);

    if (!ticket || ticket.status !== 'open') {
      return interaction.editReply('This ticket is already closed.');
    }

    const channel = interaction.guild.channels.cache.get(ticket.channel_id);

    // Generate transcript
    let transcriptFile = null;
    if (channel) {
      transcriptFile = await generate(channel).catch(err => {
        console.error('[ticketCloseModal] transcript:', err.message);
        return null;
      });
    }

    // Post transcript to archive channel
    const archiveId = cfg.get('channel.ticket_archive');
    if (archiveId && transcriptFile) {
      try {
        const archiveChannel = await client.channels.fetch(archiveId);
        await archiveChannel.send({
          embeds: [new EmbedBuilder()
            .setTitle(`Ticket #${ticketId} Closed`)
            .addFields(
              { name: 'User',      value: `${ticket.username} (<@${ticket.user_id}>)`, inline: true },
              { name: 'Type',      value: ticket.type,                                 inline: true },
              { name: 'Closed By', value: `<@${interaction.user.id}>`,                inline: true },
              { name: 'Reason',    value: reason,                                     inline: false },
            )
            .setColor(0x95a5a6).setTimestamp()],
          files: [transcriptFile],
        });
      } catch (err) {
        console.error('[ticketCloseModal] archive:', err.message);
      }
    }

    // Update DB
    db.prepare(
      `UPDATE tickets SET status = 'closed', closed_at = datetime('now'), closed_by = ?, reason = ? WHERE id = ?`,
    ).run(interaction.user.id, reason, ticketId);

    // DM ticket owner
    try {
      const owner = await client.users.fetch(ticket.user_id);
      owner.send({
        embeds: [new EmbedBuilder()
          .setTitle(`Your Ticket #${ticketId} Has Been Closed`)
          .setDescription(`**Reason:** ${reason}`)
          .setColor(0x95a5a6).setTimestamp()],
        files: transcriptFile ? [transcriptFile] : [],
      }).catch(() => {});
    } catch { /* user may have DMs off */ }

    await log(client, 'staff', {
      title: 'Ticket Closed', color: 0x95a5a6,
      fields: [
        { name: 'Ticket',    value: `#${ticketId}`,                                           inline: true },
        { name: 'User',      value: `<@${ticket.user_id}>`,                                   inline: true },
        { name: 'Closed By', value: `<@${interaction.user.id}>`,                              inline: true },
        { name: 'Reason',    value: reason,                                                    inline: false },
      ],
    });

    await interaction.editReply('Ticket closed. Deleting channel in 5 seconds...');

    // Delete the ticket channel
    setTimeout(() => {
      if (channel) channel.delete().catch(err => console.error('[ticketCloseModal] delete channel:', err.message));
    }, 5000);
  },
};
