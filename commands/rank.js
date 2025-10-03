const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../features/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Zeigt dein aktuelles Level, XP und Fortschritt.')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Wessen Level anzeigen?')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const rec = getUser(interaction.guild.id, user.id);

    if (!rec) {
      return interaction.reply({
        content: `❌ Für ${user.username} gibt es noch keine XP-Daten.`,
        ephemeral: true
      });
    }

    // Fortschrittsbalken
    const barLen = 20;
    const filled = Math.round((rec.xpIntoLevel / rec.xpNeed) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

    // Embed
    const embed = new EmbedBuilder()
      .setColor(0x3498db) // Blau
      .setAuthor({ name: `${user.username}`, iconURL: user.displayAvatarURL() })
      .setTitle(`📊 Level-Statistik`)
      .setDescription(
        `🏅 Level: **${rec.level}**\n` +
        `🔢 Gesamt XP: **${rec.xp}**\n` +
        `📈 Fortschritt: \`${bar}\`\n` +
        `➡️ ${rec.xpIntoLevel}/${rec.xpNeed} XP (noch ${rec.xpToNext} bis Level ${rec.level + 1})`
      )
      .setFooter({ text: `Angefragt von ${interaction.user.username}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};