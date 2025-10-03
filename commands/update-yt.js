const { SlashCommandBuilder } = require('discord.js');
const { createChecker } = require('../features/youtubeAlerts');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update-yt')
        .setDescription('Prüft manuell auf ein neues YouTube Video und postet es sofort, falls vorhanden.'),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const ytCfg = {
                channelId: process.env.YOUTUBE_CHANNEL_ID,
                alertChannelId: process.env.ALERT_CHANNEL_ID,
                pingRoleId: process.env.PING_ROLE_ID || null
            };

            const { checkOnce } = createChecker(client, ytCfg);

            await checkOnce(true); // true = manueller Modus (gibt Rückmeldung im Channel)

            await interaction.editReply('✅ YouTube-Check abgeschlossen.');
        } catch (error) {
            console.error('❌ Fehler bei /update-yt:', error);
            await interaction.editReply('❌ Fehler beim YouTube-Check: ' + error.message);
        }
    }
};