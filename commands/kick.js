// commands/kick.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kickt einen Benutzer')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Der zu kickende User')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        await interaction.reply(`✅ ${user.tag} wurde gekickt!`);
    }
};