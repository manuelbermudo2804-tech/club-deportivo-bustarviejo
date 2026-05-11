import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint público: actualiza las predicciones de un participante usando su token mágico.
// No requiere autenticación — el token es el mecanismo de acceso.
// Body: { token: string, updates: {...} }
// Solo se permiten actualizar campos relacionados con predicciones.

const ALLOWED_FIELDS = new Set([
  'predicciones_grupos',
  'clasificacion_grupos',
  'desempates_resueltos',
  'mejores_terceros',
  'predicciones_eliminatorias',
  'prediccion_tercer_puesto',
  'predicciones_especiales',
  'completado_grupos',
  'completado_terceros',
  'completado_bracket',
  'completado_especiales',
  'porcentaje_completado',
]);

// Email premium "¡Porra completada al 100%!"
function emailCompletadaHtml({ nombre, alias, enlace, enlaceRanking }) {
  const aliasSafe = String(alias || 'tu equipo').replace(/[<>]/g, '');
  const nombreSafe = String(nombre || 'Participante').replace(/[<>]/g, '');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:40px 24px;text-align:center">
<div style="font-size:64px;margin-bottom:8px">🎉</div>
<h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:900">¡Porra completada al 100%!</h1>
<p style="color:rgba(255,255,255,0.95);margin:8px 0 0;font-size:14px">Mundial 2026 · CD Bustarviejo</p>
</div>
<div style="padding:28px 24px">
<p style="margin:0 0 16px;font-size:16px;color:#1e293b">¡Enhorabuena <strong>${nombreSafe}</strong>! 🏆</p>
<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">Has rellenado todas las predicciones de tu equipo <strong style="color:#16a34a">${aliasSafe}</strong>. Ya solo queda esperar a que ruede el balón.</p>
<div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border:2px solid #22c55e;border-radius:12px;padding:18px;margin:20px 0;text-align:center">
<p style="margin:0;font-size:14px;color:#14532d;font-weight:700">✅ Todas las predicciones guardadas</p>
<p style="margin:6px 0 0;font-size:12px;color:#166534">Puedes seguir editándolas hasta el cierre del plazo</p>
</div>
<div style="text-align:center;margin:24px 0">
<a href="${enlace}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:900;font-size:15px;margin:4px">
🔧 Revisar mi porra
</a>
<a href="${enlaceRanking}" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#dc2626);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:900;font-size:15px;margin:4px">
🏆 Ver ranking
</a>
</div>
<p style="margin:20px 0 0;font-size:13px;color:#64748b">¡Mucha suerte! 🍀</p>
<p style="margin:8px 0 0;font-size:13px;color:#64748b"><strong>CD Bustarviejo</strong></p>
</div>
<div style="background:#1e293b;padding:18px;text-align:center;color:#94a3b8;font-size:11px">
<p style="margin:0">© ${new Date().getFullYear()} CD Bustarviejo · Porra Mundial 2026</p>
</div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { token, updates } = body;

    if (!token || typeof token !== 'string') {
      return Response.json({ error: 'Token no válido' }, { status: 400 });
    }
    if (!/^[A-Za-z0-9]{32}$/.test(token)) {
      return Response.json({ error: 'Token no válido' }, { status: 400 });
    }
    if (!updates || typeof updates !== 'object') {
      return Response.json({ error: 'Sin cambios' }, { status: 400 });
    }

    const parts = await base44.asServiceRole.entities.PorraParticipante.filter({ token_acceso: token });
    const participante = parts[0];
    if (!participante) {
      return Response.json({ error: 'Porra no encontrada' }, { status: 404 });
    }
    if (participante.bloqueada) {
      return Response.json({ error: 'Porra bloqueada' }, { status: 403 });
    }

    // Filtrar solo campos permitidos
    const safeUpdates = {};
    for (const [k, v] of Object.entries(updates)) {
      if (ALLOWED_FIELDS.has(k)) safeUpdates[k] = v;
    }

    if (Object.keys(safeUpdates).length === 0) {
      return Response.json({ error: 'Sin cambios válidos' }, { status: 400 });
    }

    await base44.asServiceRole.entities.PorraParticipante.update(participante.id, safeUpdates);

    // Si la porra acaba de llegar al 100% por primera vez → enviar email de celebración
    const llegaA100 = safeUpdates.porcentaje_completado === 100 && (participante.porcentaje_completado || 0) < 100;
    if (llegaA100 && !participante.email_completado_enviado) {
      try {
        const baseUrl = req.headers.get('origin') || 'https://app.cdbustarviejo.com';
        const enlace = `${baseUrl}/PorraMiPorra?token=${participante.token_acceso}`;
        const enlaceRanking = `${baseUrl}/PorraRanking?token=${participante.token_acceso}`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: participante.email,
          subject: `🎉 ¡Tu porra "${participante.alias_equipo}" está al 100%! — Mundial 2026`,
          body: emailCompletadaHtml({
            nombre: participante.nombre,
            alias: participante.alias_equipo,
            enlace,
            enlaceRanking,
          }),
        });
        // Marcar para no volver a enviar
        await base44.asServiceRole.entities.PorraParticipante.update(participante.id, { email_completado_enviado: true });
      } catch (emailErr) {
        console.error('[porraUpdateByToken] Error enviando email 100%:', emailErr?.message || emailErr);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});