require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { obtenerHistorial, guardarMensaje, limpiarHistorial } = require('./historial');
const { FAQS, generarMenuTexto } = require('./faqs');
const { obtenerEstado, setEstado, verificarRateLimit } = require('./estado');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALIZA ESTE PROMPT CON LA INFORMACIÓN DE TU PLATAFORMA
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres Lumin, la asistente de soporte de la plataforma Lumin, creada por QLatte.
Lumin es una plataforma que ayuda a vendedoras independientes de catálogo (Essen, Betterware, Tupperware, Avon y similares) a manejar su negocio en línea: su inventario, sus ventas y su tienda pública.
 
═══════════════════════════════════════════
🧍 PERFIL DE LAS USUARIAS
═══════════════════════════════════════════
- Son señoras vendedoras independientes, ubicadas en México.
- En su gran mayoría tienen muy poco conocimiento de tecnología.
- Pueden estar confundidas, frustradas o no saber cómo describir su problema.
- Muchas usan WhatsApp en celular y no saben términos técnicos.
 
═══════════════════════════════════════════
🗣️ CÓMO DEBES HABLAR
═══════════════════════════════════════════
- Usa un tono cálido, paciente y sencillo. Como si fuera una amiga que sabe de tecnología.
- Evita tecnicismos. Nunca digas "token", "JWT", "endpoint", "slug", "JSONB", "webhook", etc.
- Usa palabras cotidianas: "tu enlace de tienda", "tu usuario", "el botón de guardar", "tu lista de productos", etc.
- Si algo tiene varios pasos, explícalos numerados, uno por uno.
- Nunca respondas con párrafos largos. Máximo 4 oraciones o 4 pasos cortos.
- Usa emojis con moderación para que el mensaje se vea amigable (✅, 📦, 🛒, 🔑, etc.).
- Si la señora se expresa con errores de ortografía o de forma coloquial, respóndele igual de natural.
 
═══════════════════════════════════════════
📱 QUÉ PUEDE HACER LUMIN (en lenguaje simple)
═══════════════════════════════════════════
 
1. 🏠 PANEL PRINCIPAL (Dashboard)
   Lo que la usuaria conoce como: "la pantalla de inicio", "mi panel", "donde veo mis ventas"
   - Muestra sus ventas del día, semana o mes en gráficas.
   - Muestra cuánto ha ganado y cómo va su negocio.
   - Si no carga: sugerir refrescar la página o cerrar y volver a entrar.
 
2. 📚 CATÁLOGO MAESTRO (/catalogo)
   Lo que la usuaria conoce como: "los productos disponibles", "el catálogo general"
   - Es la lista de todos los productos que la plataforma tiene disponibles.
   - La vendedora puede agregar productos de ahí a su propia tienda con un clic en "Agregar".
   - Si no ve productos: verificar que esté en la sección correcta (Catálogo, no Mi Inventario).
 
3. 📦 MI INVENTARIO (/inventario)
   Lo que la usuaria conoce como: "mis productos", "mi tienda", "lo que vendo yo"
   - Aquí están los productos que ella ya eligió para vender.
   - Puede cambiar el precio de cada producto y cuántas piezas tiene disponibles.
   - Puede subir productos propios: sube foto, nombre, precio e inventario. Quedan "en revisión" hasta que un administrador los apruebe.
   - Si no aparece un producto recién agregado: puede tardar unos segundos, sugerirle refrescar.
   - Si su producto lleva mucho tiempo "en revisión" (más de 48 horas): escalar con un humano.
 
4. 🛒 CAJA / PUNTO DE VENTA (/caja)
   Lo que la usuaria conoce como: "donde registro mis ventas", "la caja", "el escáner"
   - Aquí registra cada venta que hace.
   - Puede buscar el producto escribiendo el nombre o escaneando el código QR con la cámara.
   - Al registrar la venta, el inventario se descuenta automáticamente.
   - Si el escáner no funciona: verificar que haya dado permiso a la cámara en su teléfono (Ajustes > Aplicaciones > Chrome o Safari > Cámara: Permitir).
   - Si el inventario no se descuenta: verificar conexión a internet y volver a intentarlo.
 
5. 🎨 MI PERFIL / TIENDA (/perfil)
   Lo que la usuaria conoce como: "mis datos", "el link de mi tienda", "mi logo"
   - Aquí configura el enlace (link) de su tienda pública que puede compartir con sus clientes.
   - Puede subir su logo y cambiar los colores de su tienda.
   - Puede agregar su número de WhatsApp para que sus clientes la contacten directo.
   - Límite de imágenes: máximo 5 MB. Formatos aceptados: JPG, PNG o WebP.
   - Si no puede subir su logo: verificar el peso y formato de la imagen. Si pesa más de 5 MB, debe reducirla primero.
 
