const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { log } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('channel').setDescription('Channel to unlock (defaults to current)'))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason  = interaction.options.getString('reason') ?? 'No reason provided';

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🔓 Channel Unlocked')
        .setDescription(`<#${channel.id}> has been unlocked.\n**Reason:** ${reason}`)
        .setColor(0x00cc88).setTimestamp()],
    });

    await log(client, 'moderation', {
      title: '🔓 Channel Unlocked', color: 0x00cc88,
      fields: [
        { name: 'Channel',   value: `<#${channel.id}>`,         inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      ],
    });
  },
};
