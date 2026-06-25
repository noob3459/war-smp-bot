const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { isAdmin } = require('../utils/permissions');
const cfg = require('../utils/config');
const { notifyStaff } = require('../utils/staffNotify');
const { log } = require('../utils/logger');

module.exports = {
  customId: 'admin_create_event_modal',

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'Administrator only.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const name        = interaction.fields.getTextInputValue('name').trim();
    const description = interaction.fields.getTextInputValue('description').trim() || null;
    const rawDate     = interaction.fields.getTextInputValue('scheduled_at').trim() || null;

    let scheduledAt = null;
    if (rawDate) {
      const d = new Date(rawDate.replace(' ', 'T') + ':00Z');
      if (isNaN(d.getTime())) {
        return interaction.editReply({ content: 'Invalid date format. Use `YYYY-MM-DD HH:MM`.' });
      }
      scheduledAt = d.toISOString().replace('T', ' ').slice(0, 19);
    }

    const eventsChannel = cfg.get('channel.events');

    const { lastInsertRowid: eventId } = db.prepare(`
      INSERT INTO events (name, description, scheduled_at, channel_id, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, description, scheduledAt, eventsChannel ?? null, interaction.user.id);

    // Post event embed if channel is configured
    if (eventsChannel) {
      try {
        const ch = await client.channels.fetch(eventsChannel);
        const embed = new EmbedBuilder()
          .setTitle(name)
          .setColor(0x5865f2)
          .setTimestamp();
        if (description) embed.setDescription(description);
        if (scheduledAt) {
          const ts = Math.floor(new Date(scheduledAt.replace(' ', 'T') + 'Z').getTime() / 1000);
          embed.addFields({ name: 'Scheduled', value: `<t:${ts}:F>`, inline: true });
        }
        embed.addFields({ name: 'Status', value: 'Scheduled', inline: true });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`event_join:${eventId}`)
            .setLabel('Join Event')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        );

        const msg = await ch.send({ embeds: [embed], components: [row] });
        db.prepare('UPDATE events SET message_id = ? WHERE id = ?').run(msg.id, eventId);
      } catch (err) {
        console.error('[adminCreateEventModal] Could not post event embed:', err.message);
      }
    }

    await log(client, 'staff', {
      title: 'Event Created',
      color: 0x9b59b6,
      fields: [
        { name: 'Event',      value: name,                    inline: true },
        { name: 'Created By', value: interaction.user.tag,    inline: true },
      ],
    });

    await notifyStaff(client, {
      title: 'Event Created',
      description: `**${name}** has been scheduled by ${interaction.user}.`,
      color: 0x9b59b6,
      fields: scheduledAt
        ? [{ name: 'Scheduled', value: `<t:${Math.floor(new Date(scheduledAt.replace(' ','T')+'Z').getTime()/1000)}:F>`, inline: true }]
        : [],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('Event Created')
        .addFields(
          { name: 'Name',      value: name,             inline: true },
          { name: 'Event ID',  value: String(eventId),  inline: true },
        )
        .setColor(0x9b59b6).setTimestamp()],
    });
  },
};
