import "dotenv/config";

import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits
} from "discord.js";

import {
  buildWelcomeMessage,
  canRunTestWelcome,
  TEST_WELCOME_COMMAND_NAME,
  testWelcomeCommand
} from "./bot-config.js";

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

async function sendWelcomeMessage(member) {
  const channel = validateWelcomeChannel(member.guild);

  await channel.send(buildWelcomeMessage(member.id));

  return channel;
}

async function registerTestWelcomeCommand(guild) {
  const commands = await guild.commands.fetch();
  const existingCommand = commands.find(
    command => command.name === TEST_WELCOME_COMMAND_NAME
  );
  const commandData = testWelcomeCommand.toJSON();

  if (existingCommand) {
    await guild.commands.edit(existingCommand.id, commandData);
    return "uppdaterat";
  }

  await guild.commands.create(commandData);
  return "registrerat";
}

client.once(Events.ClientReady, async readyClient => {
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

    try {
      const result = await registerTestWelcomeCommand(guild);
      console.log(
        `[startup] /${TEST_WELCOME_COMMAND_NAME} ${result} för ${guild.name}`
      );
    } catch (error) {
      console.error(
        `[startup] Kunde inte registrera /${TEST_WELCOME_COMMAND_NAME} för ${guild.name}:`,
        error
      );
    }
  }
});

client.on(Events.GuildMemberAdd, async member => {
  // Skicka inget välkomstmeddelande till andra bottar
  if (member.user.bot) return;

  try {
    await sendWelcomeMessage(member);

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

async function replyWithTestError(interaction) {
  const content =
    "Testet misslyckades. Kontrollera botens Railway-logg för orsaken.";

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(content);
    } else {
      await interaction.reply({
        content,
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error("[testwelcome] Kunde inte svara på kommandot:", error);
  }
}

async function handleTestWelcomeCommand(interaction) {
  try {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "Kommandot kan bara användas på en server.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!canRunTestWelcome(interaction.memberPermissions)) {
      await interaction.reply({
        content: "Du måste vara serveradministratör för att köra kommandot.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const channel = await sendWelcomeMessage(member);

    await interaction.editReply(
      `Testmeddelandet skickades till <#${channel.id}>.`
    );

    console.log(
      `[testwelcome] ${interaction.user.tag} testade i #${channel.name}`
    );
  } catch (error) {
    console.error(
      `[testwelcome] Testet misslyckades för ${interaction.user.tag}:`,
      error
    );
    await replyWithTestError(interaction);
  }
}

client.on(Events.InteractionCreate, interaction => {
  if (
    !interaction.isChatInputCommand() ||
    interaction.commandName !== TEST_WELCOME_COMMAND_NAME
  ) {
    return;
  }

  void handleTestWelcomeCommand(interaction);
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
