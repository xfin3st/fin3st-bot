// commands/ticket.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Erstelle ein Ticket'),
    async execute(interaction) {
        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('Ticket erstellen')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );
        
        await interaction.reply({
            content: '**Ticket-System**\nKlicke auf den Button unten um ein Ticket zu erstellen!',
            components: [button]
        });
    }
};