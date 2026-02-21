import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Configuración de temporada activa y validaciones
    const configs = await base44.entities.SeasonConfig.list();
    const activeConfig = configs.find((c) => c.activa === true);

    if (!activeConfig) {
      return Response.json({ error: 'No hay SeasonConfig activa' }, { status: 400 });
    }
    if (!activeConfig.permitir_renovaciones) {
      return Response.json({ error: 'La opción permitir_renovaciones está desactivada' }, { status: 400 });
    }

    const temporada = activeConfig.temporada;

    // NOTA: No tocar historial de staff ni conversaciones de chat
    // (blindado para evitar pérdidas en reset de temporada)

    // Obtener todos los jugadores
    const allPlayers = await base44.entities.Player.list('-updated_date', 20000);

    // Preparar cambios: marcar como pendiente para la temporada activa
    let updatedCount = 0;
    const affectedFamilies = new Set();

    for (const p of allPlayers) {
      const needsPreparation =
        p.temporada_renovacion !== temporada || p.estado_renovacion !== 'pendiente';

      if (!needsPreparation) continue;

      await base44.entities.Player.update(p.id, {
        temporada_renovacion: temporada,
        estado_renovacion: 'pendiente',
        activo: false,
        fecha_renovacion: null,
      });
      updatedCount += 1;

      if (p.email_padre) affectedFamilies.add(p.email_padre);
      if (p.email_tutor_2) affectedFamilies.add(p.email_tutor_2);
    }

    // Detectar jugadores +18 que se gestionan solos (tienen email_jugador propio)
    const adultPlayerEmails = new Set();
    for (const p of allPlayers) {
      if (p.es_mayor_edad && p.email_jugador) {
        adultPlayerEmails.add(p.email_jugador);
      }
    }

    // Notificar a familias afectadas (AppNotification + Email)
    const familiesNotified = [];
    if (updatedCount > 0 && affectedFamilies.size > 0) {
      for (const email of affectedFamilies) {
        if (!email) continue;
        // App notification
        await base44.entities.AppNotification.create({
          usuario_email: email,
          titulo: 'Es hora de renovar la plaza',
          mensaje: `Ya puedes renovar a tus jugadores para la temporada ${temporada}. Ve a Mis Jugadores y pulsa Renovar/Activar.`,
          tipo: 'importante',
          icono: '🗓️',
          enlace: 'ParentPlayers',
          vista: false,
        });
        // Email (best-effort)
        try {
          await base44.functions.invoke('sendEmail', {
            to: email,
            subject: `Renovaciones abiertas – Temporada ${temporada}`,
            html: `Hola,<br/><br/>Ya puedes renovar a tus jugadores para la temporada <b>${temporada}</b>.<br/>Entra en la app → <b>Mis Jugadores</b> → <b>Renovar/Activar</b> en cada jugador.<br/><br/>Si necesitas ayuda, responde a este correo.<br/><br/>CD Bustarviejo`,
          });
        } catch (_e) {
          // Ignorar fallo de email para no abortar el proceso
        }
        familiesNotified.push(email);
      }
    }

    // Notificar a jugadores +18 por separado
    const adultPlayersNotified = [];
    if (updatedCount > 0 && adultPlayerEmails.size > 0) {
      for (const email of adultPlayerEmails) {
        if (!email) continue;
        await base44.entities.AppNotification.create({
          usuario_email: email,
          titulo: '⚽ Es hora de renovar tu plaza',
          mensaje: `Ya puedes renovar tu inscripción para la temporada ${temporada}. Entra en tu panel de jugador para confirmar.`,
          tipo: 'importante',
          icono: '🗓️',
          enlace: 'PlayerDashboard',
          vista: false,
        });
        try {
          await base44.functions.invoke('sendEmail', {
            to: email,
            subject: `⚽ Renovaciones abiertas – Temporada ${temporada}`,
            html: `Hola,<br/><br/>Ya puedes renovar tu inscripción como jugador para la temporada <b>${temporada}</b>.<br/>Entra en la app → Tu panel de jugador → <b>Renovar mi plaza</b>.<br/><br/>Si necesitas ayuda, responde a este correo.<br/><br/>CD Bustarviejo`,
          });
        } catch (_e) {}
        adultPlayersNotified.push(email);
      }
    }

    return Response.json({
      success: true,
      temporada,
      updatedPlayers: updatedCount,
      familiesNotified: Array.from(new Set(familiesNotified)).length,
      adultPlayersNotified: adultPlayersNotified.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});