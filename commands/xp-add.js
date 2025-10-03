const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addXp } = require('../features/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp-add')
    .setDescription('Fügt einem User XP hinzu.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(o => o.setName('menge').setDescription('XP-Menge').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('menge');

    const { leveledUp, level, xp } = addXp({
      guild: interaction.guild,
      user,
      amount,
      memberNameForCache: user.username,
    });

    let reply = `✅ ${amount} XP an ${user} gegeben (insgesamt: ${xp}).`;
    if (leveledUp) reply += ` 🎉 Neues Level: **${level}**!`;

    return interaction.reply({ content: reply, ephemeral: false });
  }
};