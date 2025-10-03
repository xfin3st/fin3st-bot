// commands/top.js
const { SlashCommandBuilder } = require('discord.js');
const { getLeaderboard } = require('../features/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Zeigt die aktivsten Mitglieder (Leaderboard).')
    .addIntegerOption(o => o
      .setName('anzahl')
      .setDescription('Wie viele anzeigen? (1–25, Standard 10)')
      .setMinValue(1).setMaxValue(25).setRequired(false)
    ),

  async execute(interaction) {
    const limit = interaction.options.getInteger('anzahl') || 10;
    const lb = getLeaderboard(interaction.guild.id, limit);

    if (!lb.length) {
      return interaction.reply({ content: 'Noch keine Daten vorhanden.', ephemeral: true });
    }

    const lines = lb.map((row, i) => {
      const mention = `<@${row.userId}>`;
      return `**#${i + 1}** — ${row.name ? `**${row.name}**` : mention} (${mention}) · 🏅 Lvl **${row.level}** · ${row.xp} XP`;
    });

    return interaction.reply({
      content: `**🏆 Leaderboard (Top ${lb.length})**\n` + lines.join('\n'),
      ephemeral: false
    });
  }
};