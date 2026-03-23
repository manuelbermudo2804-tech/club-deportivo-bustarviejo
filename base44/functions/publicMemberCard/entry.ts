import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only POST is supported — all calls come from the React frontend
  // which automatically includes the platform headers
  if (req.method !== 'POST') {
    return Response.json({ error: 'Use la página /PublicMemberCard de la app' }, { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token: bodyToken, memberId } = body;

    // ACTION: get — fetch member card data as JSON (para app React pública)
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

      // URL a la página React pública (NO al backend)
      // La app publicada está en el dominio principal
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

      return Response.json({ success: true, emailResult, cardUrl }, { headers: jsonHeaders });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400, headers: jsonHeaders });

  } catch (error) {
    console.error('Error in publicMemberCard POST:', error);
    return Response.json({ error: error.message }, { status: 500, headers: jsonHeaders });
  }
});