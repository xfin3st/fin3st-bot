// commands/info.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Zeigt Bot-Informationen'),
    async execute(interaction) {
        await interaction.reply(`
🤖 **Bot Info**
• Ping: ${interaction.client.ws.ping}ms
• Server: ${interaction.client.guilds.cache.size}
• Users: ${interaction.client.users.cache.size}
        `);
    }
};