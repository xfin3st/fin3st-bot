const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Löscht mehrere Nachrichten im aktuellen Channel.')
    .addIntegerOption(option =>
      option.setName('anzahl')
        .setDescription('Wie viele Nachrichten sollen gelöscht werden? (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // Nur Admins / Mods mit Berechtigung

  async execute(interaction) {
    const amount = interaction.options.getInteger('anzahl');

    // Admin-/Mod-Check (Fallback)
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ Dafür hast du keine Rechte!', ephemeral: true });
    }

    try {
      await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({ content: `✅ ${amount} Nachrichten gelöscht!`, ephemeral: true });
    } catch (error) {
      console.error('❌ Fehler beim Löschen:', error);
      await interaction.reply({ content: '❌ Fehler beim Löschen der Nachrichten.', ephemeral: true });
    }
  }
};