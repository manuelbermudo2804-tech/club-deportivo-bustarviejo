import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
      return Response.json({ 
        usarBot: false,
        mensaje: "Bot no configurado o inactivo"
      });
    }

    // Verificar si está fuera de horario (si solo_fuera_horario está activo)
    if (config.solo_fuera_horario) {
      const coachSettings = await base44.asServiceRole.entities.CoachSettings.list();
      const setting = coachSettings.find(s => s.entrenador_email === config.entrenador_email);
      
      if (setting?.horario_laboral_activo) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        
        const [startH, startM] = (setting.horario_inicio || "09:00").split(":").map(Number);
        const [endH, endM] = (setting.horario_fin || "20:00").split(":").map(Number);
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;
        
        const diasLaborales = setting.dias_laborales || [];
        const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const diaActual = diasSemana[now.getDay()];
        
        const dentroHorario = currentTime >= startTime && currentTime <= endTime && diasLaborales.includes(diaActual);
        
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
      // Registrar escalación
      await base44.asServiceRole.entities.ChatbotLog.create({
        conversacion_id: `${padreEmail}_${categoria}`,
        categoria,
        padre_email: padreEmail,
        padre_nombre: padreNombre,
        mensaje_padre: mensajePadre,
        respuesta_bot: "Mensaje escalado al entrenador",
        tipo_consulta: "No clasificada",
        escalado: true,
        razon_escalacion: `Palabra urgente detectada: ${palabraUrgente}`,
        temporada: (() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth() + 1;
          return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
        })(),
        tiempo_respuesta_ms: Date.now() - startTime
      });

      return Response.json({
        escalar: true,
        razon: `Palabra urgente: ${palabraUrgente}`,
        respuesta: `He notificado a tu entrenador sobre tu mensaje urgente. Te responderá lo antes posible. 🚨`
      });
    }

    // Construir contexto para el LLM
    let contexto = `Eres el asistente del entrenador de ${categoria} del CD Bustarviejo.
Responde de forma amable, breve y útil.
Hablas con ${padreNombre}, padre/madre del jugador.

INFORMACIÓN DISPONIBLE:`;

    // Obtener horarios de la categoría
    const schedules = await base44.asServiceRole.entities.TrainingSchedule.filter({ categoria });
    if (schedules.length > 0) {
      contexto += `\n\nHORARIOS DE ENTRENAMIENTO:\n`;
      schedules.forEach(s => {
        contexto += `- ${s.dia_semana}: ${s.hora_inicio} - ${s.hora_fin} en ${s.ubicacion || 'campo del club'}\n`;
      });
    }

    // Obtener próximos eventos
    const events = await base44.asServiceRole.entities.Event.filter({ destinatario_categoria: categoria });
    const upcomingEvents = events.filter(e => 
      new Date(e.fecha) >= new Date() && e.publicado
    ).slice(0, 3);
    if (upcomingEvents.length > 0) {
      contexto += `\n\nPRÓXIMOS EVENTOS:\n`;
      upcomingEvents.forEach(e => {
        contexto += `- ${e.titulo} (${e.tipo}) - ${e.fecha} ${e.hora || ''}\n`;
      });
    }

    // Obtener convocatorias recientes
    if (jugadorId) {
      const callups = await base44.asServiceRole.entities.Convocatoria.filter({ categoria });
      const recentCallup = callups.find(c => c.publicada && new Date(c.fecha_partido) >= new Date());
      if (recentCallup) {
        const isConvocado = recentCallup.jugadores_convocados?.some(j => j.jugador_id === jugadorId);
        contexto += `\n\nCONVOCATORIA ACTUAL:\n`;
        contexto += isConvocado ? `SÍ está convocado para ${recentCallup.rival} el ${recentCallup.fecha_partido}\n` : `NO está convocado para el próximo partido\n`;
      }

      // Obtener pagos pendientes
      const payments = await base44.asServiceRole.entities.Payment.filter({ jugador_id: jugadorId });
      const pending = payments.filter(p => p.estado === "Pendiente");
      if (pending.length > 0) {
        contexto += `\n\nPAGOS PENDIENTES:\n`;
        pending.forEach(p => {
          contexto += `- ${p.mes}: ${p.cantidad}€ (${p.tipo_pago})\n`;
        });
      }
    }

    // FAQs personalizadas
    if (config.faqs_personalizadas?.length > 0) {
      contexto += `\n\nPREGUNTAS FRECUENTES CONFIGURADAS:\n`;
      config.faqs_personalizadas.forEach(faq => {
        contexto += `P: ${faq.pregunta}\nR: ${faq.respuesta}\n\n`;
      });
    }

    contexto += `\n\nNORMAS:
- Si te preguntan por pagos pendientes, dales la información exacta de arriba
- Si te preguntan por horarios, usa la información de arriba
- Si te preguntan algo que NO sabes, di: "No tengo esa información, pero he notificado al entrenador"
- Sé breve (máximo 3 líneas)
- Nunca des información médica o toma decisiones deportivas
- Si detectas una pregunta compleja, escala al entrenador

PREGUNTA DEL PADRE: ${mensajePadre}`;

    // Llamar a la IA
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: contexto,
      response_json_schema: {
        type: "object",
        properties: {
          respuesta: { type: "string" },
          tipo_consulta: { 
            type: "string",
            enum: ["Horarios", "Pagos", "Convocatorias", "Normas", "Equipación", "General", "Compleja"]
          },
          escalar: { type: "boolean" },
          razon_escalacion: { type: "string" }
        }
      }
    });

    // Si la IA decide escalar
    if (response.escalar) {
      await base44.asServiceRole.entities.ChatbotLog.create({
        conversacion_id: `${padreEmail}_${categoria}`,
        categoria,
        padre_email: padreEmail,
        padre_nombre: padreNombre,
        mensaje_padre: mensajePadre,
        respuesta_bot: response.respuesta || "Escalado al entrenador",
        tipo_consulta: response.tipo_consulta || "Compleja",
        escalado: true,
        razon_escalacion: response.razon_escalacion || "Consulta compleja",
        temporada: (() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth() + 1;
          return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
        })(),
        tiempo_respuesta_ms: Date.now() - startTime
      });

      return Response.json({
        escalar: true,
        razon: response.razon_escalacion,
        respuesta: response.respuesta + "\n\n✅ He notificado a tu entrenador."
      });
    }

    // Respuesta normal del bot
    await base44.asServiceRole.entities.ChatbotLog.create({
      conversacion_id: `${padreEmail}_${categoria}`,
      categoria,
      padre_email: padreEmail,
      padre_nombre: padreNombre,
      mensaje_padre: mensajePadre,
      respuesta_bot: response.respuesta,
      tipo_consulta: response.tipo_consulta || "General",
      escalado: false,
      temporada: (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
      })(),
      tiempo_respuesta_ms: Date.now() - startTime
    });

    return Response.json({
      usarBot: true,
      respuesta: response.respuesta,
      tipoConsulta: response.tipo_consulta,
      modoTransparente: config.modo_transparente
    });

  } catch (error) {
    console.error("Error en chatbot:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});