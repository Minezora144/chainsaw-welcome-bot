import assert from "node:assert/strict";
import test from "node:test";

import { PermissionFlagsBits, PermissionsBitField } from "discord.js";

import {
  buildWelcomeMessage,
  canRunTestWelcome,
  TEST_WELCOME_COMMAND_NAME,
  testWelcomeCommand
} from "../bot-config.js";

test("testwelcome is restricted to administrators and guilds", () => {
  const command = testWelcomeCommand.toJSON();

  assert.equal(command.name, TEST_WELCOME_COMMAND_NAME);
  assert.equal(
    command.default_member_permissions,
    PermissionFlagsBits.Administrator.toString()
  );
  assert.equal(command.dm_permission, false);
});

test("runtime permission check accepts only administrators", () => {
  const administrator = new PermissionsBitField(
    PermissionFlagsBits.Administrator
  );
  const moderator = new PermissionsBitField(
    PermissionFlagsBits.ManageMessages
  );

  assert.equal(canRunTestWelcome(administrator), true);
  assert.equal(canRunTestWelcome(moderator), false);
  assert.equal(canRunTestWelcome(null), false);
});

test("welcome message mentions only the selected member", () => {
  const memberId = "123456789012345678";

  assert.deepEqual(buildWelcomeMessage(memberId), {
    content:
      `🐣 <@${memberId}> har precis kläckts in i ` +
      `Chainsaw Disco – välkommen till galenskapen! 🪚🪩`,
    allowedMentions: {
      users: [memberId]
    }
  });
});
