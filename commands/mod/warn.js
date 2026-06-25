const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addModLog } = require('../../utils/modActions');
const { log } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the warning')),

  async execute(interaction, client) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target) return interaction.reply({ content: 'Member not found in this server.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: 'You cannot warn yourself.', ephemeral: true });
    if (target.id === client.user.id) return interaction.reply({ content: 'You cannot warn the bot.', ephemeral: true });

    const entry = addModLog({
      userId: target.id, username: target.user.tag,
      modId: interaction.user.id, modName: interaction.user.tag,
      action: 'warn', reason,
    });

    target.user.send({
      embeds: [new EmbedBuilder()
        .setTitle('You Received a Warning')
        .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}`)
        .setColor(0xf39c12).setTimestamp()],
    }).catch(() => {});

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Member Warned')
        .addFields(
          { name: 'User',    value: `<@${target.id}>`, inline: true },
          { name: 'Reason',  value: reason,             inline: true },
          { name: 'Case ID', value: `#${entry.lastInsertRowid}`, inline: true },
        )
        .setColor(0xf39c12).setTimestamp()],
    });

    await log(client, 'moderation', {
      title: 'Member Warned', color: 0xf39c12,
      fields: [
        { name: 'User',      value: `<@${target.id}> (${target.user.tag})`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`,            inline: true },
        { name: 'Case ID',   value: `#${entry.lastInsertRowid}`,            inline: true },
        { name: 'Reason',    value: reason,                                 inline: false },
      ],
    });
  },
};
