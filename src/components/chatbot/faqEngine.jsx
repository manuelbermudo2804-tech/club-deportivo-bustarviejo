/**
 * Motor de FAQ inteligente sin IA.
 * Busca la mejor respuesta analizando palabras clave en la pregunta del usuario
 * y cruzándola con datos reales del club.
 */

// Normalizar texto para búsqueda
const normalize = (text) =>
  (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();

// Comprobar si alguna palabra clave aparece en el texto
const matchesAny = (text, keywords) => {
  const n = normalize(text);
  return keywords.some((k) => n.includes(normalize(k)));
};

// Formatear fecha legible
const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};

/**
 * Genera una respuesta basada en la pregunta y los datos del club.
 */
export function generateAnswer({
  question,
  user,
  myPlayers = [],
  trainingSchedules = [],
  events = [],
  callups = [],
  announcements = [],
  seasonConfig,
  categoryConfigs = [],
  allPlayers = [],
}) {
  const q = normalize(question);

  // ===== HORARIOS DE ENTRENAMIENTO =====
  if (matchesAny(q, ["horario", "entrena", "entrenamiento", "cuando entrena", "a que hora", "dias de entrenamiento", "donde entrena"])) {
    const relevant = myPlayers.length > 0
      ? trainingSchedules.filter((s) => myPlayers.some((p) => (p.deporte || p.categoria_principal) === s.categoria))
      : trainingSchedules;

    if (relevant.length === 0) {
      return "📅 No he encontrado horarios de entrenamiento para tus categorías. Consulta con el coordinador en el **Chat Coordinador** del menú lateral.";
    }

    let resp = "📅 **Horarios de entrenamiento:**\n\n";
    relevant.forEach((s) => {
      resp += `⚽ **${s.categoria}**: ${s.dia_semana} de ${s.hora_inicio} a ${s.hora_fin}${s.ubicacion ? ` en ${s.ubicacion}` : ""}\n`;
    });
    resp += "\nPuedes ver todos los horarios en **📅 Calendario y Horarios** del menú.";
    return resp;
  }

  // ===== PAGOS Y CUOTAS =====
  if (matchesAny(q, ["pago", "cuota", "pagar", "transferencia", "iban", "justificante", "precio", "coste", "cuanto cuesta", "bizum", "fraccionado", "descuento"])) {
    let resp = "💳 **Información de pagos:**\n\n";
    if (seasonConfig) {
      resp += `- **Pago único**: ${seasonConfig.cuota_unica}€\n`;
      resp += `- **Fraccionado** (3 pagos): ${seasonConfig.cuota_tres_meses}€ cada uno (junio, septiembre, diciembre)\n`;
      resp += `- **Descuento hermanos**: 25€ para hermanos menores\n`;
      if (seasonConfig.bizum_activo) resp += `- **Bizum**: Sí, al ${seasonConfig.bizum_telefono}\n`;
    }
    resp += `\n**¿Cómo pagar?**\n`;
    resp += `1. Ve a **💳 Pagos** en el menú\n`;
    resp += `2. Selecciona el pago pendiente\n`;
    resp += `3. Realiza la transferencia con el concepto indicado\n`;
    resp += `4. Sube el justificante en la app\n`;
    resp += `5. El admin lo revisará y confirmará ✅`;
    return resp;
  }

  // ===== CONVOCATORIAS Y PARTIDOS =====
  if (matchesAny(q, ["convocatoria", "partido", "convocado", "proximo partido", "cuando juega", "rival", "confirmar asistencia"])) {
    const today = new Date();
    const upcoming = callups
      .filter((c) => new Date(c.fecha_partido) >= today && c.publicada && !c.cerrada)
      .slice(0, 5);

    if (upcoming.length === 0) {
      return "🏆 No hay convocatorias próximas publicadas. Cuando el entrenador publique una, te llegará notificación.\n\nRevisa también en **🏆 Convocatorias** del menú.";
    }

    let resp = "🏆 **Próximas convocatorias:**\n\n";
    upcoming.forEach((c) => {
      resp += `⚽ **${c.titulo}** (${c.categoria})\n`;
      resp += `   📅 ${fmtDate(c.fecha_partido)} a las ${c.hora_partido}\n`;
      resp += `   🏟️ ${c.ubicacion || "Por confirmar"} (${c.local_visitante})\n`;
      if (c.rival) resp += `   🆚 ${c.rival}\n`;
      resp += "\n";
    });
    resp += "Para confirmar asistencia, ve a **🏆 Convocatorias** en el menú.";
    return resp;
  }

  // ===== EVENTOS =====
  if (matchesAny(q, ["evento", "actividad", "fiesta", "torneo", "celebracion", "que hay", "que viene", "proximo evento"])) {
    const today = new Date();
    const next30 = new Date(today.getTime() + 30 * 86400000);
    const upcoming = events
      .filter((e) => {
        const d = new Date(e.fecha);
        return d >= today && d <= next30 && e.publicado;
      })
      .slice(0, 5);

    if (upcoming.length === 0) {
      return "🎉 No hay eventos programados en los próximos 30 días. Consulta el **📅 Calendario y Horarios** para ver más fechas.";
    }

    let resp = "🎉 **Próximos eventos:**\n\n";
    upcoming.forEach((e) => {
      resp += `📌 **${e.titulo}** (${e.tipo})\n`;
      resp += `   📅 ${fmtDate(e.fecha)}${e.hora ? ` a las ${e.hora}` : ""}\n`;
      if (e.ubicacion) resp += `   📍 ${e.ubicacion}\n`;
      resp += "\n";
    });
    resp += "Consulta detalles y confirma asistencia en **🎉 Eventos Club** del menú.";
    return resp;
  }

  // ===== ANUNCIOS =====
  if (matchesAny(q, ["anuncio", "novedad", "noticia", "comunicado", "informacion", "aviso"])) {
    const today = new Date();
    const active = announcements
      .filter((a) => {
        if (!a.publicado) return false;
        if (a.fecha_expiracion && new Date(a.fecha_expiracion) < today) return false;
        return true;
      })
      .slice(0, 5);

    if (active.length === 0) {
      return "📢 No hay anuncios activos en este momento. Revisa en **📢 Anuncios** del menú.";
    }

    let resp = "📢 **Anuncios recientes:**\n\n";
    active.forEach((a) => {
      const icon = a.prioridad === "Urgente" ? "🔴" : a.prioridad === "Importante" ? "🟡" : "🔵";
      resp += `${icon} **${a.titulo}**\n${a.contenido.substring(0, 120)}...\n\n`;
    });
    resp += "Lee los anuncios completos en **📢 Anuncios** del menú.";
    return resp;
  }

  // ===== INSCRIPCIÓN Y RENOVACIÓN =====
  if (matchesAny(q, ["inscripcion", "inscribir", "alta", "registrar", "renovar", "renovacion", "nuevo jugador", "dar de alta", "apuntar"])) {
    return `📝 **Proceso de inscripción / renovación:**

**Nueva inscripción:**
1. Ve a **👥 Mis Jugadores** → Botón "Añadir Jugador"
2. Completa el formulario con datos del jugador y tutor
3. Sube la foto tipo carnet (obligatoria)
4. Sube documentos: DNI/Libro familia + DNI tutor
5. Acepta política de privacidad
6. Recibirás enlaces de firma federativa por email
7. Realiza el pago desde **💳 Pagos**

**Renovación:**
1. Ve a **👥 Mis Jugadores**
2. Pulsa "Renovar" en el jugador
3. Actualiza datos si es necesario
4. Confirma y realiza el pago

**Documentos obligatorios:** Foto carnet, DNI jugador (>14 años) o Libro familia, DNI tutor (<18 años)`;
  }

  // ===== FIRMAS FEDERACIÓN =====
  if (matchesAny(q, ["firma", "firmar", "federacion", "federativa"])) {
    return `🖊️ **Firmas de Federación:**

1. Abre la app → menú **🖊️ Firmas Federación**
2. Verás los enlaces de firma pendientes para cada jugador
3. Pulsa "Firmar" en cada enlace pendiente
4. Firma del jugador (si >14 años) + firma del tutor

⚠️ Las firmas son **obligatorias** para que el jugador pueda competir en partidos oficiales.

Si no ves los enlaces, contacta con el coordinador por el **Chat Coordinador**.`;
  }

  // ===== ROPA / EQUIPACIÓN =====
  if (matchesAny(q, ["ropa", "equipacion", "camiseta", "chandal", "chaqueta", "tienda", "comprar", "pedido ropa", "talla", "mochila", "chubasquero", "anorak"])) {
    const abierta = seasonConfig?.tienda_ropa_abierta;
    const url = seasonConfig?.tienda_ropa_url;
    if (abierta && url) {
      return `🛍️ **¡La tienda de equipación está ABIERTA!** ✅\n\nPuedes hacer tu pedido aquí: [Tienda de equipación](${url})\n\nTambién accesible desde **🛍️ Tienda** en el menú.`;
    }
    if (abierta) {
      return "🛍️ La tienda de equipación está **ABIERTA** ✅. Ve a **🛍️ Tienda** en el menú para hacer tu pedido.";
    }
    return "🛍️ La tienda de equipación está **CERRADA** en este momento. Te avisaremos cuando abra.\n\nRevisa **📢 Anuncios** para novedades.";
  }

  // ===== LOTERÍA =====
  if (matchesAny(q, ["loteria", "decimo", "navidad", "sorteo loteria"])) {
    if (!seasonConfig?.loteria_navidad_abierta) {
      return "🍀 La lotería de Navidad está **cerrada** en este momento. Te avisaremos cuando se abra el periodo de pedidos.";
    }
    return `🍀 **Lotería de Navidad** — ¡Abierta! ✅\n\n- Precio por décimo: ${seasonConfig.precio_decimo_loteria || 22}€\n- Haz tu pedido desde **🍀 Lotería Navidad** en el menú.`;
  }

  // ===== DOCUMENTOS =====
  if (matchesAny(q, ["documento", "subir documento", "certificado", "dni", "libro familia"])) {
    return `📄 **Documentos:**\n\nPara subir o ver documentos:\n1. Ve a **📄 Documentos** en el menú\n2. Selecciona el tipo de documento\n3. Sube el archivo desde tu dispositivo\n\n**Documentos necesarios:** Foto carnet, DNI jugador (>14 años), DNI tutor, Libro de familia (si <14 años sin DNI).`;
  }

  // ===== CHATS / COMUNICACIÓN =====
  if (matchesAny(q, ["chat", "hablar", "contactar", "entrenador", "coordinador", "mensaje", "comunicar"])) {
    return `💬 **Canales de comunicación:**\n\n- **🔔 Mensajes del Club**: Avisos automáticos del sistema\n- **🎓 Chat Coordinador**: Para consultas generales (1 a 1)\n- **⚽ Chat Equipo**: Chat grupal con el entrenador\n\nTodos accesibles desde el menú lateral. 📱`;
  }

  // ===== CALENDARIO =====
  if (matchesAny(q, ["calendario", "agenda", "fechas"])) {
    return "📅 Puedes ver todo el calendario del club (entrenamientos, partidos y eventos) en **📅 Calendario y Horarios** del menú.\n\nAhí puedes filtrar por categoría y ver vista mensual o semanal.";
  }

  // ===== PLAZAS =====
  if (matchesAny(q, ["plaza", "plazas", "hay sitio", "quedan plazas", "cupos"])) {
    const activas = categoryConfigs.filter((c) => c.activa);
    if (activas.length === 0) return "No tengo información de plazas disponibles. Consulta con el coordinador.";

    let resp = "🏷️ **Disponibilidad de plazas:**\n\n";
    activas.forEach((c) => {
      const total = allPlayers.filter((p) => (p.deporte || p.categoria_principal) === c.nombre && p.activo).length;
      const max = c.plazas_maximas;
      const estado = max && total >= max ? "❌ COMPLETO" : "✅ DISPONIBLE";
      resp += `- **${c.nombre}**: ${total} inscritos${max ? ` / ${max} plazas` : ""} — ${estado}\n`;
    });
    return resp;
  }

  // ===== REFERIDOS =====
  if (matchesAny(q, ["referido", "amigo", "invitar", "traer amigo", "recomendar"])) {
    if (!seasonConfig?.programa_referidos_activo) {
      return "🎁 El programa de referidos no está activo en este momento.";
    }
    return "🎁 **Programa Trae un Amigo:**\n\nInvita a nuevas familias al club y gana recompensas.\n\nVe a **🎁 Trae un Socio Amigo** en el menú para ver tu enlace personalizado y las recompensas disponibles.";
  }

  // ===== MERCADILLO =====
  if (matchesAny(q, ["mercadillo", "segunda mano", "vender", "comprar usado"])) {
    return "🛍️ **Mercadillo del Club:**\n\nCompra y vende artículos deportivos de segunda mano entre familias del club.\n\nVe a **🛍️ Mercadillo** en el menú para ver anuncios activos o publicar el tuyo.";
  }

  // ===== VOLUNTARIADO =====
  if (matchesAny(q, ["voluntario", "voluntariado", "ayudar", "colaborar"])) {
    return "🤝 **Voluntariado:**\n\nParticipa en actividades del club como voluntario.\n\nVe a **🤝 Voluntariado** en el menú para ver oportunidades abiertas y apuntarte.";
  }

  // ===== ENCUESTAS =====
  if (matchesAny(q, ["encuesta", "opinion", "valoracion", "feedback"])) {
    return "📋 **Encuestas:**\n\nParticipa en las encuestas del club.\n\nVe a **📋 Encuestas** en el menú para ver las encuestas activas y dar tu opinión.";
  }

  // ===== SOCIO / CARNET =====
  if (matchesAny(q, ["socio", "carnet", "membresia", "descuento comercio"])) {
    if (!seasonConfig?.programa_socios_activo) {
      return "🎫 El programa de socios no está activo en este momento.";
    }
    return `🎫 **Hazte Socio del Club:**\n\n- Cuota anual: ${seasonConfig.precio_socio || 25}€\n- Carnet digital con descuentos en comercios locales\n\nVe a **🎫 Hacerse Socio** en el menú para más información.`;
  }

  // ===== MIS JUGADORES =====
  if (matchesAny(q, ["mis hijos", "mis jugadores", "mi hijo", "mi hija", "perfil jugador"])) {
    if (myPlayers.length === 0) {
      return "👥 No tienes jugadores registrados. Ve a **👥 Mis Jugadores** → \"Añadir Jugador\" para inscribir a tu hijo/a.";
    }
    let resp = "👥 **Tus jugadores:**\n\n";
    myPlayers.forEach((p) => {
      resp += `⚽ **${p.nombre}** — ${p.deporte || p.categoria_principal || "Sin categoría"}`;
      if (p.lesionado) resp += " 🤕 Lesionado";
      if (p.sancionado) resp += " 🟥 Sancionado";
      resp += "\n";
    });
    resp += "\nGestiona sus datos en **👥 Mis Jugadores** del menú.";
    return resp;
  }

  // ===== GALERÍA =====
  if (matchesAny(q, ["foto", "galeria", "album", "imagen"])) {
    return "🖼️ Puedes ver las fotos del club en **🖼️ Galería** del menú. Ahí encontrarás álbumes organizados por evento y categoría.";
  }

  // ===== COMPETICIÓN =====
  if (matchesAny(q, ["clasificacion", "liga", "puntos", "posicion", "tabla", "goleadores", "resultados"])) {
    return "🏆 Consulta la clasificación, resultados y goleadores de tu categoría en **🏆 Competición** del menú.";
  }

  // ===== FALLBACK =====
  return `🤔 No he encontrado una respuesta exacta para tu pregunta.

**Aquí tienes opciones rápidas:**
- 📅 Horarios → **📅 Calendario y Horarios**
- 💳 Pagos → **💳 Pagos**
- 🏆 Partidos → **🏆 Convocatorias**
- 📄 Documentos → **📄 Documentos**
- 🖊️ Firmas → **🖊️ Firmas Federación**
- 🛍️ Tienda → **🛍️ Tienda**

💬 Para consultas más complejas, usa el **Chat Coordinador** o el **Chat Equipo** del menú.`;
}