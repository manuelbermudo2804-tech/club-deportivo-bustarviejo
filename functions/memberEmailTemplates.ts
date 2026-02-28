// Plantillas de email premium para socios del CD Bustarviejo
// Llamadas internamente desde stripe-webhook y sendMembershipWelcome

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg';

function baseLayout(headerBg, headerTitle, headerEmoji, contentHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:${headerBg};padding:30px 24px;text-align:center">
<img src="${LOGO_URL}" alt="CD Bustarviejo" width="70" height="70" style="border-radius:14px;border:3px solid rgba(255,255,255,0.4);display:block;margin:0 auto 12px"/>
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800">${headerEmoji} ${headerTitle}</h1>
<p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px">CD Bustarviejo</p>
</div>
<div style="padding:28px 24px">${contentHtml}</div>
<div style="background:#333333;padding:20px 24px;text-align:center">
<p style="margin:4px 0;font-size:12px;color:#cccccc">📧 <a href="mailto:cdbustarviejo@gmail.com" style="color:#fb923c;text-decoration:none">cdbustarviejo@gmail.com</a> · <a href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES" style="color:#fb923c;text-decoration:none">C.D.BUSTARVIEJO@HOTMAIL.ES</a></p>
<p style="margin:10px 0 4px;font-size:12px;color:#cccccc">© ${new Date().getFullYear()} CD Bustarviejo · Todos los derechos reservados</p>
</div>
</div></body></html>`;
}

function carnetBlock(nombre, numeroSocio, temporada, dni, badgeText, badgeClass) {
  const badgeBg = badgeClass === 'badge-red' ? '#dc2626' : badgeClass === 'badge-amber' ? '#d97706' : '#16a34a';
  const row = (label, value, bg) => `<tr><td style="background:${bg};padding:10px 16px;border-bottom:1px solid #e0e0e0;font-size:11px;color:#888888;font-weight:600;text-transform:uppercase;width:120px">${label}</td><td style="background:${bg};padding:10px 16px;border-bottom:1px solid #e0e0e0;font-size:15px;color:#1a1a1a;font-weight:700">${value}</td></tr>`;
  let rows = row('NOMBRE', nombre || '—', '#f8f8f8');
  if (numeroSocio) rows += row('Nº SOCIO', numeroSocio, '#ffffff');
  rows += row('TEMPORADA', temporada || '—', numeroSocio ? '#f8f8f8' : '#ffffff');
  if (dni) rows += row('DNI', dni, numeroSocio ? '#ffffff' : '#f8f8f8');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;border:2px solid #ea580c;border-collapse:separate;overflow:hidden"><tr><td colspan="2" style="background:#ea580c;padding:12px 16px;color:#ffffff;font-size:16px;font-weight:700;text-align:center">CARNET DE SOCIO — CD BUSTARVIEJO</td></tr>${rows}<tr><td colspan="2" style="background:${badgeBg};padding:10px 16px;color:#ffffff;font-size:13px;font-weight:700;text-align:center">${badgeText || '✅ SOCIO VERIFICADO'}</td></tr></table>`;
}

// ===================== PLANTILLAS =====================

// 1. BIENVENIDA (pago confirmado - checkout o admin)
export function welcomeEmail({ nombre, numeroSocio, temporada, dni, cuota }) {
  return baseLayout('#ea580c', '¡BIENVENIDO AL CLUB!', '🎉',
    `<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre || 'socio/a'}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">¡Gracias por tu apoyo al CD Bustarviejo! Hemos confirmado tu pago y nos complace darte la bienvenida como <strong style="color:#ea580c">socio oficial</strong> para la temporada <strong>${temporada || ''}</strong>.</p>
${carnetBlock(nombre, numeroSocio, temporada, dni, '✅ SOCIO VERIFICADO', 'badge-green')}
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#f0fdf4;border-left:4px solid #22c55e"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>💚 ¡Gracias por formar parte de nuestra familia!</strong></p><p style="margin:4px 0;font-size:13px;color:#333333">Tu contribución es fundamental para el desarrollo de más de 200 jóvenes deportistas de Bustarviejo.</p></div>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#eff6ff;border-left:4px solid #3b82f6"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>📲 Guarda este email</strong> como comprobante de tu membresía.</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong><br/><span style="font-size:12px;color:#64748b">Tu club de siempre 💚</span></p>`);
}

