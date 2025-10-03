// commands/level.js
const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../features/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Zeigt Level & XP eines Users.')
    .addUserOption(o => o.setName('user').setDescription('Wessen Level anzeigen?').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const rec = getUser(interaction.guild.id, user.id);

    if (!rec) {
      return interaction.reply({ content: 'Noch keine XP für diesen User vorhanden.', ephemeral: true });
    }

    const barLen = 20;
    const filled = Math.round((rec.xpIntoLevel / rec.xpNeed) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

    const lines = [
      `👤 **${user.username}**`,
      `🏅 Level: **${rec.level}**`,
      `🔢 XP: **${rec.xpIntoLevel}/${rec.xpNeed}** (${rec.xp} total)`,
      `📈 Fortschritt: \`${bar}\``,
    ];

    return interaction.reply({ content: lines.join('\n'), ephemeral: false });
  }
};