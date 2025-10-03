const { EmbedBuilder } = require('discord.js');
const { addXp, setUserNameCache, maybeGiveLevelRole, getUser } = require('../features/levels');

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    try {
      if (!message.guild || message.author.bot) return;

      // Cooldown für Member
      const COOLDOWN = Number(process.env.LEVEL_COOLDOWN_SECONDS || 60) * 1000;
      const now = Date.now();

      if (!client.__lvl_cd) client.__lvl_cd = new Map();
      const key = `${message.guild.id}:${message.author.id}`;

      // Admins -> kein Cooldown
      const isAdmin = message.member?.permissions.has('Administrator');
      const last = client.__lvl_cd.get(key) || 0;
      if (!isAdmin && now - last < COOLDOWN) return;
      client.__lvl_cd.set(key, now);

      // Zufällige XP
      const XP_MIN = Number(process.env.LEVEL_XP_MIN || 10);
      const XP_MAX = Number(process.env.LEVEL_XP_MAX || 15);
      const gain = Math.max(XP_MIN, Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN);

      const display = message.member?.displayName || message.author.username;
      setUserNameCache(message.guild.id, message.author.id, display);

      const { leveledUp, level } = await addXp({
        guild: message.guild,
        user: message.author,
        amount: gain,
        memberNameForCache: display,
      });

      const rec = getUser(message.guild.id, message.author.id);

      const channelToUse = process.env.LEVEL_UP_CHANNEL_ID
        ? (message.guild.channels.cache.get(process.env.LEVEL_UP_CHANNEL_ID) ||
           await message.guild.channels.fetch(process.env.LEVEL_UP_CHANNEL_ID).catch(() => null))
        : message.channel;

      if (leveledUp && channelToUse && rec) {
        // Fortschrittsbalken berechnen
        const barLen = 20;
        const filled = Math.round((rec.xpIntoLevel / rec.xpNeed) * barLen);
        const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

        // Embed bauen
        const embed = new EmbedBuilder()
          .setColor(0x3498db) // Blau, kannst du anpassen
          .setAuthor({ name: `${display}`, iconURL: message.author.displayAvatarURL() })
          .setTitle(`🎉 Level Up!`)
          .setDescription(
            `**${display}** ist jetzt **Level ${level}**!\n` +
            `(+${gain} XP)\n\n` +
            `🔢 Gesamt XP: **${rec.xp}**\n` +
            `📈 Fortschritt: \`${bar}\` (${rec.xpIntoLevel}/${rec.xpNeed} XP)`
          )
          .setFooter({ text: `Belohnungen werden automatisch vergeben` })
          .setTimestamp();

        await channelToUse.send({ embeds: [embed] });

        // Reward-Rolle checken
        const role = await maybeGiveLevelRole(message.member);
        if (role) {
          const rewardEmbed = new EmbedBuilder()
            .setColor(0xf1c40f) // Gold
            .setTitle(`🏅 Neue Rolle freigeschaltet!`)
            .setDescription(`**${display}** hat die Rolle ${role.toString()} erhalten! 🎊`)
            .setTimestamp();

          await channelToUse.send({ embeds: [rewardEmbed] });
        }
      }
    } catch (e) {
      console.error('levelsMessage error:', e);
    }
  }
};