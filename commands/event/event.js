const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const cfg = require('../../utils/config');
const { addReminder } = require('../../utils/scheduler');
const { isAdmin } = require('../../utils/permissions');

function buildEventEmbed(event, participants) {
  const embed = new EmbedBuilder()
    .setTitle(event.name)
    .setColor(event.status === 'active' ? 0x00cc88 : event.status === 'ended' ? 0x95a5a6 : 0x5865f2)
    .setTimestamp();

  if (event.description) embed.setDescription(event.description);
  embed.addFields(
    { name: 'Status',       value: event.status.charAt(0).toUpperCase() + event.status.slice(1), inline: true },
    { name: 'Participants', value: String(participants.length),                                   inline: true },
  );
  if (event.scheduled_at) {
    embed.addFields({ name: 'Scheduled', value: `<t:${Math.floor(new Date(event.scheduled_at + 'Z').getTime() / 1000)}:F>`, inline: true });
  }
  if (participants.length) {
    embed.addFields({ name: 'Joined', value: participants.map(p => p.username).join(', ').slice(0, 1024), inline: false });
  }
  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('WAR SMP event management')
    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create a new event (Admin)')
      .addStringOption(o => o.setName('name').setDescription('Event name').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Details'))
      .addStringOption(o => o.setName('scheduled').setDescription('Date/time in UTC — YYYY-MM-DD HH:MM')),
    )
    .addSubcommand(s => s.setName('list').setDescription('List upcoming and active events'))
    .addSubcommand(s => s
      .setName('join')
      .setDescription('Join an event')
      .addIntegerOption(o => o.setName('id').setDescription('Event ID').setRequired(true).setMinValue(1)),
    )
    .addSubcommand(s => s
      .setName('leave')
      .setDescription('Leave an event')
      .addIntegerOption(o => o.setName('id').setDescription('Event ID').setRequired(true).setMinValue(1)),
    )
    .addSubcommand(s => s
      .setName('start')
      .setDescription('Mark an event as active (Admin)')
      .addIntegerOption(o => o.setName('id').setDescription('Event ID').setRequired(true).setMinValue(1)),
    )
    .addSubcommand(s => s
      .setName('end')
      .setDescription('End an event and lock attendance (Admin)')
      .addIntegerOption(o => o.setName('id').setDescription('Event ID').setRequired(true).setMinValue(1)),
    )
    .addSubcommand(s => s
      .setName('info')
      .setDescription('View event details and attendance')
      .addIntegerOption(o => o.setName('id').setDescription('Event ID').setRequired(true).setMinValue(1)),
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // ── create ────────────────────────────────────────────────────────────────
    if (sub === 'create') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: 'Only admins can create events.', ephemeral: true });

      const name      = interaction.options.getString('name');
      const desc      = interaction.options.getString('description');
      const scheduled = interaction.options.getString('scheduled');

      let scheduledAt = null;
      if (scheduled) {
        const parsed = new Date(scheduled.replace(' ', 'T') + ':00Z');
        if (isNaN(parsed)) return interaction.reply({ content: 'Invalid date. Use format: `YYYY-MM-DD HH:MM`', ephemeral: true });
        scheduledAt = parsed.toISOString().replace('T', ' ').slice(0, 19);
      }

      const result  = db.prepare('INSERT INTO events (name, description, scheduled_at, created_by) VALUES (?, ?, ?, ?)').run(name, desc ?? null, scheduledAt, interaction.user.id);
      const eventId = result.lastInsertRowid;
      const event   = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

      // Schedule 30-min reminder if channel configured
      const evCh = cfg.get('channel.events');
      if (scheduledAt && evCh) {
        const warnTime = new Date(event.scheduled_at + 'Z').getTime() - 30 * 60 * 1000;
        if (warnTime > Date.now()) {
          addReminder({
            type: 'event_start', targetId: String(eventId), channelId: evCh,
            message: `⏰ **Event starting in 30 minutes:** **${name}**! Use \`/event join id:${eventId}\` to join.`,
            remindAt: new Date(warnTime).toISOString(),
          });
        }
      }

      return interaction.reply({
        embeds: [buildEventEmbed(event, []).setFooter({ text: `Event ID: ${eventId}` })],
      });
    }

    // ── list ──────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const events = db.prepare(
        `SELECT e.*, COUNT(ep.id) AS participant_count
         FROM events e LEFT JOIN event_participants ep ON ep.event_id = e.id
         WHERE e.status IN ('scheduled','active')
         GROUP BY e.id ORDER BY e.scheduled_at ASC NULLS LAST LIMIT 10`,
      ).all();

      if (!events.length) return interaction.reply({ content: 'No upcoming or active events.', ephemeral: true });

      const fields = events.map(e => {
        const time = e.scheduled_at ? `<t:${Math.floor(new Date(e.scheduled_at + 'Z').getTime() / 1000)}:R>` : 'TBD';
        return { name: `#${e.id} — ${e.name}`, value: `Status: **${e.status}** | Participants: **${e.participant_count}** | ${time}`, inline: false };
      });

      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Upcoming Events').addFields(fields).setColor(0x5865f2).setTimestamp()],
      });
    }

    // ── join ──────────────────────────────────────────────────────────────────
    if (sub === 'join') {
      const id    = interaction.options.getInteger('id');
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      if (!event) return interaction.reply({ content: `Event #${id} not found.`, ephemeral: true });
      if (event.status === 'ended') return interaction.reply({ content: 'This event has already ended.', ephemeral: true });
      if (event.status === 'cancelled') return interaction.reply({ content: 'This event was cancelled.', ephemeral: true });

      try {
        db.prepare('INSERT INTO event_participants (event_id, user_id, username) VALUES (?, ?, ?)').run(id, interaction.user.id, interaction.user.tag);
      } catch {
        return interaction.reply({ content: 'You are already signed up for this event.', ephemeral: true });
      }

      const count = db.prepare('SELECT COUNT(*) AS c FROM event_participants WHERE event_id = ?').get(id).c;
      return interaction.reply({ content: `You joined **${event.name}**! (${count} signed up)`, ephemeral: true });
    }

    // ── leave ─────────────────────────────────────────────────────────────────
    if (sub === 'leave') {
      const id    = interaction.options.getInteger('id');
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      if (!event) return interaction.reply({ content: `Event #${id} not found.`, ephemeral: true });
      if (event.status === 'ended') return interaction.reply({ content: 'This event has already ended.', ephemeral: true });

      const info = db.prepare('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?').run(id, interaction.user.id);
      if (!info.changes) return interaction.reply({ content: 'You are not signed up for this event.', ephemeral: true });
      return interaction.reply({ content: `You left **${event.name}**.`, ephemeral: true });
    }

    // ── start ─────────────────────────────────────────────────────────────────
    if (sub === 'start') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: 'Only admins can start events.', ephemeral: true });
      const id    = interaction.options.getInteger('id');
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      if (!event) return interaction.reply({ content: `Event #${id} not found.`, ephemeral: true });
      if (event.status !== 'scheduled') return interaction.reply({ content: 'Only scheduled events can be started.', ephemeral: true });

      db.prepare("UPDATE events SET status = 'active' WHERE id = ?").run(id);

      const participants = db.prepare('SELECT * FROM event_participants WHERE event_id = ?').all(id);
      const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      const embed = buildEventEmbed(updatedEvent, participants).setFooter({ text: `Event ID: ${id}` });

      const evCh = cfg.get('channel.events');
      if (evCh) {
        try { await (await client.channels.fetch(evCh)).send({ content: `🎮 **Event is now live!** <@&everyone>`, embeds: [embed] }); } catch { /* ignore */ }
      }

      return interaction.reply({ embeds: [embed] });
    }

    // ── end ───────────────────────────────────────────────────────────────────
    if (sub === 'end') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: 'Only admins can end events.', ephemeral: true });
      const id    = interaction.options.getInteger('id');
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      if (!event) return interaction.reply({ content: `Event #${id} not found.`, ephemeral: true });
      if (event.status === 'ended') return interaction.reply({ content: 'Already ended.', ephemeral: true });

      // Mark all current participants as attended
      db.prepare('UPDATE event_participants SET attended = 1 WHERE event_id = ?').run(id);
      db.prepare("UPDATE events SET status = 'ended' WHERE id = ?").run(id);

      const participants = db.prepare('SELECT * FROM event_participants WHERE event_id = ?').all(id);
      const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      return interaction.reply({ embeds: [buildEventEmbed(updatedEvent, participants).setFooter({ text: `${participants.length} attended` })] });
    }

    // ── info ──────────────────────────────────────────────────────────────────
    if (sub === 'info') {
      const id           = interaction.options.getInteger('id');
      const event        = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      const participants = db.prepare('SELECT * FROM event_participants WHERE event_id = ?').all(id);
      if (!event) return interaction.reply({ content: `Event #${id} not found.`, ephemeral: true });
      return interaction.reply({ embeds: [buildEventEmbed(event, participants).setFooter({ text: `Event ID: ${id}` })], ephemeral: true });
    }
  },
};
