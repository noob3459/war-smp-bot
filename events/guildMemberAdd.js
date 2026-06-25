const { Events, EmbedBuilder } = require('discord.js');
const cfg = require('../utils/config');
const { log } = require('../utils/logger');
const { checkJoin } = require('../utils/automod');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    await checkJoin(member);

    // Assign Unverified role
    const unverifiedId = cfg.get('role.unverified');
    if (unverifiedId) {
      member.roles.add(unverifiedId).catch(() => {});
    }

    // Welcome embed
    const welcomeId = cfg.get('channel.welcome');
    if (welcomeId) {
      try {
        const ch  = await client.channels.fetch(welcomeId);
        const tpl = cfg.get('msg.welcome') ?? 'Welcome to **{server}**, {user}! You are member **#{count}**.';
        const txt = tpl
          .replace('{user}',   `<@${member.id}>`)
          .replace('{server}', member.guild.name)
          .replace('{count}',  String(member.guild.memberCount));

        await ch.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Welcome!')
              .setDescription(txt)
              .setThumbnail(member.user.displayAvatarURL())
              .setColor(0x00cc88)
              .setTimestamp(),
          ],
        });
      } catch (err) {
        console.error('[guildMemberAdd] Welcome embed:', err.message);
      }
    }

    // Auto DM
    const dm = cfg.get('msg.auto_dm');
    if (dm) member.user.send(dm).catch(() => {});

    await log(client, 'joins', {
      title: 'Member Joined',
      color: 0x00cc88,
      thumbnail: member.user.displayAvatarURL(),
      fields: [
        { name: 'User',         value: `<@${member.id}> (${member.user.tag})`,                                   inline: true },
        { name: 'Account Age',  value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,                inline: true },
        { name: 'Member Count', value: String(member.guild.memberCount),                                          inline: true },
      ],
    });
  },
};
