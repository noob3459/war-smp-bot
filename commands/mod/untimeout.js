const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { log } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a Discord timeout from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to remove timeout from').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction, client) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });
    if (!target.isCommunicationDisabled()) {
      return interaction.reply({ content: 'This member is not currently timed out.', ephemeral: true });
    }

    await target.timeout(null, reason);

    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Timeout Removed')
        .addFields({ name: 'User', value: `<@${target.id}>`, inline: true })
        .setColor(0x00cc88).setTimestamp()],
    });

    await log(client, 'moderation', {
      title: 'Timeout Removed', color: 0x00cc88,
      fields: [
        { name: 'User',      value: `<@${target.id}> (${target.user.tag})`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`,            inline: true },
        { name: 'Reason',    value: reason,                                 inline: false },
      ],
    });
  },
};
