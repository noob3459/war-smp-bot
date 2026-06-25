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
    .setName('announce')
    .setDescription('Send a styled announcement embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Announcement body text')
        .setRequired(true)
        .setMaxLength(4000))
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Target channel (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption(o =>
      o.setName('ping')
        .setDescription('Who to ping alongside the announcement (default: no ping)')
        .addChoices(
          { name: '@everyone', value: 'everyone' },
          { name: '@here',     value: 'here'     },
          { name: 'A role',    value: 'role'     },
          { name: 'No ping',   value: 'none'     },
        ))
    .addRoleOption(o =>
      o.setName('role')
        .setDescription('Role to ping — only used when "ping" is set to "A role"')),

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const message       = interaction.options.getString('message');
    const targetChannel = interaction.options.getChannel('channel') ?? interaction.channel;
    const pingChoice    = interaction.options.getString('ping') ?? 'none';
    const pingRole      = interaction.options.getRole('role');

    if (pingChoice === 'role' && !pingRole) {
      return interaction.reply({
        content: 'You selected "A role" for ping but did not provide a role. Please specify the `role` option.',
        ephemeral: true,
      });
    }

    const color = accentColor();

    const embed = new EmbedBuilder()
      .setTitle('📢 Announcement')
      .setDescription(message)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: 'WAR SMP' });

    let pingContent     = undefined;
    let allowedMentions = { parse: [] };

    if (pingChoice === 'everyone') {
      pingContent     = '@everyone';
      allowedMentions = { parse: ['everyone'] };
    } else if (pingChoice === 'here') {
      pingContent     = '@here';
      allowedMentions = { parse: ['everyone'] };
    } else if (pingChoice === 'role' && pingRole) {
      pingContent     = `<@&${pingRole.id}>`;
      allowedMentions = { roles: [pingRole.id] };
    }

    try {
      await targetChannel.send({ content: pingContent, embeds: [embed], allowedMentions });
    } catch (err) {
      return interaction.reply({ content: `Failed to send announcement: ${err.message}`, ephemeral: true });
    }

    await interaction.reply({ content: '✅ Announcement sent successfully.', ephemeral: true });

    const pingLabel = pingChoice === 'role'
      ? `<@&${pingRole.id}>`
      : pingChoice === 'none' ? 'No ping' : pingContent;

    await log(client, 'moderation', {
      title:  '📢 /announce Used',
      color,
      fields: [
        { name: 'Staff Member', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
        { name: 'Channel',      value: `<#${targetChannel.id}>`,                              inline: true },
        { name: 'Ping',         value: pingLabel,                                             inline: true },
        { name: 'Message',      value: message.length > 1024 ? `${message.slice(0, 1021)}...` : message },
      ],
    });
  },
};
