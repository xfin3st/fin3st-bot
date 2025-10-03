const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser } = require('../features/levels');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'data', 'levels.sqlite'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp-remove')
    .setDescription('Entfernt XP von einem User.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(o => o.setName('menge').setDescription('XP-Menge').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('menge');

    const rec = getUser(interaction.guild.id, user.id);
    if (!rec) {
      return interaction.reply({ content: 'User hat noch keine XP.', ephemeral: true });
    }

    let newXp = Math.max(0, rec.xp - amount);

    db.prepare(`UPDATE levels SET xp=? WHERE guildId=? AND userId=?`)
      .run(newXp, interaction.guild.id, user.id);

    return interaction.reply({ content: `❌ ${amount} XP von ${user} entfernt (neu: ${newXp} XP).`, ephemeral: false });
  }
};