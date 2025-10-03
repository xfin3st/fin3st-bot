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

      // Basis-XP
      const XP_MIN = Number(process.env.LEVEL_XP_MIN || 10);
      const XP_MAX = Number(process.env.LEVEL_XP_MAX || 15);
      let gain = Math.max(XP_MIN, Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN);

      // ----------------------------------------
      // Multiplikatoren
      // ----------------------------------------
      const roleMultipliers = {
        "ROLE_ID_VIP": 2.0,     // VIP bekommt doppelte XP
        "ROLE_ID_BOOSTER": 1.5  // Booster 1.5x
      };

      const channelMultipliers = {
        "CHANNEL_ID_CHAT": 1.5, // Chat-Channel = 50% mehr XP
        "CHANNEL_ID_MEMES": 0.5 // Memes nur halbe XP
      };

      // Rollen-Check
      for (const [roleId, mult] of Object.entries(roleMultipliers)) {
        if (message.member.roles.cache.has(roleId)) {
          gain = Math.round(gain * mult);
        }
      }

      // Channel-Check
      if (channelMultipliers[message.channel.id]) {
        gain = Math.round(gain * channelMultipliers[message.channel.id]);
      }

      // ----------------------------------------

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
        // Fortschrittsbalken
        const barLen = 20;
        const filled = Math.round((rec.xpIntoLevel / rec.xpNeed) * barLen);
        const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

        const embed = new EmbedBuilder()
          .setColor(0x3498db)
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
            .setColor(0xf1c40f)
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