// 2. RENOVACIÓN AUTOMÁTICA (suscripción anual cobrada)
export function renewalEmail({ nombre, numeroSocio, temporada, amount, fechaVencimiento }) {
  const fechaVenc = fechaVencimiento || (temporada?.includes('-') ? `30 de junio de ${temporada.split('-')[1]}` : '');
  return baseLayout('#16a34a', 'Cuota renovada con éxito', '✅',
    `<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre || 'socio/a'}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">Tu suscripción anual se ha renovado correctamente. Hemos cobrado <strong>${amount || 25}€</strong> de tu cuota de socio.</p>
${carnetBlock(nombre, numeroSocio, temporada, null, '🔄 RENOVADO', 'badge-green')}
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#f0fdf4;border-left:4px solid #22c55e"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>✅ Tu membresía está activa</strong> hasta el <strong>${fechaVenc}</strong>.</p><p style="margin:4px 0;font-size:13px;color:#333333">No necesitas hacer nada más. La renovación se hizo automáticamente.</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">¡Gracias por seguir apoyando al club! 💪</p>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`);
}

// 3. FALLO EN COBRO (suscripción o directo)
export function paymentFailedEmail({ nombre, amount, reason }) {
  return baseLayout('#dc2626', 'Problema con tu cuota de socio', '⚠️',
    `<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre || 'socio/a'}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">No hemos podido cobrar <strong>${amount || 25}€</strong> de tu cuota de socio del CD Bustarviejo.</p>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#fef2f2;border-left:4px solid #dc2626"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>⚠️ Motivo:</strong> ${reason || 'La tarjeta fue rechazada o no tiene fondos suficientes.'}</p><p style="margin:4px 0;font-size:13px;color:#333333">Stripe reintentará el cobro automáticamente en los próximos días.</p></div>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#fff7ed;border-left:4px solid #ea580c"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>¿Qué puedes hacer?</strong></p><p style="margin:4px 0;font-size:13px;color:#333333">1. Verifica que tu tarjeta tiene fondos suficientes</p><p style="margin:4px 0;font-size:13px;color:#333333">2. Si el problema persiste, contacta con el club</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`);
}

// 4. SUSCRIPCIÓN CANCELADA
export function subscriptionCanceledEmail({ nombre, fechaVencimiento }) {
  return baseLayout('#d97706', 'Suscripción cancelada', '🔔',
    `<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre || 'socio/a'}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">Tu suscripción anual de socio del CD Bustarviejo ha sido <strong>cancelada</strong>.</p>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#fff7ed;border-left:4px solid #ea580c"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>📅 Tu membresía seguirá activa</strong> hasta el <strong>${fechaVencimiento || '30 de junio'}</strong>.</p><p style="margin:4px 0;font-size:13px;color:#333333">Después de esa fecha, no se realizarán más cobros automáticos.</p></div>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#eff6ff;border-left:4px solid #3b82f6"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>¿Quieres volver?</strong> Si en el futuro deseas renovar tu membresía, podrás hacerlo desde nuestra web o app en cualquier momento.</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">Gracias por el tiempo que nos has acompañado. ¡Siempre serás bienvenido/a! 💚</p>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`);
}

// 5. FALLO DIRECTO (payment_intent.failed - checkout)
export function directPaymentFailedEmail({ nombre, amount, tipoDesc, reason }) {
  return baseLayout('#dc2626', 'Fallo en el pago', '⚠️',
    `<p style="margin:12px 0;font-size:15px;color:#333333">Estimado/a <strong>${nombre || 'socio/a'}</strong>,</p>
<p style="margin:12px 0;font-size:15px;color:#333333">No hemos podido procesar tu <strong>${tipoDesc || 'pago'}</strong> de <strong>${amount || 0}€</strong>.</p>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#fef2f2;border-left:4px solid #dc2626"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>⚠️ Motivo:</strong> ${reason || 'Error desconocido'}</p></div>
<div style="border-radius:8px;padding:16px;margin:18px 0;background:#fff7ed;border-left:4px solid #ea580c"><p style="margin:4px 0;font-size:13px;color:#333333"><strong>¿Qué puedes hacer?</strong></p><p style="margin:4px 0;font-size:13px;color:#333333">1. Inténtalo de nuevo desde la app o la web</p><p style="margin:4px 0;font-size:13px;color:#333333">2. Usa otro método de pago</p><p style="margin:4px 0;font-size:13px;color:#333333">3. Si el problema persiste, contacta con el club</p></div>
<p style="margin:12px 0;font-size:15px;color:#333333">Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`);
}

// Handler dummy - las funciones se importan via base44.functions.invoke
Deno.serve(async (req) => {
  return Response.json({ 
    info: 'Este módulo contiene plantillas de email. Se usan internamente desde stripe-webhook y sendMembershipWelcome.'
  });
});