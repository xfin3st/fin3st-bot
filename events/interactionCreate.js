const { Events, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle Slash Commands
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
                console.log(`🔘 Button clicked: ${interaction.customId} by ${interaction.user.tag}`);
                
                if (interaction.customId === 'create_ticket') {
                    await handleTicketCreation(interaction);
                }
                else if (interaction.customId === 'close_ticket') {
                    await handleTicketClose(interaction);
                }
                else if (interaction.customId === 'support_close_ticket') {
                    await handleSupportCloseTicket(interaction);
                }
                else if (interaction.customId === 'claim_ticket') {
                    await handleClaimTicket(interaction);
                }
            } catch (error) {
                console.error('❌ Fehler bei Button-Interaktion:', error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: '❌ Diese Interaktion ist fehlgeschlagen!',
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: '❌ Diese Interaktion ist fehlgeschlagen!',
                        ephemeral: true
                    });
                }
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

    try {
        // Debug: Zeige Umgebungsvariablen
        console.log('🔍 Umgebungsvariablen im Ticket-Handler:');
        console.log('- TICKET_CATEGORY_ID:', process.env.TICKET_CATEGORY_ID);
        console.log('- SUPPORT_ROLE_ID:', process.env.SUPPORT_ROLE_ID);

        // Berechtigungen für den Ticket-Channel
        const permissionOverwrites = [
            // @everyone - KEINE Rechte
            {
                id: interaction.guild.id,
                deny: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            // Ticket Ersteller - VOLLER Zugriff
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
            // Bot - ADMIN Rechte
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
        ];

        // Support Rolle hinzufügen falls vorhanden
        if (process.env.SUPPORT_ROLE_ID) {
            permissionOverwrites.push({
                id: process.env.SUPPORT_ROLE_ID,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.ManageMessages,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.AttachFiles
                ]
            });
            console.log('✅ Support-Rolle hinzugefügt');
        }

        // Channel-Daten vorbereiten
        const channelData = {
            name: `ticket-${interaction.user.username}`.toLowerCase().slice(0, 100),
            type: ChannelType.GuildText,
            permissionOverwrites: permissionOverwrites,
            topic: `ticket-${interaction.user.id}`
        };

        // Kategorie hinzufügen falls vorhanden
        if (process.env.TICKET_CATEGORY_ID) {
            channelData.parent = process.env.TICKET_CATEGORY_ID;
            console.log('✅ Verwende Kategorie:', process.env.TICKET_CATEGORY_ID);
        } else {
            console.log('⚠️  Keine Kategorie-ID, erstelle ohne Kategorie');
        }

        // Ticket-Channel erstellen
        const ticketChannel = await interaction.guild.channels.create(channelData);
        console.log(`✅ Ticket channel created: ${ticketChannel.name}`);

        // Embed für Willkommensnachricht
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎫 Support Ticket')
            .setDescription(`Hallo ${interaction.user}, willkommen bei deinem Ticket!\n\nBitte beschreibe dein Anliegen so detailliert wie möglich.`)
            .addFields(
                { name: 'User', value: `${interaction.user.tag}`, inline: true },
                { name: 'Channel', value: `${ticketChannel}`, inline: true },
                { name: 'Erstellt am', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false },
                { name: 'Zugriff', value: 'Nur du und das Support-Team können diesen Channel sehen', inline: false }
            )
            .setFooter({ text: 'Unser Support-Team wird sich bald bei dir melden' });

        // Buttons für Ticket-Aktionen
        const actionButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Ticket schließen')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒'),
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Ticket übernehmen')
                .setStyle(ButtonStyle.Success)
                .setEmoji('👋')
        );

        const supportButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('support_close_ticket')
                .setLabel('Support schließt Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📝')
        );

        // Willkommensnachricht senden
        const welcomeMessage = await ticketChannel.send({
            content: `${interaction.user} ${process.env.SUPPORT_ROLE_ID ? `<@&${process.env.SUPPORT_ROLE_ID}>` : ''}`,
            embeds: [embed],
            components: [actionButtons, supportButtons]
        });

        // Nachricht anpinnen
        await welcomeMessage.pin();
        console.log('✅ Welcome message sent and pinned');

        // Antwort an den User
        await interaction.reply({
            content: `✅ Dein Ticket wurde erstellt: ${ticketChannel}\n**Nur du und das Support-Team können den Channel sehen!**`,
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

// Ticket Close Handler (durch User)
async function handleTicketClose(interaction) {
    try {
        // Check if this is actually a ticket channel
        if (!interaction.channel.topic || !interaction.channel.topic.includes('ticket-')) {
            return await interaction.reply({
                content: '❌ Dieser Befehl kann nur in Ticket-Channels verwendet werden!',
                ephemeral: true
            });
        }

        // Check if user is ticket owner or support
        const ticketOwnerId = interaction.channel.topic.split('-')[1];
        const isSupport = process.env.SUPPORT_ROLE_ID && interaction.member.roles.cache.has(process.env.SUPPORT_ROLE_ID);
        
        if (interaction.user.id !== ticketOwnerId && !isSupport) {
            return await interaction.reply({
                content: '❌ Nur der Ticket-Ersteller oder Support-Mitglieder können das Ticket schließen!',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: '🗑️ Ticket wird in 5 Sekunden geschlossen...',
        });
        
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                console.error('Fehler beim Löschen des Ticket-Channels:', error);
                await interaction.channel.send('❌ Konnte den Channel nicht löschen. Bitte manuell löschen.');
            }
        }, 5000);
    } catch (error) {
        console.error('Error closing ticket:', error);
        await interaction.reply({
            content: '❌ Fehler beim Schließen des Tickets!',
            ephemeral: true
        });
    }
}

