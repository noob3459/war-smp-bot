const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const cfg = require('../../utils/config');

const { CONFIG_META } = cfg;

function allKeys() {
  return Object.keys(CONFIG_META);
}

function allCategories() {
  return [...new Set(Object.values(CONFIG_META).map(m => m.category))];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Manage bot configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName('set')
      .setDescription('Set a configuration value')
      .addStringOption(o => o.setName('key').setDescription('Setting key').setRequired(true).setAutocomplete(true))
      .addStringOption(o => o.setName('value').setDescription('New value').setRequired(true)),
    )
    .addSubcommand(sub => sub
      .setName('view')
      .setDescription('View current settings')
      .addStringOption(o => o.setName('category').setDescription('Filter by category').setAutocomplete(true)),
    )
    .addSubcommand(sub => sub
      .setName('reset')
      .setDescription('Reset a setting to its default')
      .addStringOption(o => o.setName('key').setDescription('Setting key').setRequired(true).setAutocomplete(true)),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    const sub     = interaction.options.getSubcommand(false);

    if (focused.name === 'key') {
      const input = focused.value.toLowerCase();
      const matches = allKeys()
        .filter(k => k.includes(input) || CONFIG_META[k].label.toLowerCase().includes(input))
        .slice(0, 25)
        .map(k => ({ name: `${k} — ${CONFIG_META[k].label}`, value: k }));
      return interaction.respond(matches);
    }

    if (focused.name === 'category') {
      const input = focused.value.toLowerCase();
      const cats  = allCategories().filter(c => c.toLowerCase().includes(input))
        .slice(0, 25).map(c => ({ name: c, value: c }));
      return interaction.respond(cats);
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── set ──────────────────────────────────────────────────────────────────
    if (sub === 'set') {
      const key   = interaction.options.getString('key');
      const value = interaction.options.getString('value');

      if (!CONFIG_META[key]) {
        return interaction.reply({ content: `Unknown setting key: \`${key}\`. Use autocomplete to find valid keys.`, ephemeral: true });
      }

      cfg.set(key, value);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('Setting Updated')
          .addFields(
            { name: 'Key',   value: key,   inline: true },
            { name: 'Value', value: value, inline: true },
          )
          .setColor(0x00cc88).setTimestamp()],
        ephemeral: true,
      });
    }

    // ── view ─────────────────────────────────────────────────────────────────
    if (sub === 'view') {
      const categoryFilter = interaction.options.getString('category');
      const stored         = cfg.getAll();

      const categories = categoryFilter ? [categoryFilter] : allCategories();
      const embeds     = [];

      for (const cat of categories) {
        const keys   = allKeys().filter(k => CONFIG_META[k].category === cat);
        if (!keys.length) continue;

        const fields = keys.map(k => {
          const raw  = stored[k] ?? cfg.DEFAULTS[k] ?? null;
          const val  = raw ? `\`${raw}\`` : '*not set*';
          return { name: CONFIG_META[k].label, value: val, inline: true };
        });

        embeds.push(
          new EmbedBuilder()
            .setTitle(`Settings — ${cat}`)
            .addFields(fields)
            .setColor(0x5865f2)
            .setTimestamp(),
        );
      }

      if (!embeds.length) {
        return interaction.reply({ content: 'No settings found for that category.', ephemeral: true });
      }

      await interaction.reply({ embeds: embeds.slice(0, 10), ephemeral: true });
    }

    // ── reset ─────────────────────────────────────────────────────────────────
    if (sub === 'reset') {
      const key = interaction.options.getString('key');

      if (!CONFIG_META[key]) {
        return interaction.reply({ content: `Unknown key: \`${key}\`.`, ephemeral: true });
      }

      cfg.del(key);
      const def = cfg.DEFAULTS[key] ?? '*none*';

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('Setting Reset')
          .addFields(
            { name: 'Key',     value: key, inline: true },
            { name: 'Default', value: def, inline: true },
          )
          .setColor(0xf39c12).setTimestamp()],
        ephemeral: true,
      });
    }
  },
};
