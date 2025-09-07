// commands/stats.js
module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Server-Statistiken'),
    async execute(interaction) {
        const guild = interaction.guild;
        await interaction.reply(`
📊 **Server Stats**
• Mitglieder: ${guild.memberCount}
• Online: ${guild.members.cache.filter(m => m.presence?.status === 'online').size}
• Channels: ${guild.channels.cache.size}
        `);
    }
};