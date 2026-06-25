const { Events, EmbedBuilder } = require('discord.js');
const cfg = require('../utils/config');
const { log } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    const leaveId = cfg.get('channel.leave');
    if (leaveId) {
      try {
        const ch  = await client.channels.fetch(leaveId);
        const tpl = cfg.get('msg.leave') ?? '**{user}** has left **{server}**.';
        const txt = tpl
          .replace('{user}',   member.user.tag)
          .replace('{server}', member.guild.name);

        await ch.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(txt)
              .setThumbnail(member.user.displayAvatarURL())
              .setColor(0xe74c3c)
              .setTimestamp(),
          ],
        });
      } catch (err) {
        console.error('[guildMemberRemove] Leave embed:', err.message);
      }
    }

    const roles = member.roles.cache
      .filter(r => r.id !== member.guild.id)
      .map(r => r.name).join(', ') || 'None';

    await log(client, 'leaves', {
      title: 'Member Left',
      color: 0xe74c3c,
      fields: [
        { name: 'User',  value: `${member.user.tag} (<@${member.id}>)`, inline: true },
        { name: 'Roles', value: roles,                                   inline: false },
      ],
    });
  },
};
