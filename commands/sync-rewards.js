const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, getAllRewards } = require('../features/levels');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-rewards')
    .setDescription('Synchronisiert alle Level-Rollen mit den aktuellen Rewards.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

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
            await sleep(1000); // 1 Sekunde Pause pro Rolle → verhindert Spam
          } catch (e) {
            console.error(`❌ Fehler bei Rolle für ${member.user.tag}:`, e);
          }
        }
      }
    }

    return interaction.editReply(`✅ Rewards synchronisiert. Insgesamt **${applied}** Rollen vergeben.`);
  }
};