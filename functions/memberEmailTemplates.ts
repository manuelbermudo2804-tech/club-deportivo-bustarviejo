// Plantillas de email premium para socios del CD Bustarviejo
// Llamadas internamente desde stripe-webhook y sendMembershipWelcome

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg';

function baseLayout(headerBg, headerTitle, headerEmoji, contentHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9;-webkit-font-smoothing:antialiased}
.ctn{max-width:600px;margin:0 auto;background:#fff;border-radius:0 0 16px 16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
.hdr{background:${headerBg};padding:30px 24px;text-align:center}
.hdr img{width:70px;height:70px;border-radius:14px;border:3px solid rgba(255,255,255,0.4);object-fit:cover;margin-bottom:12px}
.hdr h1{color:#fff;margin:0;font-size:24px;font-weight:800;line-height:1.3}
.hdr p{color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px}
.body{padding:28px 24px}
.body p{margin:12px 0;font-size:15px;line-height:1.7;color:#334155}
.body strong{color:#0f172a}
.carnet{background:linear-gradient(135deg,#1e293b,#334155);border-radius:16px;padding:22px;margin:20px 0;border:2px solid #ea580c;box-shadow:0 8px 24px rgba(0,0,0,0.2)}
.carnet-row{display:flex;align-items:center;gap:14px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:14px;margin-bottom:14px}
.carnet-logo{width:56px;height:56px;border-radius:10px;border:2px solid #ea580c;object-fit:cover}
.carnet-title{color:#fff;font-size:16px;font-weight:700;flex:1;text-align:center}
.carnet-title span{display:block;font-size:12px;color:#22c55e;font-weight:600;margin-top:2px}
.carnet-data p{margin:7px 0;font-size:14px;color:#f1f5f9;letter-spacing:0.3px}.carnet-data strong{color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.7;display:block;margin-bottom:2px}
.carnet-badge{text-align:center;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.15)}
.badge{display:inline-block;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:6px 18px;border-radius:8px;font-weight:700;font-size:13px}
.badge-green{background:linear-gradient(135deg,#16a34a,#22c55e)}
.badge-red{background:linear-gradient(135deg,#dc2626,#ef4444)}
.badge-amber{background:linear-gradient(135deg,#d97706,#f59e0b)}
.info-box{border-radius:12px;padding:16px;margin:18px 0}
.info-green{background:#f0fdf4;border-left:4px solid #22c55e}
.info-orange{background:#fff7ed;border-left:4px solid #ea580c}
.info-red{background:#fef2f2;border-left:4px solid #dc2626}
.info-blue{background:#eff6ff;border-left:4px solid #3b82f6}
.info-box p{margin:4px 0;font-size:13px}
.ftr{background:#1e293b;padding:20px 24px;text-align:center}
.ftr p{margin:4px 0;font-size:12px;color:#94a3b8}
.ftr a{color:#fb923c;text-decoration:none}
</style></head><body><div class="ctn">
<div class="hdr">
<img src="${LOGO_URL}" alt="CD Bustarviejo"/>
<h1>${headerEmoji} ${headerTitle}</h1>
<p>CD Bustarviejo</p>
</div>
<div class="body">${contentHtml}</div>
<div class="ftr">
<p>📧 <a href="mailto:cdbustarviejo@gmail.com">cdbustarviejo@gmail.com</a> · <a href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES">C.D.BUSTARVIEJO@HOTMAIL.ES</a></p>
<p style="margin-top:10px">© ${new Date().getFullYear()} CD Bustarviejo · Todos los derechos reservados</p>
</div>
</div></body></html>`;
}

function carnetBlock(nombre, numeroSocio, temporada, dni, badgeText, badgeClass) {
  return `<div class="carnet">
<div class="carnet-row">
<img src="${LOGO_URL}" alt="Logo" class="carnet-logo"/>
<div class="carnet-title">CARNET DE SOCIO<span>CD BUSTARVIEJO</span></div>
</div>
<div class="carnet-data">
<p><strong>NOMBRE:</strong> ${nombre || '—'}</p>
${numeroSocio ? `<p><strong>Nº SOCIO:</strong> ${numeroSocio}</p>` : ''}
<p><strong>TEMPORADA:</strong> ${temporada || '—'}</p>
${dni ? `<p><strong>DNI:</strong> ${dni}</p>` : ''}
</div>
<div class="carnet-badge"><span class="badge ${badgeClass || 'badge-green'}">${badgeText || '✅ SOCIO VERIFICADO'}</span></div>
</div>`;
}

// ===================== PLANTILLAS =====================

// 1. BIENVENIDA (pago confirmado - checkout o admin)
export function welcomeEmail({ nombre, numeroSocio, temporada, dni, cuota }) {
  const content = `
<p>Estimado/a <strong>${nombre || 'socio/a'}</strong>,</p>
<p>¡Gracias por tu apoyo al CD Bustarviejo! Hemos confirmado tu pago y nos complace darte la bienvenida como <strong style="color:#ea580c">socio oficial</strong> para la temporada <strong>${temporada || ''}</strong>.</p>
${carnetBlock(nombre, numeroSocio, temporada, dni, '✅ SOCIO VERIFICADO', 'badge-green')}
<div class="info-box info-green">
<p><strong>💚 ¡Gracias por formar parte de nuestra familia!</strong></p>
<p>Tu contribución es fundamental para el desarrollo de más de 200 jóvenes deportistas de Bustarviejo.</p>
</div>
<div class="info-box info-blue">
<p><strong>📲 Guarda este email</strong> como comprobante de tu membresía.</p>
</div>
<p>Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong><br/><span style="font-size:12px;color:#64748b">Tu club de siempre 💚</span></p>`;
  return baseLayout(
    'linear-gradient(135deg, #ea580c, #22c55e)',
    '¡BIENVENIDO AL CLUB!',
    '🎉',
    content
  );
}

// 2. RENOVACIÓN AUTOMÁTICA (suscripción anual cobrada)
export function renewalEmail({ nombre, numeroSocio, temporada, amount, fechaVencimiento }) {
  const fechaVenc = fechaVencimiento || (temporada?.includes('-') ? `30 de junio de ${temporada.split('-')[1]}` : '');
  const content = `
<p>Estimado/a <strong>${nombre || 'socio/a'}</strong>,</p>
<p>Tu suscripción anual se ha renovado correctamente. Hemos cobrado <strong>${amount || 25}€</strong> de tu cuota de socio.</p>
${carnetBlock(nombre, numeroSocio, temporada, null, '🔄 RENOVADO', 'badge-green')}
<div class="info-box info-green">
<p><strong>✅ Tu membresía está activa</strong> hasta el <strong>${fechaVenc}</strong>.</p>
<p>No necesitas hacer nada más. La renovación se hizo automáticamente.</p>
</div>
<p>¡Gracias por seguir apoyando al club! 💪</p>
<p>Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`;
  return baseLayout(
    'linear-gradient(135deg, #16a34a, #22c55e)',
    'Cuota renovada con éxito',
    '✅',
    content
  );
}

// 3. FALLO EN COBRO (suscripción o directo)
export function paymentFailedEmail({ nombre, amount, reason }) {
  const content = `
<p>Estimado/a <strong>${nombre || 'socio/a'}</strong>,</p>
<p>No hemos podido cobrar <strong>${amount || 25}€</strong> de tu cuota de socio del CD Bustarviejo.</p>
<div class="info-box info-red">
<p><strong>⚠️ Motivo:</strong> ${reason || 'La tarjeta fue rechazada o no tiene fondos suficientes.'}</p>
<p>Stripe reintentará el cobro automáticamente en los próximos días.</p>
</div>
<div class="info-box info-orange">
<p><strong>¿Qué puedes hacer?</strong></p>
<p>1. Verifica que tu tarjeta tiene fondos suficientes</p>
<p>2. Si el problema persiste, contacta con el club</p>
</div>
<p>Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`;
  return baseLayout(
    'linear-gradient(135deg, #dc2626, #b91c1c)',
    'Problema con tu cuota de socio',
    '⚠️',
    content
  );
}

// 4. SUSCRIPCIÓN CANCELADA
export function subscriptionCanceledEmail({ nombre, fechaVencimiento }) {
  const content = `
<p>Estimado/a <strong>${nombre || 'socio/a'}</strong>,</p>
<p>Tu suscripción anual de socio del CD Bustarviejo ha sido <strong>cancelada</strong>.</p>
<div class="info-box info-orange">
<p><strong>📅 Tu membresía seguirá activa</strong> hasta el <strong>${fechaVencimiento || '30 de junio'}</strong>.</p>
<p>Después de esa fecha, no se realizarán más cobros automáticos.</p>
</div>
<div class="info-box info-blue">
<p><strong>¿Quieres volver?</strong> Si en el futuro deseas renovar tu membresía, podrás hacerlo desde nuestra web o app en cualquier momento.</p>
</div>
<p>Gracias por el tiempo que nos has acompañado. ¡Siempre serás bienvenido/a! 💚</p>
<p>Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`;
  return baseLayout(
    'linear-gradient(135deg, #d97706, #f59e0b)',
    'Suscripción cancelada',
    '🔔',
    content
  );
}

// 5. FALLO DIRECTO (payment_intent.failed - checkout)
export function directPaymentFailedEmail({ nombre, amount, tipoDesc, reason }) {
  const content = `
<p>Estimado/a <strong>${nombre || 'socio/a'}</strong>,</p>
<p>No hemos podido procesar tu <strong>${tipoDesc || 'pago'}</strong> de <strong>${amount || 0}€</strong>.</p>
<div class="info-box info-red">
<p><strong>⚠️ Motivo:</strong> ${reason || 'Error desconocido'}</p>
</div>
<div class="info-box info-orange">
<p><strong>¿Qué puedes hacer?</strong></p>
<p>1. Inténtalo de nuevo desde la app o la web</p>
<p>2. Usa otro método de pago</p>
<p>3. Si el problema persiste, contacta con el club</p>
</div>
<p>Atentamente,<br/><strong style="color:#ea580c">CD Bustarviejo</strong></p>`;
  return baseLayout(
    'linear-gradient(135deg, #dc2626, #b91c1c)',
    'Fallo en el pago',
    '⚠️',
    content
  );
}

// Handler dummy - las funciones se importan via base44.functions.invoke
Deno.serve(async (req) => {
  return Response.json({ 
    info: 'Este módulo contiene plantillas de email. Se usan internamente desde stripe-webhook y sendMembershipWelcome.'
  });
});