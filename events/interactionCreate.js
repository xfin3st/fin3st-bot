const { Events, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        console.log(`🔹 Interaction received: ${interaction.type}`);
        
        // Handle Slash Commands FIRST
        if (interaction.isChatInputCommand()) {
            console.log(`✅ Slash command: ${interaction.commandName}`);
            
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`❌ Kein Befehl gefunden für: ${interaction.commandName}`);
                return await interaction.reply({ 
                    content: '❌ Dieser Befehl wurde nicht gefunden!', 
                    ephemeral: true 
                });
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`❌ Fehler bei Befehl ${interaction.commandName}:`, error);
                
                try {
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
                } catch (replyError) {
                    console.error('Konnte Fehler nicht senden:', replyError);
                }
            }
            return; // WICHTIG: Nach Slash Command returnen!
        } 
        
        // Handle Button Interactions SECOND
        if (interaction.isButton()) {
            console.log(`🔘 Button: ${interaction.customId}`);
            
            try {
                switch (interaction.customId) {
                    case 'create_ticket':
                        await handleTicketCreation(interaction);
                        break;
                    case 'close_ticket':
                        await handleTicketClose(interaction);
                        break;
                    case 'support_close_ticket':
                        await handleSupportCloseTicket(interaction);
                        break;
                    case 'claim_ticket':
                        await handleClaimTicket(interaction);
                        break;
                    default:
                        await interaction.reply({
                            content: '❌ Unbekannter Button!',
                            ephemeral: true
                        });
                }
            } catch (error) {
                console.error('❌ Fehler bei Button:', error);
                try {
                    await interaction.reply({
                        content: '❌ Diese Interaktion ist fehlgeschlagen!',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Konnte Fehler nicht senden:', replyError);
                }
            }
            return;
        }
        
        console.log(`ℹ️  Unbehandelte Interaktion: ${interaction.type}`);
    },
};

// Ticket Creation Handler mit verbesserter Fehlerbehandlung
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

    try {
        // Debug: Zeige Umgebungsvariablen
        console.log('Umgebungsvariablen:', {
            hasCategoryId: !!process.env.TICKET_CATEGORY_ID,
            categoryId: process.env.TICKET_CATEGORY_ID,
            hasSupportRole: !!process.env.SUPPORT_ROLE_ID
        });

        // Fallback: Wenn keine Kategorie ID, erstelle ohne Kategorie
        let parentId = null;
        if (process.env.TICKET_CATEGORY_ID) {
            const category = interaction.guild.channels.cache.get(process.env.TICKET_CATEGORY_ID);
            if (category) {
                parentId = process.env.TICKET_CATEGORY_ID;
                console.log('✅ Kategorie gefunden:', category.name);
            } else {
                console.log('⚠️  Kategorie nicht gefunden, erstelle ohne Kategorie');
            }
        } else {
            console.log('⚠️  TICKET_CATEGORY_ID nicht gesetzt, erstelle ohne Kategorie');
        }

        // Create ticket channel
        const ticketNumber = Math.floor(Math.random() * 1000);
        const channelData = {
            name: `ticket-${interaction.user.username}-${ticketNumber}`.toLowerCase().slice(0, 100),
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.AttachFiles,
                        PermissionsBitField.Flags.EmbedLinks
                    ]
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.ManageMessages,
                        PermissionsBitField.Flags.EmbedLinks,
                        PermissionsBitField.Flags.AttachFiles
                    ]
                }
            ],
            topic: `ticket-${interaction.user.id}`
        };

        // Füge parent nur hinzu wenn verfügbar
        if (parentId) {
            channelData.parent = parentId;
        }

        const ticketChannel = await interaction.guild.channels.create(channelData);
        console.log(`✅ Ticket channel created: ${ticketChannel.name}`);

        // Rest des Codes bleibt gleich...
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎫 Support Ticket')
            .setDescription(`Hallo ${interaction.user}, willkommen bei deinem Ticket!\n\nBitte beschreibe dein Anliegen so detailliert wie möglich.`)
            .addFields(
                { name: 'User', value: `${interaction.user.tag}`, inline: true },
                { name: 'Ticket ID', value: `#${ticketNumber}`, inline: true },
                { name: 'Erstellt am', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
            )
            .setFooter({ text: 'Unser Support-Team wird sich bald bei dir melden' });

        const actionButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Ticket schließen')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        await ticketChannel.send({
            content: `${interaction.user}`,
            embeds: [embed],
            components: [actionButtons]
        });

        await interaction.reply({
            content: `✅ Dein Ticket wurde erstellt: ${ticketChannel}`,
            ephemeral: true
        });

    } catch (error) {
        console.error('❌ Error creating ticket:', error);
        await interaction.reply({
            content: '❌ Fehler beim Erstellen des Tickets!',
            ephemeral: true
        });
    }
}

// Vereinfachte Close-Funktion
async function handleTicketClose(interaction) {
    try {
        await interaction.reply({ content: '🗑️ Ticket wird geschlossen...' });
        setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
    } catch (error) {
        console.error('Error closing ticket:', error);
        await interaction.reply({ content: '❌ Fehler beim Schließen!', ephemeral: true });
    }
}

// Platzhalter für andere Funktionen
async function handleSupportCloseTicket(interaction) {
    await interaction.reply({ content: '📝 Support close feature coming soon...', ephemeral: true });
}

async function handleClaimTicket(interaction) {
    await interaction.reply({ content: '👋 Claim feature coming soon...', ephemeral: true });
}