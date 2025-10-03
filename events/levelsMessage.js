// events/levelsMessage.js
const { addXp, setUserNameCache, maybeGiveLevelRole } = require('../features/levels');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    try {
      if (!message.guild || message.author.bot) return;

      const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

      // Cooldown nur für normale Member
      if (!isAdmin) {
        const COOLDOWN = Number(process.env.LEVEL_COOLDOWN_SECONDS || 60) * 1000;
        const now = Date.now();

        if (!client.__lvl_cd) client.__lvl_cd = new Map();
        const key = `${message.guild.id}:${message.author.id}`;
        const last = client.__lvl_cd.get(key) || 0;

        if (now - last < COOLDOWN) return;
        client.__lvl_cd.set(key, now);
      }

      // Zufällige XP
      const XP_MIN = Number(process.env.LEVEL_XP_MIN || 10);
      const XP_MAX = Number(process.env.LEVEL_XP_MAX || 15);
      const gain = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;

      const display = message.member?.displayName || message.author.username;
      setUserNameCache(message.guild.id, message.author.id, display);

      const { leveledUp, level } = await addXp({
        guild: message.guild,
        user: message.author,
        amount: gain,
        memberNameForCache: display,
      });

      if (leveledUp) {
        // Embed für Level-Up
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setAuthor({ name: display, iconURL: message.author.displayAvatarURL() })
          .setTitle(`🎉 Level-Up!`)
          .setDescription(`**${display}** ist jetzt **Level ${level}**!`)
          .setThumbnail(message.author.displayAvatarURL())
          .setFooter({ text: `Bleib aktiv um weiter zu leveln 🚀` })
          .setTimestamp();

        const channelToUse = process.env.LEVEL_UP_CHANNEL_ID
          ? (message.guild.channels.cache.get(process.env.LEVEL_UP_CHANNEL_ID) || await message.guild.channels.fetch(process.env.LEVEL_UP_CHANNEL_ID).catch(() => null))
          : message.channel;

        if (channelToUse) {
          channelToUse.send({ embeds: [embed] }).catch(() => null);
        }

        // evtl. Rolle geben
        const role = await maybeGiveLevelRole(message.member);
        if (role && channelToUse) {
          channelToUse.send(`🏅 Rolle **${role.name}** vergeben!`).catch(() => null);
        }
      }
    } catch (e) {
      console.error('levelsMessage error:', e);
    }
  }
};