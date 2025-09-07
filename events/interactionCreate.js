const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`❌ Kein Befehl gefunden für ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`❌ Fehler bei Ausführung von ${interaction.commandName}`);
            console.error(error);
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: '❌ Es gab einen Fehler bei der Ausführung dieses Befehls!', 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: '❌ Es gab einen Fehler bei der Ausführung dieses Befehls!', 
                    ephemeral: true 
                });
            }
        }
    },
};