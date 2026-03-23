import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const base44 = createClientFromRequest(req);
  const url = new URL(req.url);

  // =============================================
  // GET ?token=XXX → Devuelve HTML completo del carnet (PÚBLICO, sin auth)
  // =============================================
  if (req.method === 'GET' && url.searchParams.get('token')) {
    try {
      const token = url.searchParams.get('token');

      const members = await base44.asServiceRole.entities.ClubMember.filter({ carnet_token: token });
      if (members.length === 0) {
        return new Response(renderErrorPage('Carnet no encontrado', 'El enlace no es válido o ha expirado. Contacta con el club para obtener uno nuevo.'), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      const member = members[0];

      const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      const seasonConfig = configs[0];

      if (!seasonConfig?.carnet_publico_activo) {
        return new Response(renderErrorPage('Servicio no disponible', 'El carnet digital público no está activado en este momento. Contacta con el club.'), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      const now = new Date();
      const vencimiento = member.fecha_vencimiento ? new Date(member.fecha_vencimiento) : null;
      const isPaid = member.estado_pago === 'Pagado';
      const isExpired = vencimiento ? now > vencimiento : false;
      const isActive = isPaid && !isExpired && member.activo !== false;
      const numeroSocio = member.numero_socio || member.id.slice(-8).toUpperCase();
      const comercios = seasonConfig.comercios_descuento || [];

      const html = renderCardPage({
        nombre: member.nombre_completo,
        numeroSocio,
        isActive,
        fechaVencimiento: member.fecha_vencimiento,
        comercios,
      });

      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      });

    } catch (error) {
      console.error('Error rendering public card:', error);
      return new Response(renderErrorPage('Error', 'Ha ocurrido un error al cargar el carnet. Inténtalo de nuevo.'), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  }

  // =============================================
  // POST — API JSON (para la app React y admin)
  // =============================================
  if (req.method === 'POST') {
    const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    try {
      const body = await req.json();
      const { action, token: bodyToken, memberId } = body;

      // ACTION: get — fetch member card data as JSON (para app React)
      if (action === 'get') {
        if (!bodyToken) {
          return Response.json({ error: 'Token requerido' }, { status: 400, headers: jsonHeaders });
        }

        const members = await base44.asServiceRole.entities.ClubMember.filter({ carnet_token: bodyToken });
        if (members.length === 0) {
          return Response.json({ error: 'Carnet no encontrado' }, { status: 404, headers: jsonHeaders });
        }

        const member = members[0];
        const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
        const seasonConfig = configs[0];

        if (!seasonConfig?.carnet_publico_activo) {
          return Response.json({ error: 'Servicio no disponible' }, { status: 403, headers: jsonHeaders });
        }

        const now = new Date();
        const vencimiento = member.fecha_vencimiento ? new Date(member.fecha_vencimiento) : null;
        const isPaid = member.estado_pago === 'Pagado';
        const isExpired = vencimiento ? now > vencimiento : false;
        const isActive = isPaid && !isExpired && member.activo !== false;

        return Response.json({
          nombre: member.nombre_completo,
          numero_socio: member.numero_socio || member.id.slice(-8).toUpperCase(),
          estado: isActive ? 'activo' : 'expirado',
          fecha_alta: member.fecha_alta || null,
          fecha_vencimiento: member.fecha_vencimiento || null,
          comercios: seasonConfig.comercios_descuento || [],
        }, { headers: jsonHeaders });
      }

      // ACTION: generateToken
      if (action === 'generateToken') {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403, headers: jsonHeaders });
        }
        if (!memberId) {
          return Response.json({ error: 'memberId requerido' }, { status: 400, headers: jsonHeaders });
        }
        const newToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
        await base44.asServiceRole.entities.ClubMember.update(memberId, { carnet_token: newToken });
        return Response.json({ token: newToken }, { headers: jsonHeaders });
      }

      // ACTION: sendCarnetEmail
      if (action === 'sendCarnetEmail') {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403, headers: jsonHeaders });
        }
        if (!memberId) {
          return Response.json({ error: 'memberId requerido' }, { status: 400, headers: jsonHeaders });
        }

        const membersList = await base44.asServiceRole.entities.ClubMember.filter({ id: memberId });
        const member = membersList[0];
        if (!member) {
          return Response.json({ error: 'Socio no encontrado' }, { status: 404, headers: jsonHeaders });
        }

        let carnetToken = member.carnet_token;
        if (!carnetToken) {
          carnetToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
          await base44.asServiceRole.entities.ClubMember.update(memberId, { carnet_token: carnetToken });
        }

        // URL directa a la función backend (HTML puro, sin app)
        const reqUrl = new URL(req.url);
        // Construir URL base de la función
        const functionBaseUrl = `${reqUrl.protocol}//${reqUrl.host}${reqUrl.pathname}`;
        const cardUrl = `${functionBaseUrl}?token=${carnetToken}`;

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; background: linear-gradient(135deg, #16a34a, #15803d); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎫 Tu Carnet de Socio Digital</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">CD Bustarviejo</p>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0;">
              <p style="font-size: 16px; color: #334155;">Hola <strong>${member.nombre_completo}</strong>,</p>
              <p style="color: #475569;">Tu carnet de socio digital del CD Bustarviejo ya está listo. Puedes acceder a él en cualquier momento desde el siguiente enlace:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${cardUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  📱 Ver mi Carnet Digital
                </a>
              </div>
              <div style="background: #fff7ed; border: 2px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #9a3412;"><strong>💡 Consejo:</strong> Guarda este enlace en los favoritos de tu móvil o añádelo a la pantalla de inicio para tenerlo siempre a mano cuando vayas a un comercio.</p>
              </div>
              <p style="color: #64748b; font-size: 13px;">Simplemente enseña tu carnet digital en la pantalla del móvil en los comercios adheridos para obtener tus descuentos de socio.</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; border-radius: 0 0 16px 16px; background: #f1f5f9;">
              <p style="margin: 0;">CD Bustarviejo — Deporte y valores desde 1989</p>
            </div>
          </div>
        `;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'CD Bustarviejo <noreply@cdbustarviejo.com>',
            to: member.email,
            subject: '🎫 Tu Carnet de Socio Digital — CD Bustarviejo',
            html: emailHtml,
          }),
        });

        const emailResult = await emailRes.json();
        await base44.asServiceRole.entities.ClubMember.update(memberId, { carnet_email_enviado: true });

        return Response.json({ success: true, emailResult }, { headers: jsonHeaders });
      }

      return Response.json({ error: 'Acción no válida' }, { status: 400, headers: jsonHeaders });

    } catch (error) {
      console.error('Error in publicMemberCard POST:', error);
      return Response.json({ error: error.message }, { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  return Response.json({ error: 'Método no permitido' }, { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});


// =============================================
// HTML TEMPLATES
// =============================================

function renderCardPage({ nombre, numeroSocio, isActive, fechaVencimiento, comercios }) {
  const statusColor = isActive ? '#16a34a' : '#dc2626';
  const statusBg = isActive ? '#f0fdf4' : '#fef2f2';
  const statusText = isActive ? 'ACTIVO' : 'EXPIRADO';
  const statusSubtext = isActive ? 'Válido para descuentos' : 'No válido para descuentos';
  const statusIcon = isActive ? '✅' : '❌';
  const bgGradient = isActive
    ? 'linear-gradient(135deg, #16a34a, #15803d, #166534)'
    : 'linear-gradient(135deg, #dc2626, #b91c1c, #991b1b)';

  const fechaVencStr = fechaVencimiento
    ? new Date(fechaVencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Sin fecha';

  const comerciosHtml = comercios.length > 0
    ? comercios.map(c => `
        <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;color:#1e293b;">${c.nombre || ''}</div>
              ${c.categoria ? `<span style="display:inline-block;background:#fff7ed;color:#c2410c;font-size:11px;padding:2px 8px;border-radius:6px;margin-top:4px;">${c.categoria}</span>` : ''}
            </div>
            <div style="background:#16a34a;color:#fff;font-weight:700;padding:6px 14px;border-radius:8px;font-size:14px;white-space:nowrap;">${c.descuento || ''}</div>
          </div>
          ${c.direccion ? `<div style="font-size:12px;color:#64748b;margin-top:8px;">📍 ${c.direccion}</div>` : ''}
          ${c.telefono ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">📞 ${c.telefono}</div>` : ''}
        </div>
      `).join('')
    : '<p style="text-align:center;color:#94a3b8;font-size:14px;">No hay comercios configurados aún</p>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Carnet CD Bustarviejo">
  <title>🎫 Carnet de Socio — CD Bustarviejo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${bgGradient};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .container { max-width: 420px; width: 100%; }
    .card {
      background: #fff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 4px solid #fff;
    }
    .card-header {
      background: ${isActive ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #dc2626, #b91c1c)'};
      padding: 24px;
      text-align: center;
      color: #fff;
    }
    .club-logo {
      width: 48px; height: 48px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      margin-bottom: 8px;
    }
    .card-header h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .card-header p { font-size: 14px; opacity: 0.9; }
    .status-section {
      padding: 40px 24px;
      text-align: center;
      background: ${statusBg};
    }
    .status-icon { font-size: 72px; margin-bottom: 16px; display: block; }
    .status-text { font-size: 36px; font-weight: 900; color: ${statusColor}; margin-bottom: 8px; }
    .status-sub { font-size: 16px; font-weight: 600; color: ${statusColor}; opacity: 0.8; }
    .clock-section {
      background: #0f172a;
      color: #fff;
      padding: 16px;
      text-align: center;
      border-top: 4px solid #f97316;
    }
    .clock-label { font-size: 12px; opacity: 0.7; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .clock-time { font-size: 32px; font-weight: 700; font-family: monospace; letter-spacing: 3px; }
    .clock-date { font-size: 13px; opacity: 0.6; margin-top: 4px; }
    .info-section { padding: 24px; background: #fff; }
    .info-row { margin-bottom: 16px; }
    .info-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; }
    .info-value { font-size: 17px; font-weight: 700; color: #1e293b; }
    .info-value.orange { color: #ea580c; font-family: monospace; }
    .comercios-section {
      background: #fff;
      border-radius: 20px;
      padding: 24px;
      margin-top: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      border: 2px solid #fff;
    }
    .comercios-title { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .tip-box {
      background: #fff;
      border-radius: 20px;
      padding: 24px;
      margin-top: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      border: 2px solid #fff;
    }
    .tip-box h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
    .tip-box p { font-size: 13px; color: #475569; line-height: 1.6; }
    .tip-highlight { background: #fff7ed; border: 2px solid #fed7aa; border-radius: 12px; padding: 14px; margin-top: 12px; }
    .tip-highlight p { font-size: 13px; color: #9a3412; margin: 0; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
    .pulse { animation: pulse 2s ease-in-out infinite; }
  </style>
</head>
<body>
  <div class="container">
    <!-- CARNET -->
    <div class="card">
      <div class="card-header">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" class="club-logo" />
        <h1>🎫 CARNET DE SOCIO</h1>
        <p>CD Bustarviejo</p>
      </div>

      <div class="status-section">
        <span class="status-icon pulse">${statusIcon}</span>
        <div class="status-text">${statusText}</div>
        <div class="status-sub">${statusSubtext}</div>
      </div>

      <div class="clock-section">
        <div class="clock-label">⏰ Hora actual (antifraude)</div>
        <div class="clock-time" id="clock">--:--:--</div>
        <div class="clock-date" id="clockDate">...</div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <div class="info-label">Socio</div>
          <div class="info-value">${nombre}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Número de Socio</div>
          <div class="info-value orange">#${numeroSocio}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Válido hasta</div>
          <div class="info-value">${fechaVencStr}</div>
        </div>
      </div>
    </div>

    <!-- COMERCIOS -->
    ${comercios.length > 0 ? `
    <div class="comercios-section">
      <div class="comercios-title">🏪 Descuentos Disponibles</div>
      ${comerciosHtml}
    </div>
    ` : ''}

    <!-- CONSEJOS -->
    <div class="tip-box">
      <h3>🎫 Carnet Digital de Socio</h3>
      <p>Este carnet te identifica como <strong>socio oficial del CD Bustarviejo</strong> y te permite acceder a descuentos exclusivos en comercios colaboradores.</p>
      <div class="tip-highlight">
        <p><strong>💡 Consejo:</strong> Guarda este enlace en los favoritos de tu móvil o añádelo a la pantalla de inicio para tenerlo siempre a mano.</p>
      </div>
    </div>
  </div>

  <script>
    function updateClock() {
      var now = new Date();
      var h = String(now.getHours()).padStart(2, '0');
      var m = String(now.getMinutes()).padStart(2, '0');
      var s = String(now.getSeconds()).padStart(2, '0');
      document.getElementById('clock').textContent = h + ':' + m + ':' + s;
      var dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
      var meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      document.getElementById('clockDate').textContent = dias[now.getDay()] + ', ' + now.getDate() + ' de ' + meses[now.getMonth()] + ' ' + now.getFullYear();
    }
    updateClock();
    setInterval(updateClock, 1000);
  </script>
</body>
</html>`;
}

function renderErrorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — CD Bustarviejo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .error-card {
      background: #fff;
      border-radius: 20px;
      padding: 48px 32px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .error-icon { font-size: 56px; margin-bottom: 16px; }
    .error-title { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
    .error-message { font-size: 14px; color: #64748b; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="error-card">
    <div class="error-icon">⚠️</div>
    <div class="error-title">${title}</div>
    <div class="error-message">${message}</div>
  </div>
</body>
</html>`;
}