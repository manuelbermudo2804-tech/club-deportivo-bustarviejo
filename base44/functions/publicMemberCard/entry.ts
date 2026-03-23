// Backend function para carnet público de socio
// GET ?token=XXX → devuelve HTML completa (para socios externos, sin login)
// POST con auth → acciones admin (generateToken, sendCarnetEmail)

import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.8.21';

const APP_ID = Deno.env.get('BASE44_APP_ID');

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderCardHTML(member, seasonConfig) {
  const now = new Date();
  const vencimiento = member.fecha_vencimiento ? new Date(member.fecha_vencimiento) : null;
  const isPaid = member.estado_pago === 'Pagado';
  const isExpired = vencimiento ? now > vencimiento : false;
  const isActive = isPaid && !isExpired && member.activo !== false;
  const comercios = seasonConfig?.comercios_descuento || [];
  const numero = member.numero_socio || member.id?.slice(-8).toUpperCase() || '---';

  const statusColor = isActive ? '#16a34a' : '#dc2626';
  const statusBg = isActive ? '#f0fdf4' : '#fef2f2';
  const statusText = isActive ? 'ACTIVO' : 'EXPIRADO';
  const statusSubtext = isActive ? 'Válido para descuentos' : 'No válido para descuentos';
  const statusIcon = isActive
    ? '<svg width="96" height="96" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : '<svg width="96" height="96" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

  const CLUB_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg';

  const comerciosHTML = comercios.length > 0 ? `
    <div style="background:white;border-radius:16px;border:2px solid white;box-shadow:0 10px 25px rgba(0,0,0,.15);margin-top:24px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
        <h2 style="margin:0;font-size:18px;font-weight:800;color:#1e293b;">🏪 Descuentos Disponibles</h2>
      </div>
      <div style="padding:16px 24px;">
        ${comercios.map(c => `
          <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid #e2e8f0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
              <div style="flex:1;">
                <strong style="color:#1e293b;font-size:15px;">${escapeHtml(c.nombre || '')}</strong>
                ${c.categoria ? `<span style="display:inline-block;margin-left:8px;background:#fff7ed;color:#c2410c;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">${escapeHtml(c.categoria)}</span>` : ''}
              </div>
              <div style="background:#16a34a;color:white;padding:6px 14px;border-radius:8px;font-weight:800;font-size:16px;white-space:nowrap;">${escapeHtml(c.descuento || '')}</div>
            </div>
            ${c.direccion ? `<p style="margin:8px 0 0;color:#64748b;font-size:13px;">📍 ${escapeHtml(c.direccion)}</p>` : ''}
            ${c.telefono ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px;">📞 ${escapeHtml(c.telefono)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const vencimientoText = vencimiento
    ? vencimiento.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Sin fecha de vencimiento';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Carnet de Socio — CD Bustarviejo</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, ${isActive ? '#16a34a, #15803d, #14532d' : '#dc2626, #b91c1c, #7f1d1d'});
      padding: 24px 16px;
      display: flex; align-items: center; justify-content: center;
    }
    .container { max-width: 420px; width: 100%; }
    .card { background:white; border-radius:20px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.3); border:4px solid white; }
    .header { background:linear-gradient(135deg, ${statusColor}, ${isActive ? '#15803d' : '#991b1b'}); padding:24px; text-align:center; color:white; }
    .header img { width:48px; height:48px; border-radius:10px; margin-bottom:8px; }
    .header h1 { font-size:22px; font-weight:800; margin:0; }
    .header p { font-size:13px; opacity:.9; margin-top:4px; }
    .status { background:${statusBg}; padding:40px 24px; text-align:center; }
    .status svg { margin:0 auto 16px; display:block; }
    .status h2 { font-size:36px; font-weight:900; color:${statusColor}; margin:0 0 4px; }
    .status p { font-size:16px; font-weight:600; color:${statusColor}; opacity:.85; }
    .clock { background:#0f172a; color:white; padding:16px 24px; text-align:center; border-top:4px solid #ea580c; }
    .clock .label { font-size:12px; opacity:.7; margin-bottom:4px; }
    .clock .time { font-size:32px; font-weight:700; font-family:'Courier New',monospace; letter-spacing:3px; }
    .clock .date { font-size:13px; opacity:.7; margin-top:4px; }
    .info { padding:24px; background:white; }
    .info-row { margin-bottom:12px; }
    .info-label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:600; }
    .info-value { font-size:18px; font-weight:700; color:#1e293b; margin-top:2px; }
    .info-value.mono { font-family:'Courier New',monospace; color:#ea580c; }
    .tip { background:white; border-radius:16px; border:2px solid white; box-shadow:0 10px 25px rgba(0,0,0,.15); padding:24px; margin-top:24px; text-align:center; }
    .tip h3 { font-size:16px; font-weight:700; color:#1e293b; margin-bottom:8px; }
    .tip p { font-size:13px; color:#475569; line-height:1.5; }
    .tip-box { background:#fff7ed; border:2px solid #fed7aa; border-radius:10px; padding:12px 16px; margin-top:12px; text-align:left; }
    .tip-box p { font-size:13px; color:#9a3412; margin:0; }
  </style>
  <script>
    function updateClock(){var n=new Date();var t=document.getElementById('clock-time');var d=document.getElementById('clock-date');if(t)t.textContent=n.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'});if(d)d.textContent=n.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
    setInterval(updateClock,1000);document.addEventListener('DOMContentLoaded',updateClock);
  </script>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <img src="${CLUB_LOGO}" alt="CD Bustarviejo">
        <h1>🎫 CARNET DE SOCIO</h1>
        <p>CD Bustarviejo</p>
      </div>
      <div class="status">
        ${statusIcon}
        <h2>${statusText}</h2>
        <p>${statusSubtext}</p>
      </div>
      <div class="clock">
        <div class="label">⏰ Hora actual (antifraude)</div>
        <div class="time" id="clock-time">--:--:--</div>
        <div class="date" id="clock-date">Cargando...</div>
      </div>
      <div class="info">
        <div class="info-row">
          <div class="info-label">Socio</div>
          <div class="info-value">${escapeHtml(member.nombre_completo)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Número de Socio</div>
          <div class="info-value mono">#${escapeHtml(numero)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Válido hasta</div>
          <div class="info-value" style="font-size:15px;">${escapeHtml(vencimientoText)}</div>
        </div>
      </div>
    </div>
    ${comerciosHTML}
    <div class="tip">
      <h3>🎫 Carnet Digital de Socio</h3>
      <p>Este carnet te identifica como <strong>socio oficial del CD Bustarviejo</strong> y te permite acceder a descuentos exclusivos en comercios colaboradores.</p>
      <div class="tip-box">
        <p><strong>💡 Consejo:</strong> Guarda este enlace en los favoritos de tu móvil para tenerlo siempre a mano.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}


Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ═══════════════════════════════════════════════
  // GET — Página HTML pública (sin auth de usuario)
  // Usa createClient con appId para leer datos
  // ═══════════════════════════════════════════════
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Enlace no válido</h1><p>Falta el token del carnet.</p></body></html>', {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    try {
      // Use createClientFromRequest — the platform DOES inject Base44-App-Id
      // on GET requests to backend functions hosted under the app domain.
      // We just need the entities, not user auth.
      const base44 = createClientFromRequest(req);
      
      const members = await base44.asServiceRole.entities.ClubMember.filter({ carnet_token: token });
      if (!members || members.length === 0) {
        return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Carnet no encontrado</h1><p>El enlace no es válido o ha expirado.</p></body></html>', {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      const member = members[0];
      const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      const seasonConfig = configs?.[0];

      if (!seasonConfig?.carnet_publico_activo) {
        return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Servicio no disponible</h1><p>El carnet digital público no está activado en este momento.</p></body></html>', {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      const html = renderCardHTML(member, seasonConfig);
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store' },
      });
    } catch (error) {
      console.error('Error rendering public card:', error);
      
      // Fallback: try using createClient with just appId
      try {
        console.log('Trying fallback with createClient...');
        const base44 = createClient({ appId: APP_ID });
        
        const members = await base44.entities.ClubMember.filter({ carnet_token: token });
        if (!members || members.length === 0) {
          return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Carnet no encontrado</h1></body></html>', {
            status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        const member = members[0];
        const configs = await base44.entities.SeasonConfig.filter({ activa: true });
        const seasonConfig = configs?.[0];
        
        if (!seasonConfig?.carnet_publico_activo) {
          return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Servicio no disponible</h1></body></html>', {
            status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        
        const html = renderCardHTML(member, seasonConfig);
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store' },
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Error</h1><p>No se pudo cargar el carnet. Inténtalo de nuevo.</p><p style="color:#999;font-size:12px;">${escapeHtml(error.message)}</p></body></html>`, {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }
  }

  // ═══════════════════════════════════════════════
  // POST — Acciones admin (con auth SDK)
  // ═══════════════════════════════════════════════
  if (req.method === 'POST') {
    const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    try {
      const base44 = createClientFromRequest(req);
      const body = await req.json();
      const { action, memberId } = body;

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

        // URL a la página React pública de la app
        const appBaseUrl = 'https://app.cdbustarviejo.com';
        const cardUrl = `${appBaseUrl}/PublicMemberCard?token=${carnetToken}`;

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; background: linear-gradient(135deg, #16a34a, #15803d); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎫 Tu Carnet de Socio Digital</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">CD Bustarviejo</p>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0;">
              <p style="font-size: 16px; color: #334155;">Hola <strong>${member.nombre_completo}</strong>,</p>
              <p style="color: #475569;">Tu carnet de socio digital del CD Bustarviejo ya está listo:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${cardUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  📱 Ver mi Carnet Digital
                </a>
              </div>
              <div style="background: #fff7ed; border: 2px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #9a3412;"><strong>💡 Consejo:</strong> Guarda este enlace en los favoritos de tu móvil para tenerlo siempre a mano.</p>
              </div>
              <p style="color: #64748b; font-size: 13px;">Enseña tu carnet digital en los comercios adheridos para obtener tus descuentos.</p>
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

        return Response.json({ success: true, emailResult, cardUrl }, { headers: jsonHeaders });
      }

      return Response.json({ error: 'Acción no válida' }, { status: 400, headers: jsonHeaders });
    } catch (error) {
      console.error('Error in publicMemberCard POST:', error);
      return Response.json({ error: error.message }, { status: 500, headers: jsonHeaders });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
});