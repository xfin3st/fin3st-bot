const { Events, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle Chat Commands
        if (interaction.isChatInputCommand()) {
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
        } 
        // Handle Button Interactions (TICKET SYSTEM)
        else if (interaction.isButton()) {
            try {
                if (interaction.customId === 'create_ticket') {
                    await handleTicketCreation(interaction);
                }
                else if (interaction.customId === 'close_ticket') {
                    await handleTicketClose(interaction);
                }
            } catch (error) {
                console.error('❌ Fehler bei Button-Interaktion:', error);
                await interaction.reply({
                    content: '❌ Diese Interaktion ist fehlgeschlagen!',
                    ephemeral: true
                });
            }
        }
    },
};

// Ticket Creation Handler
async function handleTicketCreation(interaction) {
    // Check if user already has a ticket
    const existingTicket = interaction.guild.channels.cache.find(
        channel => channel.topic && channel.topic.includes(`ticket-${interaction.user.id}`)
    );

    if (existingTicket) {
        return await interaction.reply({
            content: `❌ Du hast bereits ein offenes Ticket: ${existingTicket}`,
            ephemeral: true
        });
    }

    // Create ticket channel
    const ticketNumber = Math.floor(Math.random() * 1000);
    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}-${ticketNumber}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ],
        topic: `ticket-${interaction.user.id}`
    });

    await interaction.reply({
        content: `✅ Dein Ticket wurde erstellt: ${ticketChannel}`,
        ephemeral: true
    });

    // Welcome message in ticket channel
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎫 Support Ticket')
        .setDescription(`Hallo ${interaction.user}, willkommen bei deinem Ticket!\n\nBitte beschreibe dein Anliegen so detailliert wie möglich.`)
        .addFields(
            { name: 'User', value: `${interaction.user.tag}`, inline: true },
            { name: 'Erstellt am', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
        )
        .setFooter({ text: 'Support Team' });

    const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Ticket schließen')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
    );

    await ticketChannel.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [closeButton]
    });
}

// Ticket Close Handler
async function handleTicketClose(interaction) {
    await interaction.reply({
        content: '🗑️ Ticket wird geschlossen...',
        ephemeral: true
    });
    
    setTimeout(async () => {
        try {
            await interaction.channel.delete();
        } catch (error) {
            console.error('Fehler beim Löschen des Ticket-Channels:', error);
        }
    }, 2000);
}