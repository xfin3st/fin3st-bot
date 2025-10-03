const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../features/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Zeigt die aktivsten Mitglieder (Leaderboard).')
    .addIntegerOption(o =>
      o.setName('anzahl')
        .setDescription('Wie viele anzeigen? (1–25, Standard 10)')
        .setMinValue(1).setMaxValue(25).setRequired(false)
    ),

  async execute(interaction) {
    const limit = interaction.options.getInteger('anzahl') || 10;
    const lb = getLeaderboard(interaction.guild.id, limit);

    if (!lb.length) {
      return interaction.reply({ content: '❌ Noch keine Daten vorhanden.', ephemeral: true });
    }

    // Liste bauen mit Medaillen für Top 3
    const lines = lb.map((row, i) => {
      const mention = `<@${row.userId}>`;
      let medal = "";

      if (i === 0) medal = "🥇 ";
      else if (i === 1) medal = "🥈 ";
      else if (i === 2) medal = "🥉 ";

      return `${medal}**#${i + 1}** ${row.name ? row.name : mention} (${mention})\n🏅 Lvl **${row.level}** · ${row.xp} XP`;
    });

    // Embed bauen
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f) // Gold-Gelb
      .setTitle(`🏆 Leaderboard (Top ${lb.length})`)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: `Angefragt von ${interaction.user.username}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};