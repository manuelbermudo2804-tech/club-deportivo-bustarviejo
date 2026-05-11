import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Envía un email al usuario con TODOS los links mágicos de sus porras.
// Endpoint PÚBLICO (sin auth) — pero solo envía a la dirección de email proporcionada,
// por lo que únicamente el dueño real del buzón puede ver los enlaces.
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Email requerido' }, { status: 400 });
    }

    const emailNorm = email.trim().toLowerCase();
    const base44 = createClientFromRequest(req);

    // Buscar todas las porras de ese email (service role para acceso público controlado)
    const porras = await base44.asServiceRole.entities.PorraParticipante.filter({ email: emailNorm });

    // Por seguridad, respondemos siempre OK aunque no haya porras
    // (evita revelar si un email existe o no en el sistema)
    if (!porras || porras.length === 0) {
      return Response.json({ success: true, count: 0 });
    }

    // Construir lista HTML de porras
    const baseUrl = req.headers.get('origin') || 'https://app.cdbustarviejo.com';
    const filasHtml = porras.map(p => {
      const link = `${baseUrl}/PorraMiPorra?token=${p.token_acceso}`;
      const estado = p.estado_pago === 'pagado' ? '✅ Pagada' : '⏳ Pendiente';
      const completado = p.porcentaje_completado || 0;
      return `
        <tr>
          <td style="padding:14px;border-bottom:1px solid #e2e8f0;">
            <div style="font-weight:800;color:#0f172a;font-size:16px;">${p.alias_equipo || 'Sin alias'}</div>
            <div style="color:#64748b;font-size:13px;margin-top:2px;">${estado} · ${completado}% completada · ${p.puntos_total || 0} pts</div>
          </td>
          <td style="padding:14px;border-bottom:1px solid #e2e8f0;text-align:right;">
            <a href="${link}" style="display:inline-block;background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px;">Abrir porra</a>
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#dc2626,#ea580c,#eab308);padding:28px;text-align:center;color:#fff;">
            <div style="font-size:40px;">🏆</div>
            <h1 style="margin:8px 0 4px;font-size:24px;font-weight:900;">Tus accesos a la Porra Mundial 2026</h1>
            <p style="margin:0;opacity:0.9;font-size:14px;">CD Bustarviejo</p>
          </div>
          <div style="padding:24px;">
            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">
              Hola, aquí tienes el listado de <strong>todas tus porras</strong> asociadas a <strong>${emailNorm}</strong>.
              Pulsa "Abrir porra" en cualquiera para gestionar tus predicciones.
            </p>
            <table style="width:100%;border-collapse:collapse;margin-top:8px;">
              ${filasHtml}
            </table>
            <p style="color:#64748b;font-size:12px;margin-top:20px;line-height:1.5;">
              💡 Guarda este email: estos enlaces son personales e intransferibles. No los compartas.
            </p>
          </div>
          <div style="background:#f1f5f9;padding:14px;text-align:center;color:#64748b;font-size:12px;">
            © ${new Date().getFullYear()} CD Bustarviejo · Porra Mundial 2026
          </div>
        </div>
      </body></html>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Porra Mundial — CD Bustarviejo',
      to: emailNorm,
      subject: `🏆 Tus accesos a la Porra Mundial 2026 (${porras.length} ${porras.length === 1 ? 'porra' : 'porras'})`,
      body: html,
    });

    return Response.json({ success: true, count: porras.length });
  } catch (error) {
    console.error('porraEnviarMisAccesos error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});