// Support Close Ticket Handler (durch Support)
async function handleSupportCloseTicket(interaction) {
    try {
        if (!interaction.channel.topic || !interaction.channel.topic.includes('ticket-')) {
            return await interaction.reply({
                content: '❌ Dieser Befehl kann nur in Ticket-Channels verwendet werden!',
                ephemeral: true
            });
        }

        // Check if user has support role
        if (!process.env.SUPPORT_ROLE_ID || !interaction.member.roles.cache.has(process.env.SUPPORT_ROLE_ID)) {
            return await interaction.reply({
                content: '❌ Nur Support-Mitglieder können diesen Befehl verwenden!',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Ticket geschlossen')
            .setDescription(`Das Ticket wurde von ${interaction.user} (Support) geschlossen.`)
            .addFields(
                { name: 'Geschlossen von', value: `${interaction.user.tag}`, inline: true },
                { name: 'Geschlossen am', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
            )
            .setFooter({ text: 'Ticket-System' });

        await interaction.reply({ embeds: [embed] });
        
        // Buttons deaktivieren
        const disabledButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket_disabled')
                .setLabel('Ticket geschlossen')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✅')
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('support_close_ticket_disabled')
                .setLabel('Support geschlossen')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✅')
                .setDisabled(true)
        );

        await interaction.message.edit({ components: [disabledButtons] });

    } catch (error) {
        console.error('Error with support close:', error);
        await interaction.reply({
            content: '❌ Fehler beim Schließen des Tickets!',
            ephemeral: true
        });
    }
}

// Ticket Claim Handler (Support übernimmt Ticket)
async function handleClaimTicket(interaction) {
    try {
        if (!interaction.channel.topic || !interaction.channel.topic.includes('ticket-')) {
            return await interaction.reply({
                content: '❌ Dieser Befehl kann nur in Ticket-Channels verwendet werden!',
                ephemeral: true
            });
        }

        // Check if user has support role
        if (!process.env.SUPPORT_ROLE_ID || !interaction.member.roles.cache.has(process.env.SUPPORT_ROLE_ID)) {
            return await interaction.reply({
                content: '❌ Nur Support-Mitglieder können Tickets übernehmen!',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('👋 Ticket übernommen')
            .setDescription(`${interaction.user} (Support) kümmert sich nun um dieses Ticket.`)
            .addFields(
                { name: 'Support-Mitarbeiter', value: `${interaction.user.tag}`, inline: true },
                { name: 'Übernommen am', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
            )
            .setFooter({ text: 'Vielen Dank für deine Hilfe!' });

        await interaction.reply({ embeds: [embed] });

        // Claim-Button deaktivieren
        const actionButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Ticket schließen')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒'),
            new ButtonBuilder()
                .setCustomId('claim_ticket_disabled')
                .setLabel('Bereits übernommen')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✅')
                .setDisabled(true)
        );

        await interaction.message.edit({ components: [actionButtons] });

    } catch (error) {
        console.error('Error claiming ticket:', error);
        await interaction.reply({
            content: '❌ Fehler beim Übernehmen des Tickets!',
            ephemeral: true
        });
    }
}