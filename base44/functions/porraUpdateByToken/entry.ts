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

// Email premium "¡Porra completada al 100%!" — botones bulletproof (tabla) compatibles con Outlook/Gmail/Apple Mail
function emailCompletadaHtml({ nombre, alias, enlace, enlaceRanking }) {
  const aliasSafe = String(alias || 'tu equipo').replace(/[<>]/g, '');
  const nombreSafe = String(nombre || 'Participante').replace(/[<>]/g, '');
  // Botones tipo "bulletproof button" (tablas con bgcolor) — el estándar que SÍ se ve en todos los clientes
  const btn = (href, bg, label) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:8px auto">
  <tr>
    <td align="center" bgcolor="${bg}" style="border-radius:10px;background-color:${bg}">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;background-color:${bg};mso-padding-alt:0">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial,'Segoe UI',sans-serif;margin:0;padding:0;background:#f1f5f9">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9">
<tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#16a34a;padding:40px 24px;text-align:center">
<div style="font-size:56px;margin-bottom:8px;line-height:1">🎉</div>
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:900">¡Porra completada al 100%!</h1>
<p style="color:#dcfce7;margin:8px 0 0;font-size:14px">Mundial 2026 · CD Bustarviejo</p>
</td></tr>
<tr><td style="padding:28px 24px">
<p style="margin:0 0 16px;font-size:16px;color:#1e293b">¡Enhorabuena <strong>${nombreSafe}</strong>! 🏆</p>
<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">Has rellenado todas las predicciones de tu equipo <strong style="color:#16a34a">${aliasSafe}</strong>. Ya solo queda esperar a que ruede el balón.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#dcfce7;border:2px solid #22c55e;border-radius:12px;margin:20px 0">
<tr><td style="padding:16px;text-align:center">
<p style="margin:0;font-size:14px;color:#14532d;font-weight:700">✅ Todas las predicciones guardadas</p>
<p style="margin:6px 0 0;font-size:12px;color:#166534">Puedes seguir editándolas hasta el cierre del plazo</p>
</td></tr></table>
<p style="margin:24px 0 8px;font-size:14px;color:#1e293b;text-align:center;font-weight:bold">Tus accesos rápidos:</p>
${btn(enlace, '#16a34a', '🔧 Revisar mi porra')}
${btn(enlaceRanking, '#ea580c', '🏆 Ver ranking')}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin:20px 0 0">
<tr><td style="padding:12px">
<p style="margin:0;font-size:12px;color:#1e3a8a;line-height:1.5">
<strong>💡 Consejo:</strong> guarda este email o añade <strong>"Mi porra"</strong> a los favoritos / pantalla de inicio de tu móvil. Así podrás volver fácilmente durante todo el Mundial.
</p>
</td></tr></table>
<p style="margin:20px 0 0;font-size:13px;color:#64748b">¡Mucha suerte! 🍀</p>
<p style="margin:4px 0 0;font-size:13px;color:#64748b"><strong>CD Bustarviejo</strong></p>
</td></tr>
<tr><td style="background:#1e293b;padding:16px;text-align:center;color:#94a3b8;font-size:11px">
<p style="margin:0">© ${new Date().getFullYear()} CD Bustarviejo · Porra Mundial 2026</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
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
    // ⚠️ Saltar envío de email si la porra está en MODO TEST (ahorra créditos durante pruebas)
    const llegaA100 = safeUpdates.porcentaje_completado === 100 && (participante.porcentaje_completado || 0) < 100;
    if (llegaA100 && !participante.email_completado_enviado) {
      try {
        const configs = await base44.asServiceRole.entities.PorraConfig.list();
        const modoTest = !!configs[0]?.modo_test;
        if (modoTest) {
          console.log('[porraUpdateByToken] MODO TEST: email 100% omitido para ahorrar créditos.');
          // Marcamos igualmente para que no vuelva a intentar enviarlo
          await base44.asServiceRole.entities.PorraParticipante.update(participante.id, { email_completado_enviado: true });
        } else {
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
          await base44.asServiceRole.entities.PorraParticipante.update(participante.id, { email_completado_enviado: true });
        }
      } catch (emailErr) {
        console.error('[porraUpdateByToken] Error enviando email 100%:', emailErr?.message || emailErr);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});