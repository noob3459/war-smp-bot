const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const cfg = require('../../utils/config');
const { log } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove the Muted role from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to unmute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction, client) {
    const target   = interaction.options.getMember('user');
    const reason   = interaction.options.getString('reason') ?? 'No reason provided';
    const muteRole = cfg.get('role.mute');

    if (!target)   return interaction.reply({ content: 'Member not found.',             ephemeral: true });
    if (!muteRole) return interaction.reply({ content: '`role.mute` is not configured.', ephemeral: true });
    if (!target.roles.cache.has(muteRole)) {
      return interaction.reply({ content: 'This member is not muted.', ephemeral: true });
    }

    await target.roles.remove(muteRole);

    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Member Unmuted')
        .addFields({ name: 'User', value: `<@${target.id}>`, inline: true })
        .setColor(0x00cc88).setTimestamp()],
    });

    await log(client, 'moderation', {
      title: 'Member Unmuted', color: 0x00cc88,
      fields: [
        { name: 'User',      value: `<@${target.id}> (${target.user.tag})`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`,            inline: true },
        { name: 'Reason',    value: reason,                                 inline: false },
      ],
    });
  },
};
