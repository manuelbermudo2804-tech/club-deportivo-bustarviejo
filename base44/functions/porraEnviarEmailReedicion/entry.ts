import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

// Envía un email a cada participante pagado que aún NO haya re-editado el bracket,
// con sus enlaces personalizados (token de acceso) para que confirmen las
// eliminatorias actualizadas al formato FIFA 2026 antes del 28/06.
//
// Body opcional:
//   { participanteIds?: string[] }  -> si se pasa, solo envía a esos IDs (resto se ignora)
//
// Solo admins. Devuelve { enviados, fallidos, omitidos, detalle: [...] }

const APP_BASE = 'https://app.cdbustarviejo.com';
const FROM = 'CD Bustarviejo <porra@cdbustarviejo.com>';
const SUBJECT = '⚠️ Revisa tu porra del Mundial 2026 (bracket actualizado)';

const construirHtml = ({ nombre, porras }) => {
  const intro = porras.length === 1
    ? 'Hemos actualizado tu porra del Mundial 2026 con los cruces oficiales de FIFA (octavos → final).'
    : `Hemos actualizado tus <strong>${porras.length} porras</strong> del Mundial 2026 con los cruces oficiales de FIFA (octavos → final).`;

  const listaPorras = porras.map(p => `
    <tr>
      <td style="padding:10px 0;">
        <div style="font-weight:bold;color:#1e293b;margin-bottom:4px;">🔗 ${p.alias}</div>
        <a href="${p.url}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;">Revisar mi bracket</a>
      </td>
    </tr>
  `).join('');

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:20px 0;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <tr><td style="background:linear-gradient(135deg,#dc2626,#ea580c);padding:24px;color:#fff;text-align:center;">
            <div style="font-size:22px;font-weight:900;">🏆 Porra Mundial 2026</div>
            <div style="font-size:13px;opacity:.9;">CD Bustarviejo</div>
          </td></tr>
          <tr><td style="padding:24px;color:#1e293b;">
            <p style="margin:0 0 12px;font-size:16px;">¡Hola ${nombre.split(' ')[0]}! 👋</p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">${intro}</p>
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:6px;margin:16px 0;font-size:13px;color:#78350f;">
              🔒 La fase de grupos, mejores terceros y predicciones especiales <strong>ya están bloqueadas</strong> (el Mundial ha empezado).
              <br><br>
              ⚠️ Lo único que aún puedes ajustar es el <strong>bracket de eliminatorias</strong>, y tienes hasta el <strong>domingo 28 de junio a las 18:00h</strong> (luego se cierra para todo el mundo).
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">${listaPorras}</table>
            <div style="background:#dbeafe;border-left:4px solid #2563eb;padding:12px;border-radius:6px;margin:16px 0;font-size:13px;color:#1e3a8a;">
              📲 <strong>IMPORTANTE:</strong> Antes de entrar, cierra la app y vuelve a abrirla (o refresca el navegador con el icono 🔄) para asegurarte de ver la versión actualizada. Si no, puede que veas los cruces antiguos.
            </div>
            <p style="margin:16px 0 0;font-size:13px;color:#475569;line-height:1.5;">
              Luego entra, repasa las eliminatorias y pulsa <strong>"Confirmar y cerrar bracket"</strong>. Si no lo haces antes del 28/06 a las 18:00, tu porra se quedará con las predicciones que tengas en ese momento.
            </p>
            <p style="margin:20px 0 0;font-size:14px;color:#1e293b;">¡Mucha suerte! 🏆⚽</p>
            <p style="margin:4px 0 0;font-size:13px;color:#64748b;">— CD Bustarviejo</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admin' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const filtroIds = Array.isArray(body?.participanteIds) ? new Set(body.participanteIds) : null;

    const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_KEY) return Response.json({ error: 'Falta RESEND_API_KEY' }, { status: 500 });

    // Trae todos los pagados pendientes de re-editar
    const pagados = await base44.asServiceRole.entities.PorraParticipante.filter(
      { estado_pago: 'pagado' }, '-created_date', 2000
    );
    const candidatos = pagados.filter(p =>
      !p.bracket_reeditado &&
      p.email &&
      p.token_acceso &&
      (!filtroIds || filtroIds.has(p.id))
    );

    // Agrupar por email (cada destinatario recibe todas sus porras en un solo mail)
    const porEmail = new Map();
    candidatos.forEach(p => {
      const email = String(p.email).toLowerCase().trim();
      if (!email) return;
      if (!porEmail.has(email)) porEmail.set(email, { email, nombre: p.nombre || '', porras: [] });
      porEmail.get(email).porras.push({
        alias: p.alias_equipo || 'Mi porra',
        url: `${APP_BASE}/PorraMiPorra?token=${p.token_acceso}`,
      });
    });

    const grupos = Array.from(porEmail.values());
    let enviados = 0, fallidos = 0;
    const detalle = [];

    // Envío secuencial con pequeño delay para no saturar Resend
    for (const g of grupos) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM,
            to: g.email,
            subject: SUBJECT,
            html: construirHtml(g),
          }),
        });
        if (res.ok) {
          enviados++;
          detalle.push({ email: g.email, ok: true, porras: g.porras.length });
        } else {
          fallidos++;
          const txt = await res.text().catch(() => '');
          detalle.push({ email: g.email, ok: false, error: txt.slice(0, 200) });
        }
      } catch (e) {
        fallidos++;
        detalle.push({ email: g.email, ok: false, error: String(e?.message || e) });
      }
      await new Promise(r => setTimeout(r, 150));
    }

    return Response.json({
      enviados,
      fallidos,
      omitidos: pagados.length - candidatos.length,
      total_destinatarios: grupos.length,
      detalle,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});