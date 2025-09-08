const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Erstelle ein Ticket-System'),
    async execute(interaction) {
        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('Ticket erstellen')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎫 Ticket System')
            .setDescription('Klicke auf den Button unten um ein Support-Ticket zu erstellen!')
            .addFields(
                { name: 'Support', value: 'Unser Team hilft dir gerne weiter', inline: true },
                { name: 'Reaktionszeit', value: 'Normalerweise innerhalb von 24 Stunden', inline: true }
            )
            .setFooter({ text: 'Support Team' });

        await interaction.reply({
            embeds: [embed],
            components: [button]
        });
    }
};