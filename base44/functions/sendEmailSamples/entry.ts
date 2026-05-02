import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { to } = await req.json();
    if (!to) return Response.json({ error: 'Missing "to" email' }, { status: 400 });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const send = async (toAddr, subject, html) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'CD Bustarviejo <noreply@cdbustarviejo.com>', to: [toAddr], subject, html })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Resend error ${res.status}: ${err.message || JSON.stringify(err)}`);
      }
      const data = await res.json();
      await sleep(600); // rate limit: max 2/sec
      return data;
    };

    const sent = [];

    // ─── 1. Convocatoria nueva (la plantilla principal desde callupEmailTemplate) ───
    const callupHtml = buildCallupEmailHtml({
      titulo: 'Partido Jornada 15',
      rival: 'CD Colmenar',
      local_visitante: 'Local',
      fecha_partido: '2026-03-08',
      hora_partido: '11:00',
      hora_concentracion: '10:30',
      ubicacion: 'Campo Municipal de Bustarviejo',
      enlace_ubicacion: 'https://maps.google.com/?q=Bustarviejo',
      descripcion: 'Traer equipación naranja y espinilleras. Llegar con 30 minutos de antelación.',
      entrenador_nombre: 'Carlos García',
      entrenador_telefono: '612345678',
    }, 'Pablo López Martín');
    await send(to, '📧 EJEMPLO 1/10 — ⚽ Convocatoria nueva', callupHtml);
    sent.push('Convocatoria nueva');

    // ─── 2. Pago confirmado ───
    const paymentHtml = paymentConfirmedHtml('Pablo López Martín', 'Septiembre', '2025/2026', 180, '15/09/2025', null);
    await send(to, '📧 EJEMPLO 2/10 — ✅ Pago confirmado', paymentHtml);
    sent.push('Pago confirmado');

    // ─── 3. Convocatoria pendiente (24h antes) ───
    const pendingCallupHtml = callupPendingReminderHtml('Pablo López Martín', {
      titulo: 'Partido vs CD Colmenar',
      fecha_partido: '2026-03-08',
      hora_partido: '11:00',
      ubicacion: 'Campo Municipal de Bustarviejo',
    });
    await send(to, '📧 EJEMPLO 3/10 — ⏰ Convocatoria pendiente 24h', pendingCallupHtml);
    sent.push('Convocatoria pendiente 24h');

    // ─── 4. Pagos morosos (+30 días) ───
    const overdueHtml = overduePaymentReminderHtml([
      { player: 'Pablo López Martín', mes: 'Septiembre', daysOverdue: 45, cantidad: 180 },
      { player: 'María López Martín', mes: 'Septiembre', daysOverdue: 45, cantidad: 155 },
    ]);
    await send(to, '📧 EJEMPLO 4/10 — 🔴 Pagos morosos', overdueHtml);
    sent.push('Pagos morosos');

    // ─── 5. Recordatorio RSVP evento ───
    const rsvpHtml = rsvpReminderHtml('Carlos', 'Fiesta de Navidad del Club', '20 de diciembre de 2025', '18:00');
    await send(to, '📧 EJEMPLO 5/10 — 🎉 Recordatorio RSVP', rsvpHtml);
    sent.push('Recordatorio RSVP');

    // ─── 6. Recordatorio resumen de partido ───
    const matchHtml = matchSummaryReminderHtml('Carlos García', 'Alevín vs CD Colmenar', '8 de marzo de 2026', '11:00');
    await send(to, '📧 EJEMPLO 6/10 — 📊 Resumen de partido', matchHtml);
    sent.push('Resumen de partido');

    // ─── 7. Solicitud eliminación de cuenta ───
    const deleteHtml = accountDeletionHtml('Juan Pérez', 'juanperez@gmail.com', 'Mi hijo ya no juega en el club', '19/02/2026');
    await send(to, '📧 EJEMPLO 7/10 — 🗑️ Solicitud eliminación', deleteHtml);
    sent.push('Solicitud eliminación');

    // ─── 8. Mercadillo reserva ───
    const marketHtml = marketReservationReminderHtml('Botas Nike Mercurial talla 38', 'Ana García');
    await send(to, '📧 EJEMPLO 8/10 — 🛍️ Mercadillo reserva', marketHtml);
    sent.push('Mercadillo reserva');

    // ─── 9. Recordatorio pago escalonado ───
    const schedHtml = scheduledPaymentReminderHtml('15_dias_antes', 'Septiembre', '30 de septiembre', [
      { jugador_nombre: 'Pablo López Martín', cantidad: 180 },
      { jugador_nombre: 'María López Martín', cantidad: 155 },
    ], 335);
    await send(to, '📧 EJEMPLO 9/10 — 📅 Recordatorio pago escalonado', schedHtml);
    sent.push('Recordatorio pago escalonado');

    // ─── 10. Documento pendiente de firma ───
    const docHtml = documentPendingHtml('Autorización Salida Torneo Madrid', 'Autorización', '15 de marzo de 2026', ['Pablo López Martín', 'María López Martín']);
    await send(to, '📧 EJEMPLO 10/10 — 📄 Documento pendiente firma', docHtml);
    sent.push('Documento pendiente firma');

    return Response.json({ success: true, sent, count: sent.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ──────────────────────────────────────────────
// Inline copies of email template functions
// (backend functions cannot import from frontend)
// ──────────────────────────────────────────────

const FOOTER = `
<tr><td style="background:#1e293b;padding:24px 16px;text-align:center;">
  <div style="color:#cbd5e1;font-size:13px;font-weight:600;margin-bottom:16px;">Síguenos en nuestras redes</div>
  <div style="font-size:0;line-height:0;">
    <a href="https://www.cdbustarviejo.com" style="display:inline-block;margin:4px;text-decoration:none;vertical-align:middle;"><img src="https://cdn-icons-png.flaticon.com/512/3097/3097144.png" alt="Web" width="44" height="44" style="display:block;border:0;border-radius:50%;background:#ea580c;" /></a>
    <a href="https://www.instagram.com/cdbustarviejo" style="display:inline-block;margin:4px;text-decoration:none;"><img src="https://cdn.jsdelivr.net/gh/CLorant/readme-social-icons/medium/filled/instagram.svg" alt="Instagram" width="44" height="44" style="display:block;border:0;border-radius:50%;" /></a>
    <a href="https://www.facebook.com/cdbustarviejo" style="display:inline-block;margin:4px;text-decoration:none;"><img src="https://cdn.jsdelivr.net/gh/CLorant/readme-social-icons/medium/filled/facebook.svg" alt="Facebook" width="44" height="44" style="display:block;border:0;border-radius:50%;" /></a>
    <a href="https://t.me/cdbustarviejo" style="display:inline-block;margin:4px;text-decoration:none;"><img src="https://cdn.jsdelivr.net/gh/CLorant/readme-social-icons/medium/filled/telegram.svg" alt="Telegram" width="44" height="44" style="display:block;border:0;border-radius:50%;" /></a>
  </div>
  <div style="color:#94a3b8;font-size:12px;line-height:1.6;margin-top:16px;">
    <strong style="color:#f8fafc;">CD Bustarviejo</strong><br>
    <a href="mailto:cdbustarviejo@gmail.com" style="color:#fb923c;text-decoration:none;">cdbustarviejo@gmail.com</a>
  </div>
