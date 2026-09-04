import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const TEST_WELCOME_COMMAND_NAME = "testwelcome";

export const testWelcomeCommand = new SlashCommandBuilder()
  .setName(TEST_WELCOME_COMMAND_NAME)
  .setDescription("Skickar ett test av välkomstmeddelandet.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

export function buildWelcomeMessage(memberId) {
  return {
    content:
      `🐣 <@${memberId}> har precis kläckts in i ` +
      `Chainsaw Disco – välkommen till galenskapen! 🪚🪩`,
    allowedMentions: {
      users: [memberId]
    }
  };
}

export function canRunTestWelcome(memberPermissions) {
  return (
    memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false
  );
}
