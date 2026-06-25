const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { log } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel so members cannot send messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('channel').setDescription('Channel to lock (defaults to current)'))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason  = interaction.options.getString('reason') ?? 'No reason provided';

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🔒 Channel Locked')
        .setDescription(`<#${channel.id}> has been locked.\n**Reason:** ${reason}`)
        .setColor(0xe74c3c).setTimestamp()],
    });

    await log(client, 'moderation', {
      title: '🔒 Channel Locked', color: 0xe74c3c,
      fields: [
        { name: 'Channel',   value: `<#${channel.id}>`,         inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Reason',    value: reason,                      inline: false },
      ],
    });
  },
};
