import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";

export const SERVER_AUDIT_COMMAND_NAME = "serveraudit";
export const SERVER_AUDIT_SCHEMA_VERSION = 1;

export const serverAuditCommand = new SlashCommandBuilder()
  .setName(SERVER_AUDIT_COMMAND_NAME)
  .setDescription("Exporterar en read-only snapshot av serverns struktur och behörigheter.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

export function canRunServerAudit(memberPermissions) {
  return (
    memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false
  );
}

function permissionNames(bitField) {
  return bitField?.toArray().sort() ?? [];
}

function channelTypeName(type) {
  return ChannelType[type] ?? String(type);
}

function serializeOverwrite(guild, overwrite) {
  const isRole = overwrite.type === 0;
  const role = isRole ? guild.roles.cache.get(overwrite.id) : null;

  return {
    targetId: overwrite.id,
    targetType: isRole ? "role" : "member",
    targetName: role?.name ?? null,
    allow: permissionNames(overwrite.allow),
    deny: permissionNames(overwrite.deny)
  };
}

function serializeForumTag(tag) {
  return {
    id: tag.id,
    name: tag.name,
    moderated: Boolean(tag.moderated),
    emoji: tag.emoji
      ? {
          id: tag.emoji.id ?? null,
          name: tag.emoji.name ?? null
        }
      : null
  };
}

function serializeChannel(guild, channel) {
  const snapshot = {
    id: channel.id,
    name: channel.name,
    type: channelTypeName(channel.type),
    typeValue: channel.type,
    parentId: channel.parentId ?? null,
    position: channel.rawPosition ?? channel.position ?? 0,
    permissionOverwrites:
      channel.permissionOverwrites?.cache
        ?.map(overwrite => serializeOverwrite(guild, overwrite))
        .sort((a, b) =>
          `${a.targetType}:${a.targetName ?? a.targetId}`.localeCompare(
            `${b.targetType}:${b.targetName ?? b.targetId}`
          )
        ) ?? []
  };

  if ("topic" in channel) snapshot.topic = channel.topic ?? null;
  if ("nsfw" in channel) snapshot.nsfw = Boolean(channel.nsfw);
  if ("rateLimitPerUser" in channel) {
    snapshot.rateLimitPerUser = channel.rateLimitPerUser ?? 0;
  }
  if ("defaultAutoArchiveDuration" in channel) {
    snapshot.defaultAutoArchiveDuration =
      channel.defaultAutoArchiveDuration ?? null;
  }
  if ("defaultThreadRateLimitPerUser" in channel) {
    snapshot.defaultThreadRateLimitPerUser =
      channel.defaultThreadRateLimitPerUser ?? 0;
  }
  if ("availableTags" in channel && Array.isArray(channel.availableTags)) {
    snapshot.availableTags = channel.availableTags.map(serializeForumTag);
  }
  if ("defaultReactionEmoji" in channel) {
    snapshot.defaultReactionEmoji = channel.defaultReactionEmoji
      ? {
          id: channel.defaultReactionEmoji.id ?? null,
          name: channel.defaultReactionEmoji.name ?? null
        }
      : null;
  }
  if ("bitrate" in channel) snapshot.bitrate = channel.bitrate ?? null;
  if ("userLimit" in channel) snapshot.userLimit = channel.userLimit ?? null;

  return snapshot;
}

function serializeRole(role) {
  return {
    id: role.id,
    name: role.name,
    position: role.position,
    color: role.hexColor,
    hoist: role.hoist,
    managed: role.managed,
    mentionable: role.mentionable,
    permissions: permissionNames(role.permissions)
  };
}

export async function buildServerAuditSnapshot(guild) {
  await Promise.all([
    guild.channels.fetch(),
    guild.roles.fetch()
  ]);

  const botMember = guild.members.me ?? await guild.members.fetchMe();

  const roles = guild.roles.cache
    .map(serializeRole)
    .sort((a, b) => b.position - a.position || a.name.localeCompare(b.name));

  const channels = guild.channels.cache
    .map(channel => serializeChannel(guild, channel))
    .sort((a, b) => {
      const parentA = a.parentId ?? "";
      const parentB = b.parentId ?? "";
      return (
        parentA.localeCompare(parentB) ||
        a.position - b.position ||
        a.name.localeCompare(b.name)
      );
    });

  return {
    schemaVersion: SERVER_AUDIT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    scope: {
      readOnly: true,
      includesMessages: false,
      includesMemberList: false,
      includesSecrets: false
    },
    guild: {
      id: guild.id,
      name: guild.name,
      description: guild.description ?? null,
      ownerId: guild.ownerId,
      memberCount: guild.memberCount,
      preferredLocale: guild.preferredLocale,
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
      mfaLevel: guild.mfaLevel,
      premiumTier: guild.premiumTier,
      features: [...guild.features].sort(),
      systemChannelId: guild.systemChannelId ?? null,
      rulesChannelId: guild.rulesChannelId ?? null,
      publicUpdatesChannelId: guild.publicUpdatesChannelId ?? null,
      safetyAlertsChannelId: guild.safetyAlertsChannelId ?? null,
      afkChannelId: guild.afkChannelId ?? null,
      afkTimeout: guild.afkTimeout
    },
    bot: {
      id: botMember?.id ?? null,
      roleIds: botMember?.roles?.cache
        ? [...botMember.roles.cache.keys()].sort()
        : [],
      guildPermissions: permissionNames(botMember?.permissions)
    },
    roles,
    channels
  };
}

export function serverAuditFilename(guildId, generatedAt = new Date()) {
  const timestamp = generatedAt
    .toISOString()
    .replace(/[:.]/g, "-");

  return `chainsaw-discord-audit-${guildId}-${timestamp}.json`;
}
