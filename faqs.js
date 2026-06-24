// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURA AQUÍ TUS PREGUNTAS FRECUENTES
// Cada FAQ tiene:
//   id        → número que el usuario escribe para seleccionarla (string)
//   emoji     → emoji visual
//   titulo    → texto en el menú
//   descripcion → subtítulo opcional en el menú
//   respuesta → texto que se envía sin llamar a Claude (deja null para escalar a Claude)
//   escalar   → si es true, tras mostrar la respuesta el bot queda en modo chat
//   humano    → si es true, escala a agente humano
//   otro      → si es true, pasa directo a Claude sin respuesta predefinida
// ─────────────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    id: '1',
    emoji: '💳',
    titulo: 'Facturación y pagos',
    descripcion: 'Facturas, cobros y planes',
    respuesta:
      `*💳 Facturación y pagos*\n\n` +
      `• Los cobros se realizan automáticamente el día 1 de cada mes.\n` +
      `• Puedes ver y descargar tus facturas en *Configuración → Facturación*.\n` +
      `• Aceptamos tarjeta de crédito/débito y transferencia bancaria.\n` +
      `• Para cancelar tu suscripción ve a *Configuración → Plan → Cancelar*.\n\n` +
      `¿Resolvió tu duda? Responde *sí* o *no*.`,
  },
  {
    id: '2',
    emoji: '🔐',
    titulo: 'Problemas de acceso',
    descripcion: 'No puedo iniciar sesión, olvidé contraseña',
    respuesta:
      `*🔐 Problemas de acceso*\n\n` +
      `• Para restablecer tu contraseña, ve al login y haz clic en _"¿Olvidaste tu contraseña?"_.\n` +
      `• Si tu cuenta está bloqueada por intentos fallidos, espera 15 min e intenta de nuevo.\n` +
      `• Asegúrate de usar el correo con el que te registraste originalmente.\n` +
      `• Si el correo no llega, revisa tu carpeta de *spam*.\n\n` +
      `¿Resolvió tu duda? Responde *sí* o *no*.`,
  },
  {
    id: '3',
    emoji: '⚙️',
    titulo: 'Configuración de cuenta',
    descripcion: 'Perfil, preferencias y ajustes',
    respuesta:
      `*⚙️ Configuración de cuenta*\n\n` +
      `• Accede a tu perfil desde el ícono de usuario en la esquina superior derecha.\n` +
      `• Desde *Configuración* puedes cambiar correo, contraseña, idioma y notificaciones.\n` +
      `• Los cambios se guardan automáticamente.\n` +
      `• Para cambiar el correo principal, deberás verificar el nuevo correo.\n\n` +
      `¿Resolvió tu duda? Responde *sí* o *no*.`,
  },
  {
    id: '4',
    emoji: '🐛',
    titulo: 'Reportar un error',
    descripcion: 'Algo no funciona correctamente',
    respuesta:
      `*🐛 Reportar un error*\n\n` +
      `Para ayudarte mejor, cuéntame:\n\n` +
      `1️⃣ ¿Qué estabas intentando hacer?\n` +
      `2️⃣ ¿Qué mensaje de error apareció?\n` +
      `3️⃣ ¿En qué dispositivo y navegador ocurrió?\n\n` +
      `Escribe los detalles y lo escalo al equipo técnico.`,
    escalar: true, // tras esta respuesta el bot queda en modo chat para recibir detalles
  },
  {
    id: '5',
    emoji: '✍️',
    titulo: 'Otra pregunta',
    descripcion: 'Mi duda no está en la lista',
    otro: true, // pasa directo a Claude
  },
  {
    id: '0',
    emoji: '👤',
    titulo: 'Hablar con un agente',
    descripcion: 'Conectar con soporte humano',
    humano: true,
  },
];

/**
 * Genera el texto del menú principal.
 * @returns {string}
 */
function generarMenuTexto() {
  const opciones = FAQS.map(f => `  *${f.id}.* ${f.emoji} ${f.titulo}`).join('\n');
  return (
    `¡Hola! 👋 Soy el asistente de soporte.\n\n` +
    `¿En qué puedo ayudarte hoy?\n\n` +
    opciones +
    `\n\nResponde con el *número* de tu opción, o escribe tu pregunta directamente. 💬`
  );
}

module.exports = { FAQS, generarMenuTexto };
