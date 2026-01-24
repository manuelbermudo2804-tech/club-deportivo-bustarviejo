import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { preview = false } = await req.json().catch(() => ({ preview: false }));

    // Eventos publicados que requieren confirmación y aún no han pasado
    const events = await base44.asServiceRole.entities.Event.filter({ publicado: true, requiere_confirmacion: true });
    const today = new Date();
    today.setHours(0,0,0,0);

    let sent = 0, candidates = 0;

    for (const e of events) {
      try {
        // Excluir eventos pasados
        if (e.fecha) {
          const d = new Date(e.fecha); d.setHours(0,0,0,0);
          if (d < today) continue;
        }
        const confirmaciones = Array.isArray(e.confirmaciones) ? e.confirmaciones : [];
        for (const c of confirmaciones) {
          const estado = (c.confirmacion || 'pendiente');
          if (estado === 'asistire' || estado === 'no_asistire') continue;
          const to = c.usuario_email || c.email || null;
          if (!to) continue;
          candidates += 1;

          // Evitar múltiple envío en el mismo día con AutomaticReminder
          const existing = await base44.asServiceRole.entities.AutomaticReminder.filter({
            tipo_recordatorio: 'Manual', // usamos como bitácora
            email_padre: to,
            fecha_envio: new Date().toISOString().slice(0,10)
          });
          if (existing.some(r => r.notas?.includes?.('RSVP'))) continue;

          if (!preview) {
            await base44.integrations.Core.SendEmail({
              to,
              subject: `Recordatorio diario: confirma tu asistencia`;
              body: `Hola ${c.usuario_nombre || ''},\n\nTienes una convocatoria pendiente de confirmar: ${e.titulo} (${e.fecha || ''} ${e.hora || ''}).\n\nPor favor, confirma desde la app: https://app.cdbustarviejo.com${'/#' + 'ParentCallups'}\n\nGracias.\nCD Bustarviejo.`
            });
            await base44.asServiceRole.entities.AutomaticReminder.create({
              jugador_id: c.jugador_id || null,
              jugador_nombre: c.jugador_nombre || '',
              email_padre: to,
              tipo_recordatorio: 'Manual',
              fecha_envio: new Date().toISOString().slice(0,10),
              enviado: true,
              notas: `RSVP:${e.id}`
            });
          }
          sent += 1;
        }
      } catch (err) {
        console.error('RSVP loop error', err);
      }
    }

    return Response.json({ success: true, candidates, sent });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});