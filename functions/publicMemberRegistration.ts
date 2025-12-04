import { createClient } from 'npm:@base44/sdk@0.8.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', message: 'API de registro de socios activa' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const base44 = createClient({
      appId: Deno.env.get("BASE44_APP_ID"),
      serviceRoleToken: Deno.env.get("BASE44_SERVICE_ROLE_TOKEN")
    });

    const data = await req.json();

    const requiredFields = ['nombre_completo', 'dni', 'telefono', 'email', 'direccion', 'municipio'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return new Response(JSON.stringify({ error: `Campo requerido: ${field}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const seasonConfigs = await base44.entities.SeasonConfig.list();
    const activeConfig = seasonConfigs.find(c => c.activa === true);
    const temporada = activeConfig?.temporada || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const allMembers = await base44.entities.ClubMember.list();
    const currentYear = new Date().getFullYear();
    const membersThisYear = allMembers.filter(m => m.numero_socio?.includes(`CDB-${currentYear}`));
    const nextNumber = membersThisYear.length + 1;
    const numeroSocio = `CDB-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    let justificanteUrl = data.justificante_url || "";
    let justificanteBase64 = "";
    
    if (data.justificante_base64) {
      justificanteBase64 = data.justificante_base64;
      justificanteUrl = "BASE64_ATTACHED";
    }

    const newMember = await base44.entities.ClubMember.create({
      numero_socio: numeroSocio,
      tipo_inscripcion: data.tipo_inscripcion || "Nueva Inscripción",
      nombre_completo: data.nombre_completo,
      dni: data.dni,
      telefono: data.telefono,
      email: data.email,
      direccion: data.direccion,
      municipio: data.municipio,
      metodo_pago: data.metodo_pago || "Transferencia",
      justificante_url: justificanteUrl,
      justificante_base64: justificanteBase64,
      es_segundo_progenitor: data.es_segundo_progenitor || false,
      es_socio_externo: true,
      referido_por: data.referido_por || "",
      referido_por_email: data.referido_por_email || "",
      cuota_socio: 25,
      estado_pago: (justificanteUrl || justificanteBase64) ? "En revisión" : "Pendiente",
      temporada: temporada,
      activo: true
    });

    const clubLogoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
    
    const cardEmailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%);">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; padding: 30px 20px; color: white;">
      <h1 style="margin: 0 0 10px 0; font-size: 28px;">🎉 ¡Bienvenido/a a la familia!</h1>
      <p style="margin: 0; font-size: 16px;">Gracias por ser parte del CD Bustarviejo</p>
    </div>
    <div style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div style="background: linear-gradient(135deg, #f97316 0%, #16a34a 100%); padding: 25px; text-align: center;">
        <img src="${clubLogoUrl}" alt="CD Bustarviejo" style="width: 80px; height: 80px; border-radius: 50%; border: 4px solid white;">
        <h2 style="margin: 15px 0 5px 0; color: white; font-size: 22px;">CD BUSTARVIEJO</h2>
        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 13px;">Desde 1980 · Pasión por el deporte base</p>
      </div>
      <div style="background: #1e293b; padding: 20px; text-align: center;">
        <p style="margin: 0 0 5px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Número de Socio</p>
        <p style="margin: 0; color: #f97316; font-size: 32px; font-weight: bold; font-family: monospace;">${numeroSocio}</p>
      </div>
      <div style="padding: 25px;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
          <p style="margin: 0 0 5px 0; color: #64748b; font-size: 11px; text-transform: uppercase;">Nombre completo</p>
          <p style="margin: 0; color: #1e293b; font-size: 20px; font-weight: bold;">${data.nombre_completo}</p>
        </div>
      </div>
      <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 2px dashed #cbd5e1;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">⚽ Fútbol · 🏀 Baloncesto · 💪 Pasión</p>
      </div>
    </div>
    <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7); font-size: 12px;">
      <p style="margin: 0;">📧 cdbustarviejo@gmail.com</p>
    </div>
  </div>
</body>
</html>`;

    await base44.integrations.Core.SendEmail({
      to: data.email,
      subject: `🎉 ¡Bienvenido/a al CD Bustarviejo! Tu carnet de socio ${numeroSocio}`,
      body: cardEmailHtml
    });

    await base44.integrations.Core.SendEmail({
      to: "cdbustarviejo@gmail.com",
      subject: `🎉 Nueva solicitud de socio (EXTERNO): ${data.nombre_completo}`,
      body: `Nueva solicitud de socio desde landing page externa:\n\nNombre: ${data.nombre_completo}\nDNI: ${data.dni}\nEmail: ${data.email}\nTeléfono: ${data.telefono}\nDirección: ${data.direccion}\nMunicipio: ${data.municipio}\n\nAccede al panel de administración para gestionar.`
    });

    if (data.referido_por_email && activeConfig?.programa_referidos_activo) {
      try {
        const allUsers = await base44.entities.User.list();
        const referrer = allUsers.find(u => u.email?.toLowerCase() === data.referido_por_email.toLowerCase());
        
        if (referrer) {
          await base44.entities.ReferralReward.create({
            referrer_email: referrer.email,
            referrer_name: referrer.full_name,
            referred_member_id: newMember.id,
            referred_member_name: data.nombre_completo,
            temporada: temporada,
            clothing_credit_earned: activeConfig.referidos_premio_1 || 5
          });

          const newCount = (referrer.referrals_count || 0) + 1;
          let newCredit = (referrer.clothing_credit_balance || 0) + (activeConfig.referidos_premio_1 || 5);
          let newRaffles = referrer.raffle_entries_total || 0;

          if (newCount === 3) {
            newCredit += (activeConfig.referidos_premio_3 || 15) - (activeConfig.referidos_premio_1 || 5);
            newRaffles += activeConfig.referidos_sorteo_3 || 1;
          } else if (newCount === 5) {
            newCredit += (activeConfig.referidos_premio_5 || 25) - (activeConfig.referidos_premio_3 || 15);
            newRaffles += (activeConfig.referidos_sorteo_5 || 3) - (activeConfig.referidos_sorteo_3 || 1);
          } else if (newCount === 10) {
            newCredit += (activeConfig.referidos_premio_10 || 50) - (activeConfig.referidos_premio_5 || 25);
            newRaffles += (activeConfig.referidos_sorteo_10 || 5) - (activeConfig.referidos_sorteo_5 || 3);
          } else if (newCount === 15) {
            newCredit += (activeConfig.referidos_premio_15 || 50) - (activeConfig.referidos_premio_10 || 50);
            newRaffles += (activeConfig.referidos_sorteo_15 || 10) - (activeConfig.referidos_sorteo_10 || 5);
          }

          await base44.entities.User.update(referrer.id, {
            referrals_count: newCount,
            clothing_credit_balance: newCredit,
            raffle_entries_total: newRaffles
          });
        }
      } catch (refError) {
        console.error("Error processing referral:", refError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: '¡Registro completado!',
      numero_socio: numeroSocio 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});