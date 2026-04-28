import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Envía recordatorios escalonados de renovación (30/15/7/3/1 días antes de la fecha límite).
 * Se ejecuta como SCHEDULED automation 1 vez al día.
 *
 * Idempotencia: cada Player guarda un array `recordatorios_renovacion_enviados` con los
 * umbrales ya enviados (ej. ["30","15"]). Si ya está, no se reenvía.
 *
 * Reemplaza a los antiguos motores frontend RenewalNotificationEngine + AutomaticRenewalReminders
 * que enviaban duplicados desde la app de cada admin.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Solo admin puede invocarlo manualmente; la scheduled automation también pasa este check
    // porque la ejecución scheduled corre como service role internamente.
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const configs = await base44.asServiceRole.entities.SeasonConfig.list();
    const activeConfig = configs.find(c => c.activa === true);

    if (!activeConfig?.permitir_renovaciones ||
        !activeConfig?.enviar_recordatorios_renovacion ||
        !activeConfig?.fecha_limite_renovaciones) {
      return Response.json({ message: 'Recordatorios desactivados o sin fecha límite', sent: 0 });
    }

    const fechaLimite = new Date(activeConfig.fecha_limite_renovaciones);
    fechaLimite.setHours(0, 0, 0, 0);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diasRestantes = Math.floor((fechaLimite - hoy) / (1000 * 60 * 60 * 24));

    const UMBRALES = [30, 15, 7, 3, 1];
    if (!UMBRALES.includes(diasRestantes)) {
      return Response.json({ message: `Hoy no toca recordatorio (${diasRestantes} días restantes)`, sent: 0 });
    }

    const umbralKey = String(diasRestantes);

    // Pendientes de la temporada activa
    const pendientes = await base44.asServiceRole.entities.Player.filter({
      estado_renovacion: 'pendiente',
      temporada_renovacion: activeConfig.temporada,
    });

    // Filtrar los que ya recibieron este umbral
    const aNotificar = pendientes.filter(p => {
      const enviados = Array.isArray(p.recordatorios_renovacion_enviados)
        ? p.recordatorios_renovacion_enviados : [];
      return !enviados.includes(umbralKey);
    });

    if (aNotificar.length === 0) {
      return Response.json({ message: 'Todos los pendientes ya recibieron este recordatorio', sent: 0 });
    }

    // Agrupar por destinatario
    const familias = new Map(); // email -> { email, jugadores:[], playerIds:[] }
    const adultos = new Map();

    for (const p of aNotificar) {
      if (p.es_mayor_edad && p.email_jugador) {
        const key = p.email_jugador.toLowerCase();
        if (!adultos.has(key)) adultos.set(key, { email: p.email_jugador, jugadores: [], playerIds: [] });
        adultos.get(key).jugadores.push(p);
        adultos.get(key).playerIds.push(p.id);
      } else if (p.email_padre) {
        const key = p.email_padre.toLowerCase();
        if (!familias.has(key)) familias.set(key, { email: p.email_padre, jugadores: [], playerIds: [] });
        familias.get(key).jugadores.push(p);
        familias.get(key).playerIds.push(p.id);
      }
    }

    const urgencia = diasRestantes <= 3 ? '🚨 URGENTE' : diasRestantes <= 7 ? '⚠️ IMPORTANTE' : '📅 RECORDATORIO';
    const color = diasRestantes <= 3 ? '#dc2626' : diasRestantes <= 7 ? '#ea580c' : '#2563eb';
    const fechaStr = fechaLimite.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    let totalEnviados = 0;
    const playerIdsActualizar = new Set();

    // Enviar a familias
    for (const fam of familias.values()) {
      const nombres = fam.jugadores.map(j => `<li><strong>${j.nombre}</strong> (${j.deporte})</li>`).join('');
      try {
        await base44.functions.invoke('sendEmail', {
          to: fam.email,
          subject: `${urgencia}: ${diasRestantes} día(s) para renovar - Temporada ${activeConfig.temporada}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:2px solid ${color};border-radius:12px;overflow:hidden;">
<div style="background:${color};color:#fff;padding:24px;text-align:center;">
<h1 style="margin:0;font-size:22px;">${urgencia}</h1>
<p style="margin:8px 0 0;font-weight:bold;">Quedan ${diasRestantes} día(s) para renovar</p>
</div>
<div style="padding:24px;">
<p>Hola,</p>
<p>Tienes jugadores <strong>pendientes de renovar</strong> para la temporada ${activeConfig.temporada}:</p>
<ul style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 12px 12px 30px;">${nombres}</ul>
<div style="background:#fee2e2;border:2px solid #dc2626;border-radius:8px;padding:12px;margin:16px 0;">
<p style="margin:0;color:#991b1b;font-weight:bold;">📅 Fecha límite: ${fechaStr}</p>
</div>
<p>Entra en la app → <strong>Mis Jugadores</strong> → <strong>Renovar</strong>.</p>
<p style="font-size:13px;color:#64748b;">Si tienes dudas, contacta con cdbustarviejo@gmail.com</p>
</div>
<div style="background:#1e293b;color:#94a3b8;padding:14px;text-align:center;font-size:12px;">CD Bustarviejo • Temporada ${activeConfig.temporada}</div>
</div>`,
        });
        await base44.asServiceRole.entities.AppNotification.create({
          usuario_email: fam.email,
          titulo: `${urgencia}: ${diasRestantes} día(s) para renovar`,
          mensaje: `Tienes ${fam.jugadores.length} jugador(es) pendientes: ${fam.jugadores.map(j => j.nombre).join(', ')}`,
          tipo: diasRestantes <= 3 ? 'urgente' : 'importante',
          icono: diasRestantes <= 3 ? '🚨' : '⏰',
          enlace: 'ParentPlayers',
          vista: false,
        });
        fam.playerIds.forEach(id => playerIdsActualizar.add(id));
        totalEnviados += 1;
      } catch (e) {
        console.error('[sendRenewalReminders] Error familia', fam.email, e?.message);
      }
    }

    // Enviar a +18
    for (const ad of adultos.values()) {
      try {
        await base44.functions.invoke('sendEmail', {
          to: ad.email,
          subject: `${urgencia}: ${diasRestantes} día(s) para renovar tu plaza - Temporada ${activeConfig.temporada}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:2px solid ${color};border-radius:12px;overflow:hidden;">
<div style="background:${color};color:#fff;padding:24px;text-align:center;">
<h1 style="margin:0;font-size:22px;">${urgencia}</h1>
<p style="margin:8px 0 0;font-weight:bold;">Quedan ${diasRestantes} día(s) para renovar</p>
</div>
<div style="padding:24px;">
<p>Hola,</p>
<p>Tu plaza como jugador está <strong>pendiente de renovar</strong> para la temporada ${activeConfig.temporada}.</p>
<div style="background:#fee2e2;border:2px solid #dc2626;border-radius:8px;padding:12px;margin:16px 0;">
<p style="margin:0;color:#991b1b;font-weight:bold;">📅 Fecha límite: ${fechaStr}</p>
</div>
<p>Entra en la app → tu Panel de Jugador → <strong>Renovar mi plaza</strong>.</p>
</div>
<div style="background:#1e293b;color:#94a3b8;padding:14px;text-align:center;font-size:12px;">CD Bustarviejo • Temporada ${activeConfig.temporada}</div>
</div>`,
        });
        await base44.asServiceRole.entities.AppNotification.create({
          usuario_email: ad.email,
          titulo: `${urgencia}: ${diasRestantes} día(s) para renovar`,
          mensaje: `Tu inscripción está pendiente de renovar para la temporada ${activeConfig.temporada}.`,
          tipo: diasRestantes <= 3 ? 'urgente' : 'importante',
          icono: diasRestantes <= 3 ? '🚨' : '⏰',
          enlace: 'PlayerDashboard',
          vista: false,
        });
        ad.playerIds.forEach(id => playerIdsActualizar.add(id));
        totalEnviados += 1;
      } catch (e) {
        console.error('[sendRenewalReminders] Error +18', ad.email, e?.message);
      }
    }

    // Marcar idempotencia: añadir umbral a recordatorios_renovacion_enviados
    for (const pid of playerIdsActualizar) {
      try {
        const player = pendientes.find(p => p.id === pid);
        const enviados = Array.isArray(player?.recordatorios_renovacion_enviados)
          ? [...player.recordatorios_renovacion_enviados] : [];
        if (!enviados.includes(umbralKey)) enviados.push(umbralKey);
        await base44.asServiceRole.entities.Player.update(pid, {
          recordatorios_renovacion_enviados: enviados,
        });
      } catch (e) {
        console.error('[sendRenewalReminders] Error marcando idempotencia', pid, e?.message);
      }
    }

    return Response.json({
      success: true,
      umbral: diasRestantes,
      familias: familias.size,
      adultos: adultos.size,
      destinatarios: totalEnviados,
      jugadores_marcados: playerIdsActualizar.size,
    });
  } catch (error) {
    console.error('[sendRenewalReminders] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});