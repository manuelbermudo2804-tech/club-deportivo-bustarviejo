import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * FAQ Engine sin IA - responde automáticamente a padres en el chat entrenador
 * basándose en palabras clave y datos reales del club.
 * 0 créditos de integración.
 */

const normalize = (text) =>
  (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").trim();

const matchesAny = (text, keywords) => {
  const n = normalize(text);
  return keywords.some(k => n.includes(normalize(k)));
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mensajePadre, categoria, padreEmail, padreNombre, jugadorId } = await req.json();
    const startTime = Date.now();

    // Obtener configuración del chatbot
    const configs = await base44.asServiceRole.entities.ChatbotConfig.list();
    const config = configs.find(c => c.categoria === categoria && c.chatbot_activo);

    if (!config) {
      return Response.json({ usarBot: false, mensaje: "Bot no configurado o inactivo" });
    }

    // Verificar si está fuera de horario
    if (config.solo_fuera_horario) {
      const coachSettings = await base44.asServiceRole.entities.CoachSettings.list();
      const setting = coachSettings.find(s => s.entrenador_email === config.entrenador_email);
      if (setting?.horario_laboral_activo) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = (setting.horario_inicio || "09:00").split(":").map(Number);
        const [endH, endM] = (setting.horario_fin || "20:00").split(":").map(Number);
        const diasLaborales = setting.dias_laborales || [];
        const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const diaActual = diasSemana[now.getDay()];
        const dentroHorario = currentTime >= (startH * 60 + startM) && currentTime <= (endH * 60 + endM) && diasLaborales.includes(diaActual);
        if (dentroHorario) {
          return Response.json({ usarBot: false, mensaje: "Entrenador disponible" });
        }
      }
    }

    // Detectar escalación urgente
    const palabrasEscalacion = config.palabras_escalacion || [];
    const mensajeLower = mensajePadre.toLowerCase();
    const palabraUrgente = palabrasEscalacion.find(p => mensajeLower.includes(p.toLowerCase()));

    if (palabraUrgente) {
      await base44.asServiceRole.entities.ChatbotLog.create({
        conversacion_id: `${padreEmail}_${categoria}`,
        categoria, padre_email: padreEmail, padre_nombre: padreNombre,
        mensaje_padre: mensajePadre, respuesta_bot: "Mensaje escalado al entrenador",
        tipo_consulta: "No clasificada", escalado: true,
        razon_escalacion: `Palabra urgente detectada: ${palabraUrgente}`,
        temporada: getTemporada(), tiempo_respuesta_ms: Date.now() - startTime
      });
      return Response.json({
        escalar: true,
        razon: `Palabra urgente: ${palabraUrgente}`,
        respuesta: `He notificado a tu entrenador sobre tu mensaje urgente. Te responderá lo antes posible. 🚨`
      });
    }

    // === MOTOR FAQ: buscar respuesta por palabras clave ===
    const q = normalize(mensajePadre);

    // Obtener datos en paralelo
    const [schedules, events, callups, payments] = await Promise.all([
      base44.asServiceRole.entities.TrainingSchedule.filter({ categoria }),
      base44.asServiceRole.entities.Event.filter({ destinatario_categoria: categoria }),
      jugadorId ? base44.asServiceRole.entities.Convocatoria.filter({ categoria }) : Promise.resolve([]),
      jugadorId ? base44.asServiceRole.entities.Payment.filter({ jugador_id: jugadorId }) : Promise.resolve([]),
    ]);

    // FAQs personalizadas del entrenador - comprobar primero
    if (config.faqs_personalizadas?.length > 0) {
      for (const faq of config.faqs_personalizadas) {
        const faqWords = normalize(faq.pregunta).split(/\s+/).filter(w => w.length > 3);
        const matches = faqWords.filter(w => q.includes(w)).length;
        if (matches >= 2 || (faqWords.length === 1 && q.includes(faqWords[0]))) {
          const resp = faq.respuesta;
          await logResponse(base44, padreEmail, categoria, padreNombre, mensajePadre, resp, "FAQ Personalizada", startTime);
          return Response.json({ usarBot: true, respuesta: resp, tipoConsulta: "FAQ Personalizada", modoTransparente: config.modo_transparente });
        }
      }
    }

    let respuesta = null;
    let tipoConsulta = "General";

    // HORARIOS
    if (matchesAny(q, ["horario", "entrena", "entrenamiento", "hora", "cuando entrena", "dias"])) {
      tipoConsulta = "Horarios";
      if (schedules.length > 0) {
        respuesta = "📅 Horarios de entrenamiento:\n" +
          schedules.map(s => `• ${s.dia_semana}: ${s.hora_inicio} - ${s.hora_fin}${s.ubicacion ? ` (${s.ubicacion})` : ''}`).join("\n");
      } else {
        respuesta = "📅 No tengo los horarios guardados para esta categoría. El entrenador te confirmará. 👍";
      }
    }

    // PAGOS
    if (!respuesta && matchesAny(q, ["pago", "cuota", "pagar", "pendiente", "debe", "transferencia", "bizum"])) {
      tipoConsulta = "Pagos";
      const pending = payments.filter(p => p.estado === "Pendiente");
      if (pending.length > 0) {
        respuesta = "💳 Pagos pendientes:\n" +
          pending.map(p => `• ${p.mes}: ${p.cantidad}€ (${p.tipo_pago})`).join("\n") +
          "\n\nPuedes gestionarlos desde 💳 Pagos en la app.";
      } else if (jugadorId) {
        respuesta = "✅ No tienes pagos pendientes. ¡Todo al día! 👍";
      } else {
        respuesta = "💳 Para consultar pagos, ve a la sección 💳 Pagos de la app.";
      }
    }

    // CONVOCATORIAS
    if (!respuesta && matchesAny(q, ["convocatoria", "partido", "convocado", "juega", "rival", "proximo partido"])) {
      tipoConsulta = "Convocatorias";
      const now = new Date();
      const upcoming = callups.filter(c => c.publicada && new Date(c.fecha_partido) >= now).sort((a, b) => a.fecha_partido.localeCompare(b.fecha_partido));
      const next = upcoming[0];
      if (next && jugadorId) {
        const isConvocado = next.jugadores_convocados?.some(j => j.jugador_id === jugadorId);
        respuesta = `⚽ Próximo partido: ${next.rival || 'rival'} el ${next.fecha_partido} a las ${next.hora_partido || 'por confirmar'}\n` +
          (isConvocado ? "✅ Tu hijo/a SÍ está convocado/a." : "ℹ️ Tu hijo/a no está en la convocatoria actual.") +
          "\n\nConfirma asistencia en 🏆 Convocatorias de la app.";
      } else if (next) {
        respuesta = `⚽ Próximo partido: ${next.rival || 'rival'} el ${next.fecha_partido} a las ${next.hora_partido || 'por confirmar'}`;
      } else {
        respuesta = "⚽ No hay convocatorias próximas publicadas. El entrenador avisará cuando haya una.";
      }
    }

    // EVENTOS
    if (!respuesta && matchesAny(q, ["evento", "actividad", "fiesta", "torneo", "celebracion"])) {
      tipoConsulta = "General";
      const now = new Date();
      const upcoming = events.filter(e => new Date(e.fecha) >= now && e.publicado).slice(0, 3);
      if (upcoming.length > 0) {
        respuesta = "🎉 Próximos eventos:\n" +
          upcoming.map(e => `• ${e.titulo} — ${e.fecha}${e.hora ? ` a las ${e.hora}` : ''}`).join("\n");
      } else {
        respuesta = "🎉 No hay eventos próximos programados. Te avisaremos cuando haya novedades.";
      }
    }

    // EQUIPACIÓN / ROPA
    if (!respuesta && matchesAny(q, ["ropa", "equipacion", "camiseta", "chandal", "tienda", "talla"])) {
      tipoConsulta = "Equipación";
      respuesta = "🛍️ Para pedidos de equipación, ve a 🛍️ Tienda en la app. Si tienes dudas sobre tallas, pregunta al entrenador directamente.";
    }

    // NORMAS
    if (!respuesta && matchesAny(q, ["norma", "regla", "comportamiento", "falta", "sancion"])) {
      tipoConsulta = "Normas";
      respuesta = "📋 Las normas del club están disponibles en la app. Si tienes alguna duda específica, el entrenador te responderá cuando esté disponible.";
    }

    // LESIÓN
    if (!respuesta && matchesAny(q, ["lesion", "lesionado", "dolor", "medico", "enfermo"])) {
      tipoConsulta = "Compleja";
      respuesta = "🤕 Siento escuchar eso. He avisado al entrenador para que lo tenga en cuenta. Si es urgente, contacta directamente con el entrenador.";
      // Escalar automáticamente
      await logResponse(base44, padreEmail, categoria, padreNombre, mensajePadre, respuesta, tipoConsulta, startTime, true, "Tema médico/lesión");
      return Response.json({ escalar: true, razon: "Tema médico/lesión", respuesta: respuesta + "\n\n✅ He notificado a tu entrenador." });
    }

    // FALLBACK
    if (!respuesta) {
      respuesta = "No tengo esa información ahora mismo, pero he avisado al entrenador. Te responderá en cuanto pueda. 👍";
      tipoConsulta = "Compleja";
      // Escalar al entrenador
      await logResponse(base44, padreEmail, categoria, padreNombre, mensajePadre, respuesta, tipoConsulta, startTime, true, "Sin respuesta FAQ");
      return Response.json({ escalar: true, razon: "Sin respuesta en FAQ", respuesta });
    }

    // Respuesta encontrada
    await logResponse(base44, padreEmail, categoria, padreNombre, mensajePadre, respuesta, tipoConsulta, startTime);
    return Response.json({
      usarBot: true,
      respuesta,
      tipoConsulta,
      modoTransparente: config.modo_transparente
    });

  } catch (error) {
    console.error("Error en chatbot:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getTemporada() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

async function logResponse(base44, padreEmail, categoria, padreNombre, mensajePadre, respuesta, tipoConsulta, startTime, escalado = false, razon = null) {
  try {
    await base44.asServiceRole.entities.ChatbotLog.create({
      conversacion_id: `${padreEmail}_${categoria}`,
      categoria,
      padre_email: padreEmail,
      padre_nombre: padreNombre,
      mensaje_padre: mensajePadre,
      respuesta_bot: respuesta,
      tipo_consulta: tipoConsulta,
      escalado,
      ...(razon ? { razon_escalacion: razon } : {}),
      temporada: getTemporada(),
      tiempo_respuesta_ms: Date.now() - startTime
    });
  } catch (e) {
    console.warn("Error logging chatbot response:", e);
  }
}