// ─────────────────────────────────────────────────────────────────────────────
// Manejo de estado por usuario (en memoria) y rate limiting
// El estado se resetea si el proceso reinicia — comportamiento esperado.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estados posibles por usuario:
 *   'nuevo'        → primer mensaje, mostrar menú automáticamente
 *   'menu'         → esperando selección de opción del menú
 *   'confirmacion' → esperando sí/no tras mostrar respuesta de FAQ
 *   'chat'         → conversación libre con Claude
 */

/** @type {Map<string, { estado: string, faqId: string|null }>} */
const estados = new Map();

/** @type {Map<string, { timestamps: number[] }>} */
const rateLimits = new Map();

// ── Configuración de rate limit ──────────────────────────────────────────────
const MAX_MENSAJES_POR_HORA = 20;
const MIN_INTERVALO_MS      = 1500; // mínimo 1.5 segundos entre mensajes

// ── Estado ───────────────────────────────────────────────────────────────────

/**
 * Obtiene el estado actual de un usuario.
 * Si no existe, devuelve 'nuevo' para mostrar el menú en el primer mensaje.
 * @param {string} usuario
 * @returns {{ estado: string, faqId: string|null }}
 */
function obtenerEstado(usuario) {
  return estados.get(usuario) ?? { estado: 'nuevo', faqId: null };
}

/**
 * Actualiza el estado de un usuario.
 * @param {string} usuario
 * @param {string} estado
 * @param {string|null} faqId
 */
function setEstado(usuario, estado, faqId = null) {
  estados.set(usuario, { estado, faqId });
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

/**
 * Verifica si un usuario puede enviar otro mensaje.
 * Registra el timestamp si está permitido.
 * @param {string} usuario
 * @returns {{ permitido: boolean, razon?: 'intervalo'|'limite_hora' }}
 */
function verificarRateLimit(usuario) {
  const ahora = Date.now();
  const limite = rateLimits.get(usuario) ?? { timestamps: [] };

  // Descartar timestamps fuera de la ventana de 1 hora
  limite.timestamps = limite.timestamps.filter(t => ahora - t < 3_600_000);

  // Verificar intervalo mínimo entre mensajes
  const ultimo = limite.timestamps.at(-1);
  if (ultimo && ahora - ultimo < MIN_INTERVALO_MS) {
    return { permitido: false, razon: 'intervalo' };
  }

  // Verificar límite por hora
  if (limite.timestamps.length >= MAX_MENSAJES_POR_HORA) {
    return { permitido: false, razon: 'limite_hora' };
  }

  limite.timestamps.push(ahora);
  rateLimits.set(usuario, limite);
  return { permitido: true };
}

module.exports = { obtenerEstado, setEstado, verificarRateLimit };
