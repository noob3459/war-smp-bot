const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db  = require('../database/db');
const cfg = require('../utils/config');
const { log } = require('../utils/logger');

const TYPE_LABELS = {
  general:     'General Support',
  report:      'Report Player',
  appeal:      'Appeal Punishment',
  application: 'Application Help',
  staff:       'Contact Staff',
};

module.exports = {
  customId: 'ticket_open',

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.customId.split(':')[1];

    // One open ticket per user
    const existing = db.prepare(
      `SELECT channel_id FROM tickets WHERE user_id = ? AND status = 'open' LIMIT 1`,
    ).get(interaction.user.id);

    if (existing) {
      return interaction.editReply(`You already have an open ticket: <#${existing.channel_id}>.`);
    }

    const categoryId = cfg.get('channel.ticket_category');
    const label      = TYPE_LABELS[type] ?? type;
    const channelName = `ticket-${type}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);

    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        parent: categoryId ?? undefined,
        permissionOverwrites: [
          { id: interaction.guild.id,  deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: client.user.id,        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] },
        ],
      });

      // Persist to DB
      const result = db.prepare(
        `INSERT INTO tickets (channel_id, user_id, username, type) VALUES (?, ?, ?, ?)`,
      ).run(ticketChannel.id, interaction.user.id, interaction.user.tag, type);

      const ticketId = result.lastInsertRowid;

      const embed = new EmbedBuilder()
        .setTitle(`${label} — Ticket #${ticketId}`)
        .setDescription(
          `Hello <@${interaction.user.id}>, a staff member will be with you shortly.\n\n` +
          'Please describe your issue clearly. When you are done, click **Close Ticket** below.',
        )
        .addFields({ name: 'Type', value: label, inline: true })
        .setColor(0x5865f2)
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close:${ticketId}`)
          .setLabel('Close Ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger),
      );

      await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
      await interaction.editReply(`Your ticket has been created: <#${ticketChannel.id}>`);

      await log(client, 'staff', {
        title: 'Ticket Opened', color: 0x5865f2,
        fields: [
          { name: 'User',    value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
          { name: 'Type',    value: label,                                                 inline: true },
          { name: 'Channel', value: `<#${ticketChannel.id}>`,                             inline: true },
        ],
      });
    } catch (err) {
      console.error('[ticketOpen]', err);
      await interaction.editReply('Failed to create ticket channel. Make sure I have the Manage Channels permission.');
    }
  },
};
