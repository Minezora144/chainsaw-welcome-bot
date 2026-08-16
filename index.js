import "dotenv/config";

import {
  Client,
  Events,
  GatewayIntentBits,
  WebhookClient
} from "discord.js";

const { DISCORD_TOKEN, WEBHOOK_URL } = process.env;

if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN saknas.");
}

if (!WEBHOOK_URL) {
  throw new Error("WEBHOOK_URL saknas.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const webhook = new WebhookClient({
  url: WEBHOOK_URL.trim()
});

client.once(Events.ClientReady, readyClient => {
  console.log(`Chainsaw Disco är online som ${readyClient.user.tag}`);
});

client.on(Events.GuildMemberAdd, async member => {
  // Skicka inget välkomstmeddelande till andra bottar
  if (member.user.bot) return;

  try {
    await webhook.send({
      content:
        `🐣 <@${member.id}> har precis kläckts in i ` +
        `Chainsaw Disco – välkommen till galenskapen! 🪚🪩`,

      allowedMentions: {
        users: [member.id]
      }
    });

    console.log(`Välkomstmeddelande skickat för ${member.user.tag}`);
  } catch (error) {
    console.error(
      `Kunde inte välkomna ${member.user.tag}:`,
      error
    );
  }
});

client.on(Events.Error, error => {
  console.error("Discord-klientfel:", error);
});

process.on("unhandledRejection", error => {
  console.error("Ohanterat fel:", error);
});

client.login(DISCORD_TOKEN.trim());
