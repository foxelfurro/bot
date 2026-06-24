const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH     = process.env.DB_PATH || path.join(__dirname, 'historial.db'); // en Render: /data/historial.db
const MAX_MENSAJES = 40;  // máximo de mensajes por usuario en memoria de Claude
const DIAS_RETENER = 7;   // mensajes más antiguos que esto se eliminan de la DB

const db = new Database(DB_PATH);

// Crear tabla e índices si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS mensajes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario   TEXT    NOT NULL,
    rol       TEXT    NOT NULL CHECK(rol IN ('user', 'assistant')),
    contenido TEXT    NOT NULL,
    creado_en INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_usuario ON mensajes(usuario);
  CREATE INDEX IF NOT EXISTS idx_creado  ON mensajes(creado_en);
`);

// ── Funciones principales ─────────────────────────────────────────────────────

/**
 * Obtiene el historial de un usuario como array compatible con la API de Anthropic.
 * @param {string} usuario - Número de teléfono (JID limpio)
 * @returns {{ role: string, content: string }[]}
 */
function obtenerHistorial(usuario) {
  const filas = db.prepare(`
    SELECT rol, contenido FROM (
      SELECT rol, contenido, id
      FROM mensajes
      WHERE usuario = ?
      ORDER BY id DESC
      LIMIT ?
    ) ORDER BY id ASC
  `).all(usuario, MAX_MENSAJES);

  return filas.map(f => ({ role: f.rol, content: f.contenido }));
}

/**
 * Guarda un mensaje en el historial.
 * @param {string}           usuario
 * @param {'user'|'assistant'} rol
 * @param {string}           contenido
 */
function guardarMensaje(usuario, rol, contenido) {
  db.prepare('INSERT INTO mensajes (usuario, rol, contenido) VALUES (?, ?, ?)').run(usuario, rol, contenido);
}

/**
 * Borra el historial completo de un usuario.
 * @param {string} usuario
 */
function limpiarHistorial(usuario) {
  db.prepare('DELETE FROM mensajes WHERE usuario = ?').run(usuario);
}

// ── Limpieza automática ───────────────────────────────────────────────────────

/**
 * Elimina mensajes más antiguos que DIAS_RETENER días.
 * Mantiene la DB acotada sin intervención manual.
 */
function limpiarHistorialAntiguo() {
  const corte = Math.floor(Date.now() / 1000) - DIAS_RETENER * 86_400;
  const { changes } = db.prepare('DELETE FROM mensajes WHERE creado_en < ?').run(corte);
  if (changes > 0) {
    console.log(`🧹 Limpieza automática: ${changes} mensajes antiguos eliminados.`);
  }
}

// Ejecutar al iniciar y cada 24 horas
limpiarHistorialAntiguo();
setInterval(limpiarHistorialAntiguo, 86_400_000);

module.exports = { obtenerHistorial, guardarMensaje, limpiarHistorial };
