const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addModLog, parseDuration, formatDuration } = require('../../utils/modActions');
const { log } = require('../../utils/logger');

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000; // 28 days (Discord limit)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Apply a Discord timeout to a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to timeout').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 1h, 30m, 7d (max 28d)').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction, client) {
    const target = interaction.options.getMember('user');
    const durStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });
    if (!target.moderatable) return interaction.reply({ content: 'I cannot timeout this member (insufficient permissions or higher role).', ephemeral: true });

    const durMs = parseDuration(durStr);
    if (!durMs) return interaction.reply({ content: 'Invalid duration. Use formats like `1h`, `30m`, `7d`.', ephemeral: true });
    if (durMs > MAX_TIMEOUT_MS) return interaction.reply({ content: 'Maximum timeout duration is 28 days.', ephemeral: true });

    const durFmt = formatDuration(durMs);
    await target.timeout(durMs, reason);
    addModLog({ userId: target.id, username: target.user.tag, modId: interaction.user.id, modName: interaction.user.tag, action: 'timeout', reason, duration: durFmt });

    target.user.send({
      embeds: [new EmbedBuilder()
        .setTitle('You Have Been Timed Out')
        .setDescription(`**Server:** ${interaction.guild.name}\n**Duration:** ${durFmt}\n**Reason:** ${reason}`)
        .setColor(0xe67e22).setTimestamp()],
    }).catch(() => {});

    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Member Timed Out')
        .addFields(
          { name: 'User',     value: `<@${target.id}>`, inline: true },
          { name: 'Duration', value: durFmt,             inline: true },
          { name: 'Reason',   value: reason,             inline: false },
        ).setColor(0xe67e22).setTimestamp()],
    });

    await log(client, 'moderation', {
      title: 'Member Timed Out', color: 0xe67e22,
      fields: [
        { name: 'User',      value: `<@${target.id}> (${target.user.tag})`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`,            inline: true },
        { name: 'Duration',  value: durFmt,                                 inline: true },
        { name: 'Reason',    value: reason,                                 inline: false },
      ],
    });
  },
};
