/**
 * Librería de templates HTML para emails del club.
 * Todos siguen el mismo diseño: tarjeta responsive con header de color, contenido y footer oscuro.
 */

const FOOTER = `
<tr><td style="background:#1e293b;padding:24px;text-align:center;">
  <div style="color:#cbd5e1;font-size:13px;font-weight:600;margin-bottom:14px;">Síguenos en nuestras redes</div>
  <table cellpadding="0" cellspacing="0" style="margin:0 auto 18px;">
    <tr>
      <td style="padding:0 4px;">
        <a href="https://www.cdbustarviejo.com" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;padding:9px 14px;border-radius:8px;">🌐 Web</a>
      </td>
      <td style="padding:0 4px;">
        <a href="https://www.instagram.com/cdbustarviejo" style="display:inline-block;background:#E1306C;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;padding:9px 14px;border-radius:8px;">📸 Instagram</a>
      </td>
      <td style="padding:0 4px;">
        <a href="https://www.facebook.com/cdbustarviejo" style="display:inline-block;background:#1877F2;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;padding:9px 14px;border-radius:8px;">📘 Facebook</a>
      </td>
      <td style="padding:0 4px;">
        <a href="https://t.me/cdbustarviejo" style="display:inline-block;background:#229ED9;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;padding:9px 14px;border-radius:8px;">✈️ Telegram</a>
      </td>
    </tr>
  </table>
  <div style="color:#94a3b8;font-size:12px;line-height:1.6;">
    <strong style="color:#f8fafc;">CD Bustarviejo</strong><br>
    <a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a>
  </div>
</td></tr>`;

function wrap(headerBg, headerIcon, headerTitle, headerSub, bodyHtml) {
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
  return `<div style="background:${color === 'orange' ? '#fff7ed' : color === 'green' ? '#f0fdf4' : color === 'blue' ? '#eff6ff' : color === 'red' ? '#fef2f2' : '#f8fafc'};border-radius:10px;padding:14px 16px;margin-bottom:16px;border-left:4px solid ${color === 'orange' ? '#f97316' : color === 'green' ? '#22c55e' : color === 'blue' ? '#3b82f6' : color === 'red' ? '#ef4444' : '#94a3b8'};">${content}</div>`;
}

