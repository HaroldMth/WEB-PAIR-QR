const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require("child_process");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const { upload } = require('./gofile');              // ← GoFile module
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason
} = require("baileys");

let router = express.Router();

const MESSAGE = process.env.MESSAGE || `
🔥 *HANS TECH LIVE SESSION* 🔥
Join our channel: https://whatsapp.com/channel/0029VaZDIdxDTkKB4JSWUk1O
`;

if (fs.existsSync('./auth_info_baileys')) {
  fs.emptyDirSync(path.resolve(__dirname, 'auth_info_baileys'));
}

router.get('/', async (req, res) => {
  let num = (req.query.number || '').replace(/\D/g, '');

  async function SUHAIL() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    try {
      const Smd = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: "fatal" }))
        },
        printQRInTerminal: false,
        browser: Browsers.macOS("Safari"),
        logger: pino().child({ level: "fatal" })
      });

      if (!Smd.authState.creds.registered) {
        await delay(1500);
        const code = await Smd.requestPairingCode(num);
        if (!res.headersSent) res.send({ code });
      }

      Smd.ev.on('creds.update', saveCreds);
      Smd.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "open") {
          await delay(10000);
          const authPath = path.resolve(__dirname, 'auth_info_baileys');
          
          // Generate random ID
          function randomMegaId(len = 6, numLen = 4) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let s = '';
            for (let i = 0; i < len; i++) {
              s += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return s + Math.floor(Math.random() * 10**numLen);
          }

          try {
            // Upload using GoFile
            const credsFile = path.join(authPath, 'creds.json');
            const gofileUrl = await upload(
              credsFile,
              `${randomMegaId()}.json`,
              process.env.GOFILE_TOKEN
            );
            const Id_session = gofileUrl.split('/').pop();
            const sessionCode = `HANS-BYTE~ ${Id_session}`;

            let sidMessage = await Smd.sendMessage(Smd.user.id, { text: sessionCode });
            await Smd.sendMessage(Smd.user.id, { text: MESSAGE }, { quoted: sidMessage });

            await fs.emptyDir(authPath);
          } catch (e) {
            console.error("Upload/send error:", e);
          }
        }

        if (connection === "close") {
          const reason = new Boom(lastDisconnect?.error).output.statusCode;
          switch (reason) {
            case DisconnectReason.connectionClosed:
              console.log("Connection closed!");
              break;
            case DisconnectReason.connectionLost:
              console.log("Connection lost!");
              break;
            case DisconnectReason.restartRequired:
              console.log("Restart required!");
              SUHAIL().catch(console.error);
              break;
            case DisconnectReason.timedOut:
              console.log("Connection timed out!");
              break;
            default:
              console.log("Unknown disconnect, restarting...");
              exec('pm2 restart qasim');
          }
        }
      });

    } catch (err) {
      console.error("Error in SUHAIL:", err);
      exec('pm2 restart qasim');
      await fs.emptyDir(path.resolve(__dirname, 'auth_info_baileys'));
      if (!res.headersSent) res.send({ code: "Try after a few minutes" });
    }
  }

  await SUHAIL();
});

module.exports = router;
