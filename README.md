# Chainsaw Welcome Bot

En liten Discord-bot som körs som en långlivad worker på Railway och skickar
ett välkomstmeddelande direkt till `#freshly-hatched` när en ny medlem går med.
Ingen Discord-webhook behövs.

## Drift

Botten ska köras på **Railway**, inte Vercel. Discords `GuildMemberAdd`-event
kommer via en permanent Gateway/WebSocket-anslutning. Vercels serverless-
funktioner är inte avsedda att hålla den anslutningen öppen.

Railway bygger repots `Dockerfile` och startar `node index.js` som en icke-root-
användare. Node 22 används både lokalt i containern och i `package.json`.

## Discord-inställningar

1. Öppna Discord Developer Portal och välj botapplikationen.
2. Under **Bot > Privileged Gateway Intents**, aktivera
   **Server Members Intent**.
3. Ge botrollen **View Channel** och **Send Messages** i
   `#freshly-hatched`.
4. Kopiera kanalens ID och sätt det som `WELCOME_CHANNEL_ID` i Railway. Det är
   rekommenderat men inte obligatoriskt; utan ID används kanalnamnet
   `freshly-hatched`.

## Railway Variables

| Variabel | Krävs | Innehåll |
| --- | --- | --- |
| `DISCORD_TOKEN` | Ja | Botens aktuella token, utan citattecken |
| `WELCOME_CHANNEL_ID` | Rekommenderas | Kanal-ID för `#freshly-hatched` |
| `WELCOME_CHANNEL_NAME` | Nej | Reservnamn; standard är `freshly-hatched` |

`WEBHOOK_URL` används inte längre och kan tas bort från Railway efter att den
gamla webhooken har raderats i Discord.

## Säker återställning efter en exponerad nyckel

1. Återställ bot-tokenen i Discord Developer Portal.
2. Lägg den nya tokenen i Railway Variables som `DISCORD_TOKEN`. Klistra in
   endast värdet, utan `"` eller extra blanksteg.
3. Radera den tidigare Discord-webhooken under
   **Server Settings > Integrations > Webhooks**. Skapa ingen ny för denna bot.
4. Starta en ny Railway-deployment.

Att radera en fil från GitHub tar inte bort hemligheten ur Git-historiken.
Rotationen ovan är därför den viktiga säkerhetsåtgärden.

## Verifiering

Kör lokalt:

```bash
npm ci
npm run check
```

Efter en Railway-deployment ska loggen innehålla ungefär:

```text
[startup] Chainsaw Disco är online som Chainsaw Disco#6721
[startup] Välkomstkanal för Chainsaw Disco: #freshly-hatched
```

Testa därefter med ett vanligt användarkonto som går med i servern. Bottar
ignoreras avsiktligt.

## Stäng av Vercel-deployments

När Railway-deploymenten är verifierad: koppla bort Git-repot från Vercel eller
radera Vercel-projektet `chainsaw-welcome-bot`. Annars kommer varje commit till
`main` fortsätta utlösa en misslyckad Vercel-build.
