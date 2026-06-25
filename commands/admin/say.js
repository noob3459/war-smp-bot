const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { log }     = require('../../utils/logger');
const cfg         = require('../../utils/config');

const WAR_SMP_RED = 0xe74c3c;

function accentColor() {
  const stored = cfg.get('color.accent');
  if (stored) {
    const n = parseInt(stored.replace(/^#/, ''), 16);
    if (!isNaN(n)) return n;
  }
  return WAR_SMP_RED;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message as the bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
      o.setName('message')
        .setDescription('The text to send (max 2000 characters, supports Markdown and Discord emojis)')
        .setRequired(true)
        .setMaxLength(2000))
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Target channel (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addBooleanOption(o =>
      o.setName('embed')
        .setDescription('Wrap the message in a styled embed? (default: false)'))
    .addBooleanOption(o =>
      o.setName('ping_everyone')
        .setDescription('Allow @everyone/@here pings? (default: false)')),

  async execute(interaction, client) {
    console.log('[SAY] Command started');

    // Top-level guard: always acknowledge the interaction, even on unexpected errors.
    try {
      // Permission check — isAdmin reads from cache/db synchronously, cannot throw.
      if (!isAdmin(interaction.member)) {
        return await interaction.reply({
          content: 'You do not have permission to use this command.',
          ephemeral: true,
        });
      }
      console.log('[SAY] Permission check passed');

      // Defer immediately — this is the critical fix.
      // targetChannel.send() is an HTTP call and can take multiple seconds under
      // rate-limiting. Deferring here acknowledges the interaction within Discord's
      // 3-second window before any further async work begins.
      await interaction.deferReply({ ephemeral: true });

      console.log('[SAY] Parsing options...');
      const message      = interaction.options.getString('message');
      const targetChannel = interaction.options.getChannel('channel') ?? interaction.channel;
      const asEmbed      = interaction.options.getBoolean('embed')        ?? false;
      const pingEveryone = interaction.options.getBoolean('ping_everyone') ?? false;

      console.log('[SAY] Target channel:', targetChannel?.id);

      if (!targetChannel) {
        return await interaction.editReply({ content: '❌ Could not resolve a target channel.' });
      }

      const allowedMentions = pingEveryone
        ? { parse: ['everyone', 'roles', 'users'] }
        : { parse: ['roles', 'users'] };

      console.log('[SAY] Building payload...');

      let sendPayload;
      if (asEmbed) {
        const embed = new EmbedBuilder()
          .setDescription(message)
          .setColor(accentColor())
          .setTimestamp()
          .setFooter({ text: 'WAR SMP' });
        sendPayload = { embeds: [embed], allowedMentions };
      } else {
        sendPayload = { content: message, allowedMentions };
      }

      console.log('[SAY] Sending message...');
      try {
        await targetChannel.send(sendPayload);
      } catch (sendErr) {
        console.error('[SAY] Failed to send message:', sendErr.message);
        return await interaction.editReply({
          content: `❌ Failed to send message: ${sendErr.message}`,
        });
      }
      console.log('[SAY] Message sent');

      await interaction.editReply({ content: '✅ Message sent successfully.' });

      console.log('[SAY] Logging moderation action...');
      try {
        await log(client, 'moderation', {
          title:  '📢 /say Used',
          color:  0x3498db,
          fields: [
            { name: 'Staff Member', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
            { name: 'Channel',      value: `<#${targetChannel.id}>`,                                   inline: true },
            { name: 'Format',       value: asEmbed ? 'Embed' : 'Plain Text',                          inline: true },
            { name: 'Message',      value: message.length > 1024 ? `${message.slice(0, 1021)}...` : message },
          ],
        });
      } catch (logErr) {
        // Logging failure must never prevent the command from completing.
        console.error('[SAY] Moderation log failed (non-fatal):', logErr.message);
      }

      console.log('[SAY] Finished successfully');
    } catch (error) {
      console.error('[SAY] ERROR');
      console.error(error);
      console.error(error.stack);

      const errorMsg = { content: '❌ An unexpected error occurred while executing this command.' };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorMsg);
        } else {
          await interaction.reply({ ...errorMsg, ephemeral: true });
        }
      } catch (replyErr) {
        console.error('[SAY] Could not send error reply:', replyErr.message);
      }
    }
  },
};
