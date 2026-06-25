const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { log }     = require('../../utils/logger');
const cfg         = require('../../utils/config');

const WAR_SMP_RED = 0xe74c3c;

function parseColor(str) {
  if (!str) return null;
  const n = parseInt(str.replace(/^#/, ''), 16);
  return isNaN(n) ? null : n;
}

function accentColor() {
  const stored = cfg.get('color.accent');
  return parseColor(stored) ?? WAR_SMP_RED;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Build and send a custom embed to any channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
      o.setName('description')
        .setDescription('Main body text of the embed')
        .setRequired(true)
        .setMaxLength(4000))
    .addStringOption(o =>
      o.setName('title')
        .setDescription('Embed title')
        .setMaxLength(256))
    .addStringOption(o =>
      o.setName('color')
        .setDescription('Hex accent color (e.g. #e74c3c) — defaults to server theme color'))
    .addStringOption(o =>
      o.setName('thumbnail')
        .setDescription('Thumbnail image URL (small image top-right)'))
    .addStringOption(o =>
      o.setName('image')
        .setDescription('Large banner image URL (shown below description)'))
    .addStringOption(o =>
      o.setName('footer')
        .setDescription('Footer text')
        .setMaxLength(2048))
    .addStringOption(o =>
      o.setName('author')
        .setDescription('Author name shown above the title')
        .setMaxLength(256))
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Target channel (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const description   = interaction.options.getString('description');
    const title         = interaction.options.getString('title');
    const colorStr      = interaction.options.getString('color');
    const thumbnailUrl  = interaction.options.getString('thumbnail');
    const imageUrl      = interaction.options.getString('image');
    const footerText    = interaction.options.getString('footer');
    const authorName    = interaction.options.getString('author');
    const targetChannel = interaction.options.getChannel('channel') ?? interaction.channel;

    const color = parseColor(colorStr) ?? accentColor();

    const embed = new EmbedBuilder()
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (title)        embed.setTitle(title);
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
    if (imageUrl)     embed.setImage(imageUrl);
    if (footerText)   embed.setFooter({ text: footerText });
    if (authorName)   embed.setAuthor({ name: authorName });

    try {
      await targetChannel.send({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `Failed to send embed: ${err.message}`, ephemeral: true });
    }

    await interaction.reply({ content: '✅ Embed sent successfully.', ephemeral: true });

    await log(client, 'moderation', {
      title:  '🖼️ /embed Used',
      color:  0x9b59b6,
      fields: [
        { name: 'Staff Member', value: `<@${interaction.user.id}> (${interaction.user.tag})`,                          inline: true },
        { name: 'Channel',      value: `<#${targetChannel.id}>`,                                                       inline: true },
        { name: 'Title',        value: title ?? '*(none)*',                                                            inline: true },
        { name: 'Description',  value: description.length > 512 ? `${description.slice(0, 509)}...` : description },
      ],
    });
  },
};
