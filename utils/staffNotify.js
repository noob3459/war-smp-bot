const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cfg = require('./config');

/**
 * Send a notification to the staff notifications channel.
 *
 * @param {Client} client
 * @param {{ title, description, color?, fields?, components? }} data
 * @returns {Promise<Message|null>}
 */
async function notifyStaff(client, { title, description, color = 0x5865f2, fields = [], components = [] }) {
  if (!cfg.isEnabled('notifications.staff')) return null;

  const channelId = cfg.get('channel.notifications') ?? cfg.get('channel.staff_review');
  if (!channelId) return null;

  const staffRoleId = cfg.get('role.staff');

  try {
    const channel = await client.channels.fetch(channelId);

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (fields.length) embed.addFields(fields);

    const content = staffRoleId ? `<@&${staffRoleId}>` : undefined;
    return await channel.send({ content, embeds: [embed], components });
  } catch (err) {
    console.error('[StaffNotify] Failed to send notification:', err.message);
    return null;
  }
}

/**
 * Build actionable notification for a new player application.
 * Sends embed with Accept / Deny / Assign Team buttons so staff can act directly from the notification.
 */
async function notifyNewApplication(client, app, user) {
  if (!cfg.isEnabled('notifications.staff')) return;

  const channelId = cfg.get('channel.notifications') ?? cfg.get('channel.staff_review');
  if (!channelId) return;

  const staffRoleId = cfg.get('role.staff');
  const submittedTs = Math.floor(new Date(app.submitted_at.replace(' ', 'T') + 'Z').getTime() / 1000);

  const embed = new EmbedBuilder()
    .setTitle('🔔  New Player Application')
    .setColor(0xf39c12)
    .setThumbnail(user?.displayAvatarURL() ?? null)
    .addFields(
      { name: '👤  Discord',   value: `<@${app.user_id}>\n\`${app.username}\``, inline: true },
      { name: '⛏  Minecraft',  value: app.ign ?? 'N/A',                         inline: true },
      { name: '🌍  Timezone',  value: app.timezone ?? 'N/A',                    inline: true },
      { name: '⚔️  PvP',       value: app.pvp_rating ? `${app.pvp_rating}/10`   : 'N/A', inline: true },
      { name: '🏗  Building',  value: app.building_rating ? `${app.building_rating}/10` : 'N/A', inline: true },
      { name: '🕒  Hrs/Week',  value: app.hours_per_week ?? 'N/A',              inline: true },
      { name: '📋  App ID',    value: `#${app.id}`,                             inline: true },
      { name: '🕐  Submitted', value: `<t:${submittedTs}:R>`,                   inline: true },
    )
    .setFooter({ text: 'WAR SMP • Staff Review Required' })
    .setTimestamp();

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`review_accept:${app.id}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`review_deny:${app.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌'),
    new ButtonBuilder()
      .setCustomId(`review_changes:${app.id}`)
      .setLabel('Request Changes')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✏️'),
    new ButtonBuilder()
      .setCustomId(`review_team:${app.id}`)
      .setLabel('Assign Team')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⚔️'),
  );

  const infoRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`review_profile:${app.id}`)
      .setLabel('View Profile')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('👤'),
    new ButtonBuilder()
      .setCustomId(`review_history:${app.id}`)
      .setLabel('History')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📜'),
  );

  try {
    const channel = await client.channels.fetch(channelId);
    const content  = staffRoleId ? `<@&${staffRoleId}>` : undefined;
    await channel.send({ content, embeds: [embed], components: [actionRow, infoRow] });
  } catch (err) {
    console.error('[StaffNotify] Failed to send application notification:', err.message);
  }
}

module.exports = { notifyStaff, notifyNewApplication };
