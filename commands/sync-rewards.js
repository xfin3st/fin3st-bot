const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, getAllRewards } = require('../features/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-rewards')
    .setDescription('Synchronisiert alle Level-Rollen mit den aktuellen Rewards.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // nur Admins dürfen
    .setDMPermission(false), // kein DM-Befehl, nur auf Servern

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const rewards = getAllRewards(interaction.guild.id);
    if (!rewards.length) {
      return interaction.editReply('❌ Keine Rewards gesetzt.');
    }

    let applied = 0;

    for (const [id, member] of interaction.guild.members.cache) {
      const rec = getUser(interaction.guild.id, id);
      if (!rec) continue;

      for (const reward of rewards) {
        if (rec.level >= reward.level && !member.roles.cache.has(reward.roleId)) {
          try {
            await member.roles.add(reward.roleId);
            applied++;
          } catch (e) {
            console.error(`❌ Fehler bei Rolle für ${member.user.tag}:`, e);
          }
        }
      }
    }

    return interaction.editReply(`✅ Rewards synchronisiert. Insgesamt **${applied}** Rollen vergeben.`);
  }
};