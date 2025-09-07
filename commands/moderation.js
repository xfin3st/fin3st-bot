const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kickt einen Benutzer vom Server')
        .addUserOption(option =>
            option.setName('ziel')
                .setDescription('Der zu kickende Benutzer')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('grund')
                .setDescription('Grund für den Kick'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('ziel');
        const reason = interaction.options.getString('grund') || 'Kein Grund angegeben';
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ 
                content: '❌ Du hast keine Berechtigung, Benutzer zu kicken!', 
                ephemeral: true 
            });
        }
        
        if (user) {
            const member = interaction.guild.members.cache.get(user.id);
            if (member) {
                member.kick(reason)
                    .then(() => {
                        interaction.reply(`✅ ${user.tag} wurde gekickt. Grund: ${reason}`);
                    })
                    .catch(err => {
                        interaction.reply('❌ Ich konnte diesen Benutzer nicht kicken.');
                        console.error(err);
                    });
            } else {
                interaction.reply('❌ Dieser Benutzer ist nicht auf diesem Server!');
            }
        } else {
            interaction.reply('❌ Benutzer nicht gefunden!');
        }
    },
};
