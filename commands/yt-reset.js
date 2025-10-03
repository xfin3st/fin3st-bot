const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');

const LAST_FILE = path.join(process.cwd(), 'data', 'youtube_last.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yt-reset')
        .setDescription('Löscht den gespeicherten YouTube-Cache. Das nächste Video wird neu gepostet.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Nur Admins

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.editReply('❌ Du musst Admin sein, um diesen Befehl zu nutzen.');
            }

            await fs.rm(LAST_FILE, { force: true });
            await interaction.editReply('♻️ YouTube-Cache zurückgesetzt. Beim nächsten Check wird das aktuelle Video neu gepostet.');
        } catch (error) {
            console.error('❌ Fehler bei /yt-reset:', error);
            await interaction.editReply('❌ Fehler beim Zurücksetzen des YouTube-Caches: ' + error.message);
        }
    }
};