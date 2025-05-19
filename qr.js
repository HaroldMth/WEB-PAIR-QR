const { exec } = require("child_process");
const { upload } = require('./mega');
const express = require('express');
let router = express.Router();
const pino = require("pino");
const { toBuffer } = require("qrcode");
const path = require('path');
const fs = require("fs-extra");
const { Boom } = require("@hapi/boom");

// Updated alive message details (still used later for chat messages)
const MESSAGE = process.env.MESSAGE || `
*🔥 HANS TECH LIVE SESSION! 🔥*

Your session is officially active with cutting-edge Hans Tech technology.
Explore more at:
https://whatsapp.com/channel/0029VaZDIdxDTkKB4JSWUk1O
Stay connected and experience the future of tech with Hans Tech!
`;

// Clean the auth directory if it exists
if (fs.existsSync('./auth_info_baileys')) {
  fs.emptyDirSync(__dirname + '/auth_info_baileys');
}

router.get('/', async (req, res) =>  {
  const { 
    default: SuhailWASocket, 
    useMultiFileAuthState, 
    Browsers, 
    delay, 
    DisconnectReason, 
    makeInMemoryStore 
  } = require("baileys");

  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

  async function SUHAIL() {
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys');
    try {
      let Smd = SuhailWASocket({ 
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), 
        browser: Browsers.macOS("Desktop"),
        auth: state 
      });
      
      Smd.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect, qr } = s;
        
        // When a QR code is generated, send a cool HTML page with the QR displayed in the center
        if (qr) {
          if (!res.headersSent) {
            try {
              const qrBuffer = await toBuffer(qr);
              const base64Image = qrBuffer.toString('base64');
              const htmlPage = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>Hans Tech QR Session</title>
                  <style>
                    body {
                      background: #1d1f21;
                      color: #c5c8c6;
                      font-family: Arial, sans-serif;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      margin: 0;
                    }
                    h1 {
                      color: #4caf50;
                      margin-bottom: 20px;
                    }
                    .qr-container {
                      padding: 20px;
                      border: 3px solid #4caf50;
                      border-radius: 12px;
                      background: #292b2c;
                      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                    }
                    .info {
                      margin-top: 30px;
                      font-size: 0.9em;
                      text-align: center;
                    }
                    .info a {
                      color: #4caf50;
                      text-decoration: none;
                    }
                    .info a:hover {
                      text-decoration: underline;
                    }
                  </style>
                </head>
                <body>
                  <h1>Scan this QR Code</h1>
                  <div class="qr-container">
                    <img src="data:image/png;base64,${base64Image}" alt="QR Code" />
                  </div>
                  <div class="info">
                    <p>Powered by <strong>Hans Tech</strong></p>
                    <p><a href="https://github.com/haroldmth" target="_blank">Visit our website</a> | <a href="https://hans-web.vercel.app" target="_blank">Get Support</a></p>
                  </div>
                </body>
                </html>
              `;
              return res.send(htmlPage);
            } catch (error) {
              console.error("Error generating QR HTML page:", error);
              return res.status(500).send("Error generating QR code");
            }
          }
        }
        
        // Once connected, send the session info and alive messages via chat
        if (connection == "open") {
          await delay(3000);
          let user = Smd.user.id;
          
          // Generate a random session ID using a custom function
          function randomMegaId(length = 6, numberLength = 4) {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
              result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
            return `${result}${number}`;
          }
          
          const auth_path = './auth_info_baileys/';
          const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);
          const string_session = mega_url.replace('https://mega.nz/file/', '');
          const Scan_Id = string_session;
          
          // Prepend the session identifier with "HANS-BYTE~"
          const sessionCode = `HANS-BYTE~ ${Scan_Id}`;
          
          console.log(`
====================  SESSION ID  ==========================
SESSION-ID ==> ${sessionCode}
-------------------   SESSION CLOSED   ---------------------
          `);
          
          // Send the session code then the custom alive message over chat
          let sidMessage = await Smd.sendMessage(user, { text: sessionCode });
          await Smd.sendMessage(user, { text: MESSAGE }, { quoted: sidMessage });
          await delay(1000);
          try {
            await fs.emptyDirSync(__dirname + '/auth_info_baileys');
          } catch (e) {
            console.error("Error clearing auth info directory:", e);
          }
        }
        
        Smd.ev.on('creds.update', saveCreds);
        
        if (connection === "close") {
          let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
          if (reason === DisconnectReason.connectionClosed) {
            console.log("Connection closed!");
          } else if (reason === DisconnectReason.connectionLost) {
            console.log("Connection lost from server!");
          } else if (reason === DisconnectReason.restartRequired) {
            console.log("Restart required, restarting...");
            SUHAIL().catch(err => console.log(err));
          } else if (reason === DisconnectReason.timedOut) {
            console.log("Connection timed out!");
          } else {
            console.log('Connection closed with bot. Please run again.');
            console.log(reason);
            await delay(5000);
            exec('pm2 restart qasim');
            process.exit(0);
          }
        }
      });
    } catch (err) {
      console.error("Error in SUHAIL():", err);
      exec('pm2 restart qasim');
      await fs.emptyDirSync(__dirname + '/auth_info_baileys');
    }
  }
  
  // Start the connection logic and ensure errors trigger a cleanup and restart
  SUHAIL().catch(async (err) => {
    console.error(err);
    await fs.emptyDirSync(__dirname + '/auth_info_baileys');
    exec('pm2 restart qasim');
  });
  
  // Return the promise (though in this design the response is already sent once QR is generated)
  return await SUHAIL();
});

module.exports = router;
