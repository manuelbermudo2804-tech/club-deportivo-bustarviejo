import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { preview = false } = await req.json().catch(() => ({ preview: false }));

    const today = new Date(); today.setHours(0,0,0,0);

    // Convocatorias pasadas sin observación registrada
    const convocatorias = await base44.asServiceRole.entities.Convocatoria.filter({ publicada: true, cerrada: false });

    let candidates = 0, sent = 0;
    for (const c of convocatorias) {
      try {
        if (!c.fecha_partido) continue;
        const d = new Date(c.fecha_partido); d.setHours(0,0,0,0);
        if (d >= today) continue; // aún no ha pasado

        const obs = await base44.asServiceRole.entities.MatchObservation.filter({ convocatoria_id: c.id });
        if (obs.length > 0) continue; // ya hay resumen

        if (!c.entrenador_email) continue;
        candidates += 1;

        // Evitar duplicado diario
        const existing = await base44.asServiceRole.entities.AutomaticReminder.filter({
          email_padre: c.entrenador_email,
          fecha_envio: new Date().toISOString().slice(0,10)
        });
        if (existing.some(r => r.notas?.includes?.('MATCH_SUMMARY'))) continue;

        if (!preview) {
          await base44.integrations.Core.SendEmail({
            to: c.entrenador_email,
            subject: 'Recordatorio: registra el resumen del partido',
            body: `Hola ${c.entrenador_nombre || ''},\n\nRecuerda completar el resumen del partido: ${c.titulo} (${c.fecha_partido} ${c.hora_partido || ''}).\n\nAccede directamente desde la app: https://app.cdbustarviejo.com${'/#' + 'CoachStandingsAnalysis'}\n\nGracias.`
          });
          await base44.asServiceRole.entities.AutomaticReminder.create({
            email_padre: c.entrenador_email,
            tipo_recordatorio: 'Manual',
            fecha_envio: new Date().toISOString().slice(0,10),
            enviado: true,
            notas: `MATCH_SUMMARY:${c.id}`
          });
        }
        sent += 1;
      } catch (err) {
        console.error('Match summary loop error', err);
      }
    }

    return Response.json({ success: true, candidates, sent });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});