const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { logHistory } = require('../utils/applicationHistory');
const { notifyStaff } = require('../utils/staffNotify');

module.exports = {
  customId: 'staffapply_submit',

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const ign = interaction.fields.getTextInputValue('ign');
    const age = interaction.fields.getTextInputValue('age');
    const staffRole = interaction.fields.getTextInputValue('staff_role');
    const experience = interaction.fields.getTextInputValue('experience');
    const availability = interaction.fields.getTextInputValue('availability');

    const { lastInsertRowid: appId } = db.prepare(`
      INSERT INTO applications (user_id, username, ign, age, staff_role, experience, availability, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'staff')
    `).run(interaction.user.id, interaction.user.tag, ign, age, staffRole, experience, availability);

    logHistory(appId, 'submitted', interaction.user.id, interaction.user.tag);

    await notifyStaff(client, {
      title: 'New Staff Application Received',
      description: `<@${interaction.user.id}> has applied for a staff position.`,
      color: 0xf1c40f,
      fields: [
        { name: 'Applicant',   value: `<@${interaction.user.id}>`, inline: true },
        { name: 'IGN',         value: ign,                          inline: true },
        { name: 'Role Applied', value: staffRole,                   inline: true },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle('Staff Application Received')
      .setDescription('Your staff application has been submitted. Senior staff will review it and follow up with you.')
      .addFields(
        { name: 'IGN', value: ign, inline: true },
        { name: 'Role Applied For', value: staffRole, inline: true },
      )
      .setColor(0xf1c40f)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
