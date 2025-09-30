const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const LAST_FILE = path.join(process.cwd(), 'data', 'youtube_last.json');

// Nur für dich → deine Discord-ID hier eintragen
const ADMIN_ID = '278927889406099457';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yt-reset')
    .setDescription('Setzt den YouTube-Video-Cache zurück (nur Admin)'), 

  async execute(interaction) {
    // Prüfen, ob der User der Admin ist
    if (interaction.user.id !== ADMIN_ID) {
      return interaction.reply({
        content: '❌ Du darfst diesen Befehl nicht benutzen.',
        ephemeral: true, // nur der User sieht die Nachricht
      });
    }

    try {
      if (fs.existsSync(LAST_FILE)) {
        fs.unlinkSync(LAST_FILE);
        await interaction.reply({
          content: '✅ YouTube-Cache wurde zurückgesetzt. Das nächste Video wird neu gepostet.',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: 'ℹ️ Es gibt aktuell keine youtube_last.json.',
          ephemeral: true,
        });
      }
    } catch (err) {
      console.error('❌ Fehler beim Löschen von youtube_last.json:', err);
      await interaction.reply({
        content: '❌ Fehler beim Zurücksetzen der Datei.',
        ephemeral: true,
      });
    }
  },
};
