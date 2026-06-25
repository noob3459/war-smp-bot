const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages from this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1–100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user')),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const filter = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    let messages = await interaction.channel.messages.fetch({ limit: 100 });

    // Filter by user if provided
    if (filter) messages = messages.filter(m => m.author.id === filter.id);

    // Bulk delete only accepts messages < 14 days old
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const deletable   = [...messages.values()]
      .filter(m => m.createdTimestamp > twoWeeksAgo)
      .slice(0, amount);

    if (!deletable.length) {
      return interaction.editReply('No deletable messages found (messages older than 14 days cannot be bulk-deleted).');
    }

    const deleted = await interaction.channel.bulkDelete(deletable, true);

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('Messages Purged')
        .setDescription(`Deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}${filter ? ` from ${filter.tag}` : ''}.`)
        .setColor(0xe74c3c).setTimestamp()],
    });
  },
};
