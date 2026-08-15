import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  WebhookClient
} from "discord.js";

const { DISCORD_TOKEN, WEBHOOK_URL } = process.env;

if (!DISCORD_TOKEN || !WEBHOOK_URL) {
  throw new Error("DISCORD_TOKEN eller WEBHOOK_URL saknas.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const webhook = new WebhookClient({
  url: WEBHOOK_URL
});

client.once(Events.ClientReady, readyClient => {
  console.log(`Chainsaw Disco är online som ${readyClient.user.tag}`);
});

client.on(Events.GuildMemberAdd, async member => {
  if (member.user.bot) return;

  try {
    await webhook.send({
      content:
        `🐣 <@${member.id}> har precis kläckts in i Chainsaw Disco – ` +
        `välkommen till galenskapen! 🪚🪩`,
      allowedMentions: {
        users: [member.id]
      }
    });
  } catch (error) {
    console.error("Kunde inte skicka välkomstmeddelandet:", error);
  }
});

client.login(DISCORD_TOKEN);
