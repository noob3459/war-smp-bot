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
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const message       = interaction.options.getString('message');
    const targetChannel = interaction.options.getChannel('channel') ?? interaction.channel;
    const asEmbed       = interaction.options.getBoolean('embed')        ?? false;
    const pingEveryone  = interaction.options.getBoolean('ping_everyone') ?? false;

    const allowedMentions = pingEveryone
      ? { parse: ['everyone', 'roles', 'users'] }
      : { parse: ['roles', 'users'] };

    try {
      if (asEmbed) {
        const embed = new EmbedBuilder()
          .setDescription(message)
          .setColor(accentColor())
          .setTimestamp()
          .setFooter({ text: 'WAR SMP' });
        await targetChannel.send({ embeds: [embed], allowedMentions });
      } else {
        await targetChannel.send({ content: message, allowedMentions });
      }
    } catch (err) {
      return interaction.reply({ content: `Failed to send message: ${err.message}`, ephemeral: true });
    }

    await interaction.reply({ content: '✅ Message sent successfully.', ephemeral: true });

    await log(client, 'moderation', {
      title:  '📢 /say Used',
      color:  0x3498db,
      fields: [
        { name: 'Staff Member', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
        { name: 'Channel',      value: `<#${targetChannel.id}>`,                              inline: true },
        { name: 'Format',       value: asEmbed ? 'Embed' : 'Plain Text',                     inline: true },
        { name: 'Message',      value: message.length > 1024 ? `${message.slice(0, 1021)}...` : message },
      ],
    });
  },
};
