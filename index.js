require('dotenv').config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino   = require('pino');
const { procesarMensaje } = require('./bot');

const AUTH_DIR = './auth_info'; // carpeta donde se guarda la sesión de WhatsApp

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  // ── Guardar credenciales cada vez que se actualicen ─────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Manejo de conexión / QR / reconexión ────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Escanea este QR con WhatsApp (Dispositivos vinculados > Vincular dispositivo):\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado a WhatsApp');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const debeReconectar = statusCode !== DisconnectReason.loggedOut;

      console.log(`🔌 Conexión cerrada. Código: ${statusCode}. Reconectar: ${debeReconectar}`);

      if (debeReconectar) {
        const espera = statusCode === DisconnectReason.connectionReplaced ? 0 : 5000;
        console.log(`⏳ Reconectando en ${espera / 1000}s...`);
        setTimeout(iniciarBot, espera);
      } else {
        console.log('🚪 Sesión cerrada (logout). Elimina auth_info/ y reinicia para escanear de nuevo.');
        process.exit(0);
      }
    }
  });

  // ── Procesamiento de mensajes entrantes ─────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Ignorar mensajes propios, de grupos y mensajes sin contenido
      if (msg.key.fromMe)                     continue;
      if (msg.key.remoteJid.endsWith('@g.us')) continue;
      if (!msg.message)                        continue;

      // Extraer texto del mensaje (distintos tipos de WhatsApp)
      const texto =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        null;

      if (!texto) continue; // ignorar stickers, audios, documentos sin caption, etc.

      const jid     = msg.key.remoteJid;
      const usuario = jid.replace('@s.whatsapp.net', '');

      console.log(`📨 [${usuario}]: ${texto}`);

      try {
        // Marcar como leído
        await sock.readMessages([msg.key]);

        // Indicar que el bot está escribiendo
        await sock.sendPresenceUpdate('composing', jid);

        // Generar respuesta
        const respuesta = await procesarMensaje(usuario, texto);

        // Detener indicador de escritura
        await sock.sendPresenceUpdate('paused', jid);

        // null = mensaje silenciado por rate limit de intervalo corto
        if (respuesta === null) continue;

        // Enviar respuesta
        await sock.sendMessage(jid, { text: respuesta });
        console.log(`✅ Respondido a ${usuario}`);
      } catch (err) {
        // Asegurar que el indicador de escritura se detiene aunque haya error
        await sock.sendPresenceUpdate('paused', jid).catch(() => {});
        console.error(`❌ Error procesando mensaje de ${usuario}:`, err);
      }
    }
  });
}

// Arrancar
iniciarBot().catch(err => {
  console.error('💥 Error fatal al iniciar el bot:', err);
  process.exit(1);
});