function ctaButton(url, text, bg = '#16a34a') {
  // Extraer color sólido del gradient si se pasa uno (Outlook no soporta linear-gradient)
  const solidColor = bg.includes('gradient') ? (bg.match(/#[0-9a-fA-F]{6}/)?.[0] || '#16a34a') : bg;
  return `<div style="text-align:center;margin:20px 0 8px;">
  <a href="${url}" style="display:inline-block;background-color:${solidColor};color:#ffffff !important;font-size:16px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:12px;mso-padding-alt:16px 32px;">${text}</a>
  <div style="color:#94a3b8;font-size:11px;margin-top:8px;">Pulsa para abrir la app</div>
</div>`;
}

function dataRow(label, value) {
  return `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;font-size:12px;font-weight:600;">${label}</span><div style="color:#0f172a;font-size:15px;font-weight:600;margin-top:2px;">${value}</div></div>`;
}

// IBAN/Banco por defecto (se sobrescriben desde SeasonConfig en las funciones que los reciben)
const DEFAULT_IBAN = 'ES82 0049 4447 38 2010004048';
const DEFAULT_BANK = 'Santander';

// ─── 1. Recordatorio pagos morosos (+30 días) ───
export function overduePaymentReminderHtml(paymentLines, bankInfo = {}) {
  const iban = bankInfo.iban || DEFAULT_IBAN;
  const bank = bankInfo.bank || DEFAULT_BANK;
  const rows = paymentLines.map(p =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fff7ed;border-radius:8px;margin-bottom:8px;border:1px solid #fed7aa;">
      <div><div style="font-weight:700;color:#9a3412;font-size:14px;">${p.player}</div><div style="color:#c2410c;font-size:12px;">${p.mes} · ${p.daysOverdue} días de retraso</div></div>
      <div style="font-weight:800;color:#c2410c;font-size:16px;">${p.cantidad}€</div>
    </div>`
  ).join('');

  return wrap(
    'linear-gradient(135deg,#dc2626,#b91c1c)', '🔴', 'PAGOS ATRASADOS', 'Acción requerida',
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tienes pagos pendientes desde hace más de 30 días. Por favor, regulariza tu situación lo antes posible:</p>
    ${rows}
    ${infoBox('orange', `<div style="color:#9a3412;font-size:13px;"><strong>📧 Datos bancarios:</strong><br>IBAN: ${iban}<br>Banco: ${bank} · Beneficiario: CD Bustarviejo</div>`)}
    ${ctaButton('https://app.cdbustarviejo.com/parentpayments', '💳 VER MIS PAGOS', 'linear-gradient(135deg,#dc2626,#b91c1c)')}`
  );
}

// ─── 2. Recordatorio RSVP evento ───
export function rsvpReminderHtml(nombre, eventoTitulo, eventoFecha, eventoHora) {
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

// ─── 3. Recordatorio resumen de partido (entrenador) ───
export function matchSummaryReminderHtml(nombre, titulo, fecha, hora) {
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

// ─── 4. Solicitud eliminación de cuenta (admin) ───
export function accountDeletionHtml(userName, userEmail, reason, fecha) {
  return wrap(
    'linear-gradient(135deg,#dc2626,#991b1b)', '🗑️', 'SOLICITUD DE BAJA', 'Requiere revisión',
    `${infoBox('red', `<div style="color:#991b1b;font-size:14px;"><strong>Usuario:</strong> ${userName || userEmail}<br><strong>Email:</strong> ${userEmail}<br><strong>Motivo:</strong> ${reason || 'No indicado'}<br><strong>Fecha:</strong> ${fecha}</div>`)}
    <p style="color:#64748b;font-size:13px;margin:16px 0 0;">Revisar en el panel de administración.</p>`
  );
}

// ─── 5. Recordatorio mercadillo reserva ───
export function marketReservationReminderHtml(titulo, compradorNombre) {
  return wrap(
    'linear-gradient(135deg,#ea580c,#c2410c)', '🛍️', 'CIERRA TU ANUNCIO', 'Mercadillo CD Bustarviejo',
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tu anuncio lleva más de 48 horas reservado. Por favor, márcalo como vendido o entregado:</p>
    <div style="background:#fff7ed;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #fed7aa;">
      <div style="font-weight:800;color:#9a3412;font-size:16px;">"${titulo}"</div>
      <div style="color:#c2410c;font-size:13px;margin-top:4px;">Reservado por: ${compradorNombre}</div>
    </div>
    ${ctaButton('https://app.cdbustarviejo.com/mercadillo', '📦 GESTIONAR ANUNCIO', 'linear-gradient(135deg,#ea580c,#c2410c)')}`
  );
}

// ─── 6. Recordatorio pago escalonado (15/7/2 días) ───
export function scheduledPaymentReminderHtml(tipoRecordatorio, mesRecordatorio, fechaLimite, jugadores, totalFamilia, bankInfo = {}) {
  const iban = bankInfo.iban || DEFAULT_IBAN;
  const bank = bankInfo.bank || DEFAULT_BANK;
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
    ${infoBox('orange', `<div style="color:#9a3412;font-size:13px;"><strong>📧 Datos bancarios:</strong><br>IBAN: ${iban}<br>Banco: ${bank} · CD Bustarviejo<br>Concepto: Nombre jugador + ${mesRecordatorio}</div>`)}
    ${ctaButton('https://app.cdbustarviejo.com/parentpayments', '💳 REGISTRAR MI PAGO', bg)}
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:8px 0 0;">Si ya realizaste el pago, ignora este mensaje.</p>`
  );
}

// ─── 7. Convocatoria nueva (EmailNotificationTrigger) ───
export function newCallupBasicHtml(playerName, callup) {
  return wrap(
    'linear-gradient(135deg,#ea580c,#c2410c)', '⚽', '¡CONVOCATORIA!', 'CD Bustarviejo',
    `<div style="background:#fff7ed;border:2px solid #fdba74;border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:center;">
      <div style="color:#9a3412;font-size:12px;font-weight:600;">JUGADOR CONVOCADO</div>
      <div style="color:#c2410c;font-size:18px;font-weight:800;margin-top:4px;">${playerName}</div>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
      ${callup.rival ? dataRow('RIVAL', `${callup.rival} ${callup.local_visitante ? `(${callup.local_visitante})` : ''}`) : ''}
      ${dataRow('📅 FECHA', new Date(callup.fecha_partido).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))}
      ${dataRow('⏰ HORA', callup.hora_partido)}
      ${callup.hora_concentracion ? dataRow('🕐 CONCENTRACIÓN', callup.hora_concentracion) : ''}
      ${dataRow('📍 UBICACIÓN', callup.ubicacion)}
    </div>
    ${callup.descripcion ? infoBox('blue', `<div style="color:#1e40af;font-size:13px;"><strong>📋 Instrucciones:</strong><br>${callup.descripcion}</div>`) : ''}
    ${ctaButton('https://app.cdbustarviejo.com/parentcallups', '✅ CONFIRMAR ASISTENCIA')}`
  );
}

// ─── 8. Pago confirmado / aprobado ───
export function paymentConfirmedHtml(playerName, mes, temporada, cantidad, fechaPago, notas) {
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

// ─── 9. Convocatoria pendiente (24h antes) ───
export function callupPendingReminderHtml(playerName, callup) {
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

// ─── 10. Pedido de equipación aprobado ───
export function clothingOrderApprovedHtml(playerName, importe, estado) {
  return wrap(
    'linear-gradient(135deg,#16a34a,#15803d)', '✅', 'PEDIDO APROBADO', 'Equipación CD Bustarviejo',
    `<p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
    <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tu pedido de equipación para <strong>${playerName}</strong> ha sido aprobado:</p>
    <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #bbf7d0;">
      ${dataRow('👤 JUGADOR', playerName)}
      <div style="padding:12px 0;text-align:center;">
        <div style="font-size:12px;color:#166534;">IMPORTE</div>
        <div style="font-size:28px;font-weight:800;color:#16a34a;">${importe}€</div>
      </div>
      ${dataRow('📦 ESTADO', estado)}
    </div>
    ${infoBox('green', '<div style="color:#166534;font-size:13px;">📍 Te avisaremos cuando esté listo para recoger en las instalaciones del club.</div>')}
    <p style="color:#334155;font-size:14px;text-align:center;margin:0;">¡Gracias! ⚽</p>`
  );
}

// ─── 11. Documento pendiente de firma ───
export function documentPendingHtml(docTitulo, docTipo, fechaLimite, jugadoresNombres) {
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