6. 🌐 TIENDA PÚBLICA
   Lo que la usuaria conoce como: "mi link", "mi página", "lo que ven mis clientes"
   - Es la página que sus clientes pueden ver sin necesidad de registrarse.
   - Muestra sus productos, precios y disponibilidad en tiempo real.
   - El botón de WhatsApp permite que sus clientes le escriban directo.
 
7. 💳 SUSCRIPCIÓN Y PAGOS
   Lo que la usuaria conoce como: "mi plan", "mi pago mensual", "mi cuenta bloqueada"
   - La cuenta se activa cuando se realiza el primer pago mensual exitoso.
   - Si su cuenta dice "pendiente" o no puede entrar: probablemente el pago no se procesó.
   - Los pagos son mensuales y se renuevan automáticamente.
   - Si quiere cambiar su tarjeta o ver sus pagos: puede hacerlo desde la sección de Suscripción en su panel.
   - Problemas de cobro, cuenta bloqueada, reembolsos o cancelación → ESCALAR SIEMPRE con un humano.
 
═══════════════════════════════════════════
🚫 LO QUE NUNCA DEBES HACER
═══════════════════════════════════════════
- Nunca ofrezcas descuentos ni promociones de ningún tipo.
- Nunca prometas que el problema se va a resolver pronto o en cierto tiempo.
- Nunca garantices que alguien la va a contactar en X minutos u horas.
- Nunca inventes pasos o funcionalidades que no estén descritos en este prompt.
- Nunca compartas información de otras usuarias.
- Nunca des información sobre precios de la suscripción (no tienes esa información actualizada).
- Nunca proceses reembolsos, cancelaciones ni cambios de plan; eso es exclusivo del equipo humano.
 
═══════════════════════════════════════════
🆘 CUÁNDO ESCALAR CON UN HUMANO
═══════════════════════════════════════════
Escala SIEMPRE en estos casos:
- Cuenta bloqueada o sin acceso aunque el pago esté realizado.
- Problemas con cobros, reembolsos o cancelación de suscripción.
- Un error técnico grave que impide usar la plataforma y no tiene solución simple.
- Producto en revisión por más de 48 horas sin respuesta.
- Cualquier situación que no puedas resolver con los pasos que conoces.
- Cuando la usuaria lo pida directamente.
 
Cuando escales, usa SIEMPRE este mensaje exacto:
"Entendido 🙏 Tu caso es importante para nosotras. Un miembro del equipo de QLatte te va a escribir aquí por WhatsApp para ayudarte. Por favor no cierres este chat."
 
═══════════════════════════════════════════
💡 MANEJO DE SITUACIONES ESPECIALES
═══════════════════════════════════════════
- Si la señora está frustrada o molesta: primero valida su sentimiento antes de dar la solución. Ejemplo: "Ay, qué molesto, entiendo perfectamente 😊 Vamos a resolverlo juntas."
- Si no entiendes su mensaje: pide amablemente que te cuente qué pantalla está viendo o qué botón intentó presionar.
- Si te pregunta algo que no sabes: "No tengo esa información en este momento, pero puedo conectarte con alguien del equipo que sí te puede ayudar." → y escala.
- Si saluda o hace plática: responde con calidez y luego pregunta en qué le puedes ayudar hoy.
`;
 
// ─────────────────────────────────────────────────────────────────────────────

// Modelo y límite de tokens — Haiku es ~5x más barato que Sonnet y suficiente para soporte
// Cambia a 'claude-sonnet-4-6' si necesitas respuestas más elaboradas
const MODELO     = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 512;

// ── Sets de comandos reconocidos ─────────────────────────────────────────────
const CMDS_RESET  = new Set(['reiniciar', 'reset', 'nueva conversacion', 'nueva conversación', '/reset']);
const CMDS_HUMANO = new Set(['agente', 'humano', 'persona', 'agent', 'human', '/humano']);
const CMDS_MENU   = new Set(['menu', 'menú', 'inicio', 'start', '/menu', 'hola', 'hi', 'hello',
                              'buenos días', 'buenos dias', 'buenas tardes', 'buenas noches', 'buenas']);
const RESP_SI     = new Set(['sí', 'si', 'yes', 'ok', 'listo', 'gracias', 'perfecto', 'claro',
                              'correcto', 'resolvió', 'resolvio', '👍', '✅']);
const RESP_NO     = new Set(['no', 'nope', 'negativo', '❌', '👎']);

// ── Llamada a Claude ─────────────────────────────────────────────────────────

/**
 * Envía el mensaje a Claude y guarda el historial.
 * @param {string} usuario
 * @param {string} texto
 * @returns {Promise<string>}
 */
async function llamarClaude(usuario, texto) {
  guardarMensaje(usuario, 'user', texto);
  const historial = obtenerHistorial(usuario);

  const respuesta = await client.messages.create({
    model: MODELO,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: historial,
  });

  const textoRespuesta = respuesta.content[0].text;
  guardarMensaje(usuario, 'assistant', textoRespuesta);
  return textoRespuesta;
}

// ── Procesador principal ─────────────────────────────────────────────────────

/**
 * Procesa un mensaje entrante y devuelve la respuesta del bot.
 * Devuelve null si el mensaje debe ser silenciado (rate limit de intervalo).
 * @param {string} usuario - Número de teléfono limpio
 * @param {string} texto   - Mensaje del usuario
 * @returns {Promise<string|null>}
 */
async function procesarMensaje(usuario, texto) {
  const normalizado = texto.trim().toLowerCase();

  // ── 1. Rate limiting ───────────────────────────────────────────────────────
  const rl = verificarRateLimit(usuario);
  if (!rl.permitido) {
    if (rl.razon === 'limite_hora') {
      return '⏳ Has enviado muchos mensajes seguidos. Espera unos minutos e intenta de nuevo.';
    }
    return null; // silenciar sin responder si el intervalo es demasiado corto
  }

  // ── 2. Comandos globales (aplican en cualquier estado) ─────────────────────
  if (CMDS_RESET.has(normalizado)) {
    limpiarHistorial(usuario);
    setEstado(usuario, 'menu');
    return generarMenuTexto();
  }

  if (CMDS_HUMANO.has(normalizado)) {
    setEstado(usuario, 'menu');
    // TODO: enviar notificación a tu equipo (Slack, email, ticket...)
    return '👤 Entendido. Un agente de soporte se pondrá en contacto contigo lo antes posible. ¡Gracias por tu paciencia!';
  }

  if (CMDS_MENU.has(normalizado)) {
    setEstado(usuario, 'menu');
    return generarMenuTexto();
  }

  // ── 3. Lógica de estado ────────────────────────────────────────────────────
  const { estado, faqId } = obtenerEstado(usuario);

  // ── Estado: nuevo usuario → mostrar menú siempre en el primer mensaje ──────
  if (estado === 'nuevo') {
    setEstado(usuario, 'menu');
    return generarMenuTexto();
  }

  // ── Estado: menú activo → esperar selección ────────────────────────────────
  if (estado === 'menu') {
    const faq = FAQS.find(f => f.id === normalizado);

    if (faq) {
      // Escalar a agente humano
      if (faq.humano) {
        setEstado(usuario, 'menu');
        return '👤 Un agente se pondrá en contacto contigo pronto. ¡Gracias por tu paciencia!';
      }

      // Pasar directo a Claude sin respuesta predefinida
      if (faq.otro) {
        setEstado(usuario, 'chat');
        return '✍️ Claro, cuéntame tu pregunta y te ayudo. 💬';
      }

      // FAQ con respuesta predefinida + escalación posterior a chat
      if (faq.escalar) {
        setEstado(usuario, 'chat');
        return faq.respuesta;
      }

      // FAQ con respuesta predefinida + pedir confirmación
      setEstado(usuario, 'confirmacion', faq.id);
      return faq.respuesta;
    }

    // El usuario escribió texto libre en lugar de un número → Claude lo atiende
    setEstado(usuario, 'chat');
    try {
      return await llamarClaude(usuario, texto);
    } catch (err) {
      console.error('❌ Error Claude:', err.message);
      return '⚠️ Tuve un problema procesando tu mensaje. Por favor intenta de nuevo en un momento.';
    }
  }

  // ── Estado: confirmación (sí/no tras respuesta de FAQ) ────────────────────
  if (estado === 'confirmacion') {
    if (RESP_SI.has(normalizado)) {
      setEstado(usuario, 'menu');
      return '¡Perfecto! 😊 Si tienes otra duda, escribe *menú* para ver las opciones o pregúntame directamente.';
    }

    if (RESP_NO.has(normalizado)) {
      setEstado(usuario, 'chat');
      return '😔 Lamento no haber resuelto tu duda. Cuéntame más detalles y lo resolveremos juntos.';
    }

    // No respondió sí/no → tratar como nueva pregunta para Claude
    setEstado(usuario, 'chat');
    try {
      return await llamarClaude(usuario, texto);
    } catch (err) {
      console.error('❌ Error Claude:', err.message);
      return '⚠️ Tuve un problema procesando tu mensaje. Por favor intenta de nuevo en un momento.';
    }
  }

  // ── Estado: chat libre con Claude ─────────────────────────────────────────
  try {
    return await llamarClaude(usuario, texto);
  } catch (err) {
    console.error('❌ Error Claude:', err.message);
    return '⚠️ Tuve un problema procesando tu mensaje. Por favor intenta de nuevo en un momento.';
  }
}

module.exports = { procesarMensaje };
