const { exec } = require("child_process");
const { upload } = require('./mega');
const express = require('express');
let router = express.Router();
const pino = require("pino");
const { toBuffer } = require("qrcode");
const path = require('path');
const fs = require("fs-extra");
const { Boom } = require("@hapi/boom");

const MESSAGE = process.env.MESSAGE || `
*🔥 HANS TECH LIVE SESSION! 🔥*

Your session is officially active with cutting-edge Hans Tech technology.
Explore more at:
https://whatsapp.com/channel/0029VaZDIdxDTkKB4JSWUk1O
Stay connected and experience the future of tech with Hans Tech!
`;

// Clean old sessions
if (fs.existsSync('./auth_info_baileys')) {
  fs.emptyDirSync(path.join(__dirname, 'auth_info_baileys'));
}

router.get('/', async (req, res) => {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    delay,
    DisconnectReason,
    makeInMemoryStore
  } = require("baileys");

  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

  async function startSession() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info_baileys'));
    try {
      const sock = makeWASocket({
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"),
        auth: state
      });

      sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr && !res.headersSent) {
          try {
            const qrBuffer = await toBuffer(qr);
            const base64 = qrBuffer.toString('base64');
            const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Hans Tech QR</title>
  <style>
    body {
      background-color: #121212;
      color: #fff;
      font-family: sans-serif;
      text-align: center;
      padding-top: 40px;
    }
    img {
      border: 4px solid #4caf50;
      border-radius: 12px;
    }
    a {
      color: #4caf50;
    }
  </style>
</head>
<body>
  <h1>Scan this QR with WhatsApp</h1>
  <img src="data:image/png;base64,${base64}" alt="QR Code" />
  <p>Powered by <strong>Hans Tech</strong><br>
  <a href="https://github.com/haroldmth" target="_blank">GitHub</a> |
  <a href="https://hans-web.vercel.app" target="_blank">Support</a></p>
</body>
</html>`;
            return res.send(html);
          } catch (err) {
            console.error("QR generation error:", err);
            return res.status(500).send("Failed to generate QR");
          }
        }

        if (connection === "open") {
          await delay(3000);
          const user = sock.user.id;

          function randomSessionId(len = 6, numLen = 4) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
            const num = Math.floor(Math.random() * Math.pow(10, numLen));
            return `${result}${num}`;
          }

          const authPath = path.join(__dirname, 'auth_info_baileys', 'creds.json');
          const megaUrl = await upload(fs.createReadStream(authPath), `${randomSessionId()}.json`);
          const sessionId = `HANS-BYTE~ ${megaUrl.replace('https://mega.nz/file/', '')}`;

          console.log(`
====================  SESSION ID  ==========================
SESSION-ID ==> ${sessionId}
------------------------------------------------------------
          `);

          const sent = await sock.sendMessage(user, { text: sessionId });
          await sock.sendMessage(user, { text: MESSAGE }, { quoted: sent });

          await delay(1000);
          await fs.emptyDir(path.join(__dirname, 'auth_info_baileys'));
        }

        sock.ev.on("creds.update", saveCreds);

        if (connection === "close") {
          const code = new Boom(lastDisconnect?.error)?.output.statusCode;
          switch (code) {
            case DisconnectReason.connectionClosed:
              console.log("Connection closed");
              break;
            case DisconnectReason.connectionLost:
              console.log("Connection lost");
              break;
            case DisconnectReason.restartRequired:
              console.log("Restart required");
              return startSession();
            case DisconnectReason.timedOut:
              console.log("Connection timed out");
              break;
            default:
              console.log("Disconnected unexpectedly:", code);
              await delay(5000);
              exec("pm2 restart qasim");
              process.exit(1);
          }
        }
      });
    } catch (err) {
      console.error("Startup error:", err);
      await fs.emptyDir(path.join(__dirname, 'auth_info_baileys'));
      exec("pm2 restart qasim");
    }
  }

  await startSession();
});

module.exports = router;