</td></tr>`;

function wrap(headerBg, headerIcon, headerTitle, headerSub, bodyHtml) {
  // Extract solid color for Outlook compatibility (no gradient support)
  const solidBg = headerBg.includes('gradient') ? (headerBg.match(/#[0-9a-fA-F]{6}/)?.[0] || '#16a34a') : headerBg;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background-color:${solidBg};padding:28px 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">${headerIcon}</div>
  <div style="color:#ffffff;font-size:20px;font-weight:800;line-height:1.3;">${headerTitle}</div>
  ${headerSub ? `<div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">${headerSub}</div>` : ''}
</td></tr>
<tr><td style="padding:24px;">
${bodyHtml}
</td></tr>
${FOOTER}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function infoBox(color, content) {
  const bgMap = { orange: '#fff7ed', green: '#f0fdf4', blue: '#eff6ff', red: '#fef2f2' };
  const borderMap = { orange: '#f97316', green: '#22c55e', blue: '#3b82f6', red: '#ef4444' };
  return `<div style="background:${bgMap[color]||'#f8fafc'};border-radius:10px;padding:14px 16px;margin-bottom:16px;border-left:4px solid ${borderMap[color]||'#94a3b8'};">${content}</div>`;
}

function ctaButton(url, text, bg = '#16a34a') {
  const solidColor = bg.includes('gradient') ? (bg.match(/#[0-9a-fA-F]{6}/)?.[0] || '#16a34a') : bg;
  return `<div style="text-align:center;margin:20px 0 8px;">
  <a href="${url}" style="display:inline-block;background-color:${solidColor};color:#ffffff !important;font-size:16px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:12px;mso-padding-alt:16px 32px;">${text}</a>
  <div style="color:#94a3b8;font-size:11px;margin-top:8px;">Pulsa para abrir la app</div>
</div>`;
}

function dataRow(label, value) {
  return `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;font-size:12px;font-weight:600;">${label}</span><div style="color:#0f172a;font-size:15px;font-weight:600;margin-top:2px;">${value}</div></div>`;
}

// Convocatoria (plantilla principal usada en CoachCallups)
function buildCallupEmailHtml(callup, jugadorNombre) {
  let fechaFormateada;
  try {
    const d = new Date(callup.fecha_partido);
    fechaFormateada = d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { fechaFormateada = callup.fecha_partido; }

  const rivalText = callup.rival ? `vs ${callup.rival}` : "";
  const localVisitante = callup.local_visitante === "Local" ? "🏠 Local" : "✈️ Visitante";
  const mapsLink = callup.enlace_ubicacion || "";
  const concentracion = callup.hora_concentracion || "";
  const descripcion = callup.descripcion || "";
  const telefono = callup.entrenador_telefono || "";
  const appUrl = "https://app.cdbustarviejo.com/parentcallups";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background-color:#ea580c;padding:28px 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">⚽</div>
  <div style="color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">¡CONVOCATORIA!</div>
  <div style="color:#fed7aa;font-size:14px;margin-top:4px;">CD Bustarviejo</div>
</td></tr>
<tr><td style="padding:20px 24px 0;text-align:center;">
  <div style="background:#fff7ed;border:2px solid #fdba74;border-radius:12px;padding:14px 16px;">
    <div style="color:#9a3412;font-size:13px;font-weight:600;">JUGADOR CONVOCADO</div>
    <div style="color:#c2410c;font-size:20px;font-weight:800;margin-top:4px;">${jugadorNombre}</div>
  </div>
</td></tr>
<tr><td style="padding:20px 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
    ${rivalText ? `<tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="color:#64748b;font-size:12px;font-weight:600;">RIVAL</div>
      <div style="color:#0f172a;font-size:17px;font-weight:700;margin-top:2px;">${callup.rival} <span style="color:#94a3b8;font-size:13px;">${localVisitante}</span></div>
    </td></tr>` : ""}
    <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="color:#64748b;font-size:12px;font-weight:600;">📅 FECHA</div>
      <div style="color:#0f172a;font-size:16px;font-weight:700;margin-top:2px;text-transform:capitalize;">${fechaFormateada}</div>
    </td></tr>
    <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="color:#64748b;font-size:12px;font-weight:600;">⏰ HORA DEL PARTIDO</div>
      <div style="color:#0f172a;font-size:16px;font-weight:700;margin-top:2px;">${callup.hora_partido}h</div>
    </td></tr>
    ${concentracion ? `<tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="color:#64748b;font-size:12px;font-weight:600;">🕐 CONCENTRACIÓN</div>
      <div style="color:#c2410c;font-size:16px;font-weight:700;margin-top:2px;">${concentracion}h</div>
    </td></tr>` : ""}
    <tr><td style="padding:14px 16px;">
      <div style="color:#64748b;font-size:12px;font-weight:600;">📍 UBICACIÓN</div>
      <div style="color:#0f172a;font-size:15px;font-weight:600;margin-top:2px;">${callup.ubicacion}</div>
      ${mapsLink ? `<a href="${mapsLink}" style="display:inline-block;margin-top:8px;color:#2563eb;font-size:13px;font-weight:600;text-decoration:none;">🗺️ Ver en Google Maps →</a>` : ""}
    </td></tr>
  </table>
</td></tr>
${descripcion ? `<tr><td style="padding:0 24px 16px;">
  <div style="background:#eff6ff;border-radius:10px;padding:12px 16px;border-left:4px solid #3b82f6;">
    <div style="color:#1e40af;font-size:12px;font-weight:700;margin-bottom:4px;">📋 INSTRUCCIONES</div>
    <div style="color:#1e3a5f;font-size:14px;line-height:1.5;">${descripcion.replace(/\n/g, "<br>")}</div>
  </div>
</td></tr>` : ""}
<tr><td style="padding:8px 24px 24px;text-align:center;">
  <a href="${appUrl}" style="display:block;background-color:#16a34a;color:#ffffff !important;font-size:17px;font-weight:800;text-decoration:none;padding:18px 24px;border-radius:14px;text-align:center;">
    ✅ CONFIRMAR ASISTENCIA
  </a>
  <div style="color:#64748b;font-size:12px;margin-top:10px;">Pulsa para abrir la app y confirmar</div>
</td></tr>
<tr><td style="padding:0 24px 20px;">
  <div style="background:#f0fdf4;border-radius:10px;padding:12px 16px;text-align:center;border:1px solid #bbf7d0;">
    <div style="color:#166534;font-size:13px;">Entrenador: <strong>${callup.entrenador_nombre}</strong></div>
    ${telefono ? `<div style="color:#15803d;font-size:13px;margin-top:4px;">📞 ${telefono}</div>` : ""}
  </div>
</td></tr>
${FOOTER}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function paymentConfirmedHtml(playerName, mes, temporada, cantidad, fechaPago, notas) {
  return wrap(
    'linear-gradient(135deg,#16a34a,#15803d)', '✅', 'PAGO CONFIRMADO', 'CD Bustarviejo',
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;">El pago de <strong>${playerName}</strong> ha sido aprobado por el club:</p>
    <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #bbf7d0;">
      ${dataRow('👤 JUGADOR', playerName)}
      ${dataRow('📅 MES', mes)}
      ${dataRow('🗓️ TEMPORADA', temporada)}
      <div style="padding:12px 0;text-align:center;">
        <div style="font-size:12px;color:#166534;">CANTIDAD</div>
        <div style="font-size:28px;font-weight:800;color:#16a34a;">${cantidad}€</div>
      </div>
      ${fechaPago ? `<div style="color:#166534;font-size:13px;text-align:center;">Fecha: ${fechaPago}</div>` : ''}
    </div>
    ${notas ? infoBox('blue', `<div style="color:#1e40af;font-size:13px;">📝 <strong>Notas:</strong> ${notas}</div>`) : ''}
    <p style="color:#334155;font-size:14px;text-align:center;margin:0;">¡Gracias por tu puntualidad! ⚽</p>`
  );
}

function callupPendingReminderHtml(playerName, callup) {
  return wrap(
    'linear-gradient(135deg,#f59e0b,#d97706)', '⏰', 'CONVOCATORIA SIN CONFIRMAR', 'Queda menos de 24h',
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;"><strong>${playerName}</strong> tiene una convocatoria <strong>pendiente de confirmar</strong> para mañana:</p>
    <div style="background:#fffbeb;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #fde68a;">
      <div style="font-weight:800;color:#92400e;font-size:16px;margin-bottom:8px;">${callup.titulo}</div>
      <div style="color:#b45309;font-size:13px;">📅 ${callup.fecha_partido} · ⏰ ${callup.hora_partido}</div>
      <div style="color:#b45309;font-size:13px;">📍 ${callup.ubicacion}</div>
    </div>
    ${ctaButton('https://app.cdbustarviejo.com/parentcallups', '✅ CONFIRMAR AHORA', 'linear-gradient(135deg,#f59e0b,#d97706)')}`
  );
}

function overduePaymentReminderHtml(paymentLines) {
  const rows = paymentLines.map(p =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fff7ed;border-radius:8px;margin-bottom:8px;border:1px solid #fed7aa;">
      <div><div style="font-weight:700;color:#9a3412;font-size:14px;">${p.player}</div><div style="color:#c2410c;font-size:12px;">${p.mes} · ${p.daysOverdue} días de retraso</div></div>
      <div style="font-weight:800;color:#c2410c;font-size:16px;">${p.cantidad}€</div>
    </div>`
  ).join('');
  return wrap(
    'linear-gradient(135deg,#dc2626,#b91c1c)', '🔴', 'PAGOS ATRASADOS', 'Acción requerida',
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tienes pagos pendientes desde hace más de 30 días:</p>
    ${rows}
    ${infoBox('orange', '<div style="color:#9a3412;font-size:13px;"><strong>📧 Datos bancarios:</strong><br>IBAN: ES82 0049 4447 38 2010604048<br>Banco: Santander · CD Bustarviejo</div>')}
    ${ctaButton('https://app.cdbustarviejo.com/parentpayments', '💳 VER MIS PAGOS', 'linear-gradient(135deg,#dc2626,#b91c1c)')}`
  );
}

function rsvpReminderHtml(nombre, eventoTitulo, eventoFecha, eventoHora) {
  return wrap(
    'linear-gradient(135deg,#7c3aed,#6d28d9)', '🎉', 'CONFIRMA TU ASISTENCIA', 'CD Bustarviejo',
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola${nombre ? ` ${nombre}` : ''},</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tienes un evento pendiente de confirmar:</p>
    <div style="background:#f5f3ff;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #ddd6fe;">
      <div style="font-weight:800;color:#5b21b6;font-size:17px;margin-bottom:8px;">${eventoTitulo}</div>
      ${eventoFecha ? `<div style="color:#6d28d9;font-size:14px;">📅 ${eventoFecha}${eventoHora ? ` · ⏰ ${eventoHora}` : ''}</div>` : ''}
    </div>
    ${ctaButton('https://app.cdbustarviejo.com/parentcallups', '✅ CONFIRMAR ASISTENCIA', 'linear-gradient(135deg,#7c3aed,#6d28d9)')}`
  );
}

function matchSummaryReminderHtml(nombre, titulo, fecha, hora) {
  return wrap(
    'linear-gradient(135deg,#2563eb,#1d4ed8)', '📊', 'REGISTRA EL RESUMEN', 'Tras el partido',
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola${nombre ? ` ${nombre}` : ''},</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;">Recuerda completar el resumen del partido:</p>
    <div style="background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #bfdbfe;">
      <div style="font-weight:800;color:#1e40af;font-size:16px;">${titulo}</div>
      <div style="color:#2563eb;font-size:13px;margin-top:4px;">📅 ${fecha || ''}${hora ? ` · ⏰ ${hora}` : ''}</div>
    </div>
    ${ctaButton('https://app.cdbustarviejo.com/centrocompeticiontecnico', '📝 REGISTRAR RESUMEN', 'linear-gradient(135deg,#2563eb,#1d4ed8)')}`
  );
}

function accountDeletionHtml(userName, userEmail, reason, fecha) {
  return wrap(
    'linear-gradient(135deg,#dc2626,#991b1b)', '🗑️', 'SOLICITUD DE BAJA', 'Requiere revisión',
    `${infoBox('red', `<div style="color:#991b1b;font-size:14px;"><strong>Usuario:</strong> ${userName || userEmail}<br><strong>Email:</strong> ${userEmail}<br><strong>Motivo:</strong> ${reason || 'No indicado'}<br><strong>Fecha:</strong> ${fecha}</div>`)}
    <p style="color:#64748b;font-size:13px;margin:16px 0 0;">Revisar en el panel de administración.</p>`
  );
}

function marketReservationReminderHtml(titulo, compradorNombre) {
  return wrap(
    'linear-gradient(135deg,#ea580c,#c2410c)', '🛍️', 'CIERRA TU ANUNCIO', 'Mercadillo CD Bustarviejo',
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tu anuncio lleva más de 48 horas reservado:</p>
    <div style="background:#fff7ed;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #fed7aa;">
      <div style="font-weight:800;color:#9a3412;font-size:16px;">"${titulo}"</div>
      <div style="color:#c2410c;font-size:13px;margin-top:4px;">Reservado por: ${compradorNombre}</div>
    </div>
    ${ctaButton('https://app.cdbustarviejo.com/mercadillo', '📦 GESTIONAR ANUNCIO', 'linear-gradient(135deg,#ea580c,#c2410c)')}`
  );
}

function scheduledPaymentReminderHtml(tipoRecordatorio, mesRecordatorio, fechaLimite, jugadores, totalFamilia) {
  const isUrgent = tipoRecordatorio === '2_dias_despues';
  const isWarning = tipoRecordatorio === '7_dias_antes';
  const bg = isUrgent ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : isWarning ? 'linear-gradient(135deg,#ea580c,#c2410c)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)';
  const icon = isUrgent ? '🔴' : isWarning ? '⚠️' : '📅';
  const title = isUrgent ? 'PAGO ATRASADO' : isWarning ? 'PAGO PRÓXIMO' : 'RECORDATORIO DE PAGO';
  const sub = isUrgent ? 'Acción urgente requerida' : `Fecha límite: ${fechaLimite}`;
  const jugadoresHtml = jugadores.map(j =>
    `<div style="display:flex;justify-content:space-between;padding:10px 14px;background:#f8fafc;border-radius:8px;margin-bottom:6px;border:1px solid #e2e8f0;">
      <div style="font-weight:600;color:#334155;font-size:14px;">👤 ${j.jugador_nombre}</div>
      <div style="font-weight:800;color:#0f172a;font-size:15px;">${j.cantidad}€</div>
    </div>`
  ).join('');
  return wrap(bg, icon, title, sub,
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Estimada familia,</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;">Pagos pendientes de <strong>${mesRecordatorio}</strong>:</p>
    ${jugadoresHtml}
    <div style="background:#0f172a;color:#fff;border-radius:10px;padding:14px 16px;margin:16px 0;text-align:center;">
      <div style="font-size:12px;color:#94a3b8;">TOTAL A PAGAR</div>
      <div style="font-size:28px;font-weight:800;margin-top:4px;">${totalFamilia}€</div>
    </div>
    ${infoBox('orange', '<div style="color:#9a3412;font-size:13px;"><strong>📧 Datos bancarios:</strong><br>IBAN: ES82 0049 4447 38 2010604048<br>Banco: Santander · CD Bustarviejo<br>Concepto: Nombre jugador + ' + mesRecordatorio + '</div>')}
    ${ctaButton('https://app.cdbustarviejo.com/parentpayments', '💳 REGISTRAR MI PAGO', bg)}
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:8px 0 0;">Si ya realizaste el pago, ignora este mensaje.</p>`
  );
}

function documentPendingHtml(docTitulo, docTipo, fechaLimite, jugadoresNombres) {
  return wrap(
    'linear-gradient(135deg,#f59e0b,#d97706)', '📄', 'DOCUMENTO PENDIENTE', 'Requiere tu firma',
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tienes un documento que requiere tu firma:</p>
    <div style="background:#fffbeb;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #fde68a;">
      <div style="font-weight:800;color:#92400e;font-size:16px;margin-bottom:4px;">${docTitulo}</div>
      ${docTipo ? `<div style="color:#b45309;font-size:13px;">Tipo: ${docTipo}</div>` : ''}
      ${fechaLimite ? `<div style="color:#dc2626;font-size:13px;font-weight:600;margin-top:4px;">⏰ Fecha límite: ${fechaLimite}</div>` : ''}
    </div>
    <div style="margin-bottom:16px;">
      <div style="color:#64748b;font-size:12px;font-weight:600;margin-bottom:8px;">JUGADORES PENDIENTES:</div>
      ${jugadoresNombres.map(n => `<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:4px;font-size:14px;color:#334155;">⚽ ${n}</div>`).join('')}
    </div>
    ${ctaButton('https://app.cdbustarviejo.com/parentdocuments', '🖊️ FIRMAR DOCUMENTO', 'linear-gradient(135deg,#f59e0b,#d97706)')}`
  );
}