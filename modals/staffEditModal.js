const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { logHistory } = require('../utils/applicationHistory');
const { notifyStaff } = require('../utils/staffNotify');

module.exports = {
  customId: 'staff_edit_submit',

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const [, appId] = interaction.customId.split(':');
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(appId));

    if (!application || application.user_id !== interaction.user.id) {
      return interaction.editReply({ content: 'Application not found.' });
    }

    if (application.status !== 'pending') {
      return interaction.editReply({ content: 'You can only edit a pending application.' });
    }

    const ign          = interaction.fields.getTextInputValue('ign').trim();
    const staffRole    = interaction.fields.getTextInputValue('staff_role').trim();
    const experience   = interaction.fields.getTextInputValue('experience').trim();
    const availability = interaction.fields.getTextInputValue('availability').trim();

    db.prepare(`
      UPDATE applications
      SET ign = ?, staff_role = ?, experience = ?, availability = ?
      WHERE id = ?
    `).run(ign, staffRole, experience, availability, application.id);

    logHistory(application.id, 'edited', interaction.user.id, interaction.user.tag);

    await notifyStaff(client, {
      title: 'Staff Application Edited',
      description: `<@${interaction.user.id}> updated their staff application.`,
      color: 0xf39c12,
      fields: [
        { name: 'Application', value: `#${application.id}`, inline: true },
        { name: 'IGN',         value: ign,                  inline: true },
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('Staff Application Updated')
        .setDescription('Your application has been updated.')
        .addFields(
          { name: 'IGN',          value: ign,         inline: true },
          { name: 'Role Applied', value: staffRole,    inline: true },
        )
        .setColor(0x00cc88).setTimestamp()],
    });
  },
};
