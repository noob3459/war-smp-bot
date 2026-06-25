const { Events } = require('discord.js');
const { log } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, client) {
    // Nickname change
    if (oldMember.nickname !== newMember.nickname) {
      await log(client, 'nicknames', {
        title: 'Nickname Changed',
        color: 0x5865f2,
        fields: [
          { name: 'User',   value: `<@${newMember.id}> (${newMember.user.tag})`, inline: false },
          { name: 'Before', value: oldMember.nickname ?? '*None*',               inline: true  },
          { name: 'After',  value: newMember.nickname ?? '*None*',               inline: true  },
        ],
      });
    }

    // Role changes
    const added   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (added.size || removed.size) {
      await log(client, 'roles', {
        title: 'Member Roles Updated',
        color: 0x9b59b6,
        fields: [
          { name: 'User', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: false },
          ...(added.size   ? [{ name: 'Added',   value: [...added.values()].map(r => r.name).join(', '),   inline: true }] : []),
          ...(removed.size ? [{ name: 'Removed', value: [...removed.values()].map(r => r.name).join(', '), inline: true }] : []),
        ],
      });
    }
  },
};
