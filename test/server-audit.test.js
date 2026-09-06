import assert from "node:assert/strict";
import test from "node:test";

import { PermissionFlagsBits, PermissionsBitField } from "discord.js";

import {
  canRunServerAudit,
  SERVER_AUDIT_COMMAND_NAME,
  serverAuditCommand,
  serverAuditFilename
} from "../server-audit.js";

test("serveraudit is restricted to administrators and guilds", () => {
  const command = serverAuditCommand.toJSON();

  assert.equal(command.name, SERVER_AUDIT_COMMAND_NAME);
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
    PermissionFlagsBits.ManageGuild
  );

  assert.equal(canRunServerAudit(administrator), true);
  assert.equal(canRunServerAudit(moderator), false);
  assert.equal(canRunServerAudit(null), false);
});

test("audit filename is deterministic and JSON", () => {
  const generatedAt = new Date("2026-09-06T18:30:00.000Z");
  const filename = serverAuditFilename("123", generatedAt);

  assert.equal(
    filename,
    "chainsaw-discord-audit-123-2026-09-06T18-30-00-000Z.json"
  );
});
