const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addModLog } = require('../../utils/modActions');
const { log } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction, client) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });
    if (!target.kickable) return interaction.reply({ content: 'I cannot kick this member.', ephemeral: true });

    target.user.send({
      embeds: [new EmbedBuilder()
        .setTitle('You Have Been Kicked')
        .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}`)
        .setColor(0xe74c3c).setTimestamp()],
    }).catch(() => {});

    await target.kick(reason);
    addModLog({ userId: target.id, username: target.user.tag, modId: interaction.user.id, modName: interaction.user.tag, action: 'kick', reason });

    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Member Kicked')
        .addFields(
          { name: 'User',   value: `${target.user.tag}`, inline: true },
          { name: 'Reason', value: reason,                inline: false },
        ).setColor(0xe74c3c).setTimestamp()],
    });

    await log(client, 'moderation', {
      title: 'Member Kicked', color: 0xe74c3c,
      fields: [
        { name: 'User',      value: `${target.user.tag} (<@${target.id}>)`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`,            inline: true },
        { name: 'Reason',    value: reason,                                 inline: false },
      ],
    });
  },
};
