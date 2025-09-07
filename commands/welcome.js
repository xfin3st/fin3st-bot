const { SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-welcome')
        .setDescription('Konfiguriere die Willkommensnachrichten')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Der Kanal für Willkommensnachrichten')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Die Rolle, die neuen Mitgliedern gegeben wird')),
    async execute(interaction) {
        if (!interaction.member.permissions.has('ManageGuild')) {
            return interaction.reply({ 
                content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden!', 
                ephemeral: true 
            });
        }
        
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        
        // Hier würde man normalerweise die Einstellungen in einer DB speichern
        // Für dieses Beispiel geben wir nur eine Bestätigung aus
        
        await interaction.reply({
            content: `✅ Willkommensnachrichten wurden konfiguriert! Kanal: ${channel}${role ? `, Rolle: ${role}` : ''}`,
            ephemeral: true
        });
    },
};