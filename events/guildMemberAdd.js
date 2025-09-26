const { Events, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        console.log(`👋 Neues Mitglied: ${member.user.tag}`);
        
        // Willkommensrolle zuweisen (falls konfiguriert)
        if (config.welcomeRoleId) {
            try {
                const role = member.guild.roles.cache.get(config.welcomeRoleId);
                if (role) {
                    await member.roles.add(role);
                    console.log(`✅ Willkommensrolle ${role.name} zu ${member.user.tag} hinzugefügt`);
                }
            } catch (error) {
                console.error('❌ Konnte Willkommensrolle nicht zuweisen:', error);
            }
        }
        
        // Willkommensnachricht senden
        const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId) || 
            member.guild.channels.cache.find(channel => 
                channel.type === ChannelType.GuildText && channel.name.includes('willkommen')
            );
        
        if (welcomeChannel) {
            try {
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle('Willkommen auf dem Server!')
                    .setDescription(`Hey ${member.user.globalName || member.user.username}, herzlich willkommen auf **${member.guild.name}**!`)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .addFields(
                        { name: 'Mitgliedsnummer', value: `#${member.guild.memberCount}`, inline: true },
                        { name: 'Account erstellt', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Viel Spaß auf unserem Server!' });
                
                await welcomeChannel.send({ embeds: [welcomeEmbed] });
                
                // Zusätzliche Nachricht mit Regeln
                if (member.guild.rulesChannelId) {
                    await welcomeChannel.send({
                        content: `Bitte lies dir die Regeln in <#${member.guild.rulesChannelId}> durch!`,
                    });
                }
            } catch (error) {
                console.error('❌ Konnte Willkommensnachricht nicht senden:', error);
            }
        }
        
        // Private Nachricht an das neue Mitglied senden
        try {
            await member.send({
                content: `Hey ${member.user.globalName || member.user.username}, willkommen auf **${member.guild.name}**! ` +
                         `Wir freuen uns, dich dabei zu haben. ` +
                         `Vergiss nicht, die Regeln durchzulesen und dich vorzustellen!`
            });
        } catch (error) {
            console.log('ℹ️ Konnte private Nachricht nicht senden (wahrscheinlich deaktivierte DMs)');
        }
    },
};