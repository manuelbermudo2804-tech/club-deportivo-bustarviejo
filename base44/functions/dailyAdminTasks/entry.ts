import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Ejecuta TODAS las tareas diarias del admin en una sola llamada.
 * Reemplaza 6 automatizaciones programadas.
 * 
 * Tareas:
 * 1. Auto-cierre convocatorias pasadas
 * 2. Cierre renovaciones vencidas
 * 3. Expirar códigos de acceso
 * 4. Felicitaciones de cumpleaños
 * 5. Recordatorios renovación socios
 * 6. Aviso acceso juvenil (13 años)
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CD Bustarviejo <noreply@cdbustarviejo.com>';

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) return;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
  });
  if (!resp.ok) console.error(`[RESEND] Error ${resp.status}`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tasks } = await req.json().catch(() => ({ tasks: 'all' }));
    const runAll = tasks === 'all';
    const runTasks = Array.isArray(tasks) ? tasks : [];

    const results = {};
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. AUTO-CIERRE CONVOCATORIAS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (runAll || runTasks.includes('callups')) {
      try {
        const allCallups = await base44.asServiceRole.entities.Convocatoria.list('-fecha_partido', 200);
        let closed = 0, deleted = 0;
        for (const c of allCallups) {
          if (c.cerrada || c.estado_convocatoria === 'cancelada' || !c.fecha_partido) continue;
          if (c.fecha_partido >= todayStr) continue;
          if (!c.publicada) {
            await base44.asServiceRole.entities.Convocatoria.delete(c.id);
            deleted++;
          } else {
            await base44.asServiceRole.entities.Convocatoria.update(c.id, { cerrada: true });
            closed++;
          }
        }
        // Limpiar ProximoPartido viejos
        const proximos = await base44.asServiceRole.entities.ProximoPartido.list('-updated_date', 200);
        const cutoff = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0];
        let cleaned = 0;
        for (const p of proximos) {
          if (p.jugado && p.fecha_iso && p.fecha_iso < cutoff) {
            await base44.asServiceRole.entities.ProximoPartido.delete(p.id);
            cleaned++;
          }
        }
        results.callups = { closed, deleted, proximos_cleaned: cleaned };
      } catch (e) { results.callups = { error: e.message }; }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. CIERRE RENOVACIONES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (runAll || runTasks.includes('renewals')) {
      try {
        const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
        const cfg = configs[0];
        let processed = 0;
        if (cfg?.permitir_renovaciones && cfg?.fecha_limite_renovaciones) {
          const limite = new Date(cfg.fecha_limite_renovaciones);
          limite.setHours(0,0,0,0);
          const hoy = new Date(); hoy.setHours(0,0,0,0);
          if (hoy > limite) {
            const pend = await base44.asServiceRole.entities.Player.filter({
              estado_renovacion: 'pendiente', temporada_renovacion: cfg.temporada
            });
            for (const p of pend) {
              await base44.asServiceRole.entities.Player.update(p.id, {
                estado_renovacion: 'no_renueva', activo: false,
                fecha_renovacion: new Date().toISOString(),
                observaciones: `${p.observaciones||''}\n[Sistema] No renovado antes de fecha límite`.trim()
              });
              processed++;
            }
          }
        }
        results.renewals = { processed };
      } catch (e) { results.renewals = { error: e.message }; }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. EXPIRAR CÓDIGOS DE ACCESO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (runAll || runTasks.includes('codes')) {
      try {
        const codes = await base44.asServiceRole.entities.AccessCode.filter({ estado: 'pendiente' });
        let expired = 0;
        for (const code of codes) {
          if (code.fecha_expiracion && new Date(code.fecha_expiracion) < today) {
            await base44.asServiceRole.entities.AccessCode.update(code.id, { estado: 'expirado' });
            expired++;
          }
        }
        results.codes = { expired, checked: codes.length };
      } catch (e) { results.codes = { error: e.message }; }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. CUMPLEAÑOS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (runAll || runTasks.includes('birthdays')) {
      try {
        // Delegar al backend existente que ya tiene toda la lógica de plantillas
        const res = await base44.functions.invoke('sendBirthdayWishes', {});
        results.birthdays = res.data || { sent: 0 };
      } catch (e) { results.birthdays = { error: e.message }; }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. RECORDATORIOS RENOVACIÓN SOCIOS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (runAll || runTasks.includes('member_reminders')) {
      try {
        const res = await base44.functions.invoke('memberRenewalReminders', {});
        results.member_reminders = res.data || { sent: 0 };
      } catch (e) { results.member_reminders = { error: e.message }; }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6. AVISO ACCESO JUVENIL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (runAll || runTasks.includes('minor_access')) {
      try {
        const res = await base44.functions.invoke('notifyMinorAccess', {});
        results.minor_access = res.data || { notified: 0 };
      } catch (e) { results.minor_access = { error: e.message }; }
    }

    console.log('[dailyAdminTasks] Completado:', JSON.stringify(results));
    return Response.json({ success: true, timestamp: today.toISOString(), results });
  } catch (error) {
    console.error('[dailyAdminTasks] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});