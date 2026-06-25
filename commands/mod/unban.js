const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { log } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(o => o.setName('user_id').setDescription('Discord user ID').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction, client) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({ content: 'Invalid user ID.', ephemeral: true });
    }

    try {
      const ban = await interaction.guild.bans.fetch(userId);
      await interaction.guild.members.unban(userId, reason);

      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('User Unbanned')
          .addFields({ name: 'User', value: ban.user.tag, inline: true })
          .setColor(0x00cc88).setTimestamp()],
      });

      await log(client, 'moderation', {
        title: 'User Unbanned', color: 0x00cc88,
        fields: [
          { name: 'User',      value: `${ban.user.tag} (${userId})`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`,   inline: true },
          { name: 'Reason',    value: reason,                        inline: false },
        ],
      });
    } catch {
      return interaction.reply({ content: 'This user is not banned or could not be found.', ephemeral: true });
    }
  },
};
