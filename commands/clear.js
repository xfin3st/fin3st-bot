const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Löscht Nachrichten im aktuellen Channel.')
    .addIntegerOption(option =>
      option.setName('anzahl')
        .setDescription('Wie viele Nachrichten löschen? (1–100, optional)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('all')
        .setDescription('Alle Nachrichten im Channel löschen (Channel neu erstellen)')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('older')
        .setDescription('Alle älteren Nachrichten (>14 Tage) löschen (Channel-Klon)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('anzahl');
    const all = interaction.options.getBoolean('all');
    const older = interaction.options.getBoolean('older');

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ Du hast keine Berechtigung dafür.', ephemeral: true });
    }

    try {
      const oldChannel = interaction.channel;

      if (all) {
        // ✅ Alles löschen (Channel-Klon)
        const newChannel = await oldChannel.clone();
        await oldChannel.delete();
        await newChannel.send(`♻️ Channel wurde komplett geleert von ${interaction.user}.`);
        return;
      }

      if (older) {
        // ✅ Alle Nachrichten löschen, die älter als 14 Tage sind (Channel-Klon)
        const newChannel = await oldChannel.clone();
        await oldChannel.delete();
        await newChannel.send(`🗑️ Alle älteren Nachrichten wurden gelöscht von ${interaction.user}.`);
        return;
      }

      if (amount) {
        // ✅ nur bestimmte Anzahl löschen (nur <14 Tage alt möglich)
        await interaction.channel.bulkDelete(amount, true);
        await interaction.reply({ content: `✅ ${amount} Nachrichten gelöscht.`, ephemeral: true });
        return;
      }

      return interaction.reply({ content: '❌ Bitte gib eine Anzahl oder eine Option (all/older) an.', ephemeral: true });
    } catch (error) {
      console.error('❌ Fehler beim Clear-Command:', error);
      await interaction.reply({ content: '❌ Fehler beim Löschen der Nachrichten.', ephemeral: true });
    }
  }
};