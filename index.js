import "dotenv/config";

import {
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits
} from "discord.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN?.trim();
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID?.trim();
const WELCOME_CHANNEL_NAME =
  process.env.WELCOME_CHANNEL_NAME?.trim() || "freshly-hatched";

if (!DISCORD_TOKEN) {
  console.error("[startup] DISCORD_TOKEN saknas i Railway Variables.");
  process.exit(1);
}

if (/^(["']).*\1$/.test(DISCORD_TOKEN)) {
  console.error(
    "[startup] DISCORD_TOKEN får inte omges av citattecken i Railway Variables."
  );
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const requiredChannelPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages
];

function getWelcomeChannel(guild) {
  if (WELCOME_CHANNEL_ID) {
    return guild.channels.cache.get(WELCOME_CHANNEL_ID);
  }

  return guild.channels.cache.find(
    channel => channel.name === WELCOME_CHANNEL_NAME
  );
}

function validateWelcomeChannel(guild) {
  const channel = getWelcomeChannel(guild);

  if (!channel?.isSendable()) {
    const configuredChannel = WELCOME_CHANNEL_ID
      ? `ID ${WELCOME_CHANNEL_ID}`
      : `#${WELCOME_CHANNEL_NAME}`;

    throw new Error(
      `Ingen skrivbar välkomstkanal hittades för ${guild.name} (${configuredChannel}).`
    );
  }

  const botMember = guild.members.me;
  const permissions = botMember && channel.permissionsFor(botMember);

  if (!permissions?.has(requiredChannelPermissions)) {
    throw new Error(
      `Boten saknar View Channel eller Send Messages i #${channel.name}.`
    );
  }

  return channel;
}

client.once(Events.ClientReady, readyClient => {
  console.log(
    `[startup] Chainsaw Disco är online som ${readyClient.user.tag}`
  );

  for (const guild of readyClient.guilds.cache.values()) {
    try {
      const channel = validateWelcomeChannel(guild);
      console.log(
        `[startup] Välkomstkanal för ${guild.name}: #${channel.name}`
      );
    } catch (error) {
      console.error("[startup] Kanalinställningen är ogiltig:", error);
    }
  }
});

client.on(Events.GuildMemberAdd, async member => {
  // Skicka inget välkomstmeddelande till andra bottar
  if (member.user.bot) return;

  try {
    const channel = validateWelcomeChannel(member.guild);

    await channel.send({
      content:
        `🐣 <@${member.id}> har precis kläckts in i ` +
        `Chainsaw Disco – välkommen till galenskapen! 🪚🪩`,

      allowedMentions: {
        users: [member.id]
      }
    });

    console.log(
      `[welcome] Välkomstmeddelande skickat för ${member.user.tag}`
    );
  } catch (error) {
    console.error(
      `[welcome] Kunde inte välkomna ${member.user.tag}:`,
      error
    );
  }
});

client.on(Events.Error, error => {
  console.error("[discord] Klientfel:", error);
});

client.on(Events.ShardError, error => {
  console.error("[discord] Gateway-fel:", error);
});

let stopping = false;

async function stop(signal, exitCode = 0) {
  if (stopping) return;
  stopping = true;

  console.log(`[shutdown] Stoppar efter ${signal}.`);

  try {
    await client.destroy();
  } catch (error) {
    console.error("[shutdown] Kunde inte stänga Discord-klienten rent:", error);
  }

  process.exit(exitCode);
}

process.once("SIGTERM", () => {
  void stop("SIGTERM");
});

process.once("SIGINT", () => {
  void stop("SIGINT");
});

process.once("uncaughtException", error => {
  console.error("[process] Ohanterat undantag:", error);
  void stop("uncaughtException", 1);
});

process.once("unhandledRejection", error => {
  console.error("[process] Ohanterad promise-rejection:", error);
  void stop("unhandledRejection", 1);
});

try {
  await client.login(DISCORD_TOKEN);
} catch (error) {
  console.error(
    "[startup] Discord-inloggningen misslyckades. Kontrollera att tokenen är aktuell och inklistrad utan citattecken:",
    error
  );
  await stop("misslyckad Discord-inloggning", 1);
}
