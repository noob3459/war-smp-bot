const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode on a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o => o.setName('seconds').setDescription('Seconds (0 = off, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)')),

  async execute(interaction) {
    const secs    = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    await channel.setRateLimitPerUser(secs);

    const label = secs === 0 ? 'off' : `${secs}s`;
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Slowmode Updated')
        .setDescription(`<#${channel.id}> slowmode set to **${label}**.`)
        .setColor(0x5865f2).setTimestamp()],
    });
  },
};
