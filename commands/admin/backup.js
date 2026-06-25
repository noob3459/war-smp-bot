const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createBackup, restoreBackup, RESTORABLE } = require('../../utils/backup');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Database backup and restore')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create and download a full database backup'),
    )
    .addSubcommand(s => s
      .setName('restore')
      .setDescription('Restore data from a backup file (guild_config only by default)')
      .addAttachmentOption(o => o.setName('file').setDescription('Backup .json file').setRequired(true))
      .addBooleanOption(o => o.setName('include_seasons').setDescription('Also restore seasons + team stats'))
      .addBooleanOption(o => o.setName('include_events').setDescription('Also restore events + participants'))
      .addBooleanOption(o => o.setName('include_history').setDescription('Also restore team history'))
      .addBooleanOption(o => o.setName('include_mod_logs').setDescription('Also restore mod logs')),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── create ────────────────────────────────────────────────────────────────
    if (sub === 'create') {
      await interaction.deferReply({ ephemeral: true });

      const { attachment, snapshot } = createBackup();
      const tableCount = Object.keys(snapshot).filter(k => Array.isArray(snapshot[k])).length;
      const rowCount   = Object.keys(snapshot)
        .filter(k => Array.isArray(snapshot[k]))
        .reduce((s, k) => s + snapshot[k].length, 0);

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('Backup Created')
          .setDescription('Download the file below. Keep it safe — it contains all bot data.')
          .addFields(
            { name: 'Tables',    value: String(tableCount), inline: true },
            { name: 'Total Rows', value: String(rowCount),  inline: true },
            { name: 'Timestamp', value: snapshot.created_at.slice(0, 19), inline: true },
          )
          .setColor(0x00cc88).setTimestamp()],
        files: [attachment],
      });
    }

    // ── restore ───────────────────────────────────────────────────────────────
    if (sub === 'restore') {
      await interaction.deferReply({ ephemeral: true });

      const attachment = interaction.options.getAttachment('file');
      if (!attachment.name.endsWith('.json')) {
        return interaction.editReply('Please upload a `.json` backup file created by `/backup create`.');
      }

      // Download and parse the file
      let data;
      try {
        const res  = await fetch(attachment.url);
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        return interaction.editReply('Failed to read the backup file. Make sure it is a valid JSON backup.');
      }

      if (data.version !== 2) {
        return interaction.editReply('This backup was created by a different version of the bot and may not be compatible.');
      }

      // Build table list to restore
      const tables = ['guild_config'];
      if (interaction.options.getBoolean('include_seasons'))  tables.push('seasons', 'team_stats');
      if (interaction.options.getBoolean('include_events'))   tables.push('events', 'event_participants');
      if (interaction.options.getBoolean('include_history'))  tables.push('team_history');
      if (interaction.options.getBoolean('include_mod_logs')) tables.push('mod_logs');

      // Compute row counts for preview
      const preview = tables.map(t => `**${t}**: ${(data[t] ?? []).length} rows`).join('\n');

      try {
        restoreBackup(data, tables);
      } catch (err) {
        return interaction.editReply(`Restore failed: ${err.message}`);
      }

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('Backup Restored')
          .setDescription(`Restored from backup created at **${data.created_at?.slice(0, 19) ?? 'unknown'}**.\n\n${preview}`)
          .setColor(0x00cc88).setTimestamp()],
      });
    }
  },
};
