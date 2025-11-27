import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Función pública para registrar nuevos socios desde landing page externa
Deno.serve(async (req) => {
  // Permitir CORS para la landing page externa
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const data = await req.json();

    // Validar campos requeridos
    const requiredFields = ['nombre_completo', 'dni', 'telefono', 'email', 'direccion', 'municipio'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return new Response(JSON.stringify({ error: `Campo requerido: ${field}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Obtener configuración de temporada activa
    const seasonConfigs = await base44.asServiceRole.entities.SeasonConfig.list();
    const activeConfig = seasonConfigs.find(c => c.activa === true);
    const temporada = activeConfig?.temporada || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    // Generar número de socio único
    const allMembers = await base44.asServiceRole.entities.ClubMember.list();
    const currentYear = new Date().getFullYear();
    const membersThisYear = allMembers.filter(m => m.numero_socio?.includes(`CDB-${currentYear}`));
    const nextNumber = membersThisYear.length + 1;
    const numeroSocio = `CDB-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    // Crear el nuevo socio
    const newMember = await base44.asServiceRole.entities.ClubMember.create({
      numero_socio: numeroSocio,
      tipo_inscripcion: data.tipo_inscripcion || "Nueva Inscripción",
      nombre_completo: data.nombre_completo,
      dni: data.dni,
      telefono: data.telefono,
      email: data.email,
      direccion: data.direccion,
      municipio: data.municipio,
      metodo_pago: data.metodo_pago || "Transferencia",
      justificante_url: data.justificante_url || "",
      es_segundo_progenitor: data.es_segundo_progenitor || false,
      es_socio_externo: true,
      referido_por: data.referido_por || "",
      referido_por_email: data.referido_por_email || "",
      cuota_socio: 25,
      estado_pago: data.justificante_url ? "En revisión" : "Pendiente",
      temporada: temporada,
      activo: true
    });

    // Enviar carnet virtual por email
    const clubLogoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
    
    const cardEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carnet de Socio - CD Bustarviejo</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%); min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; padding: 30px 20px; color: white;">
      <h1 style="margin: 0 0 10px 0; font-size: 28px;">🎉 ¡Bienvenido/a a la familia!</h1>
      <p style="margin: 0; font-size: 16px; opacity: 0.9;">Gracias por ser parte del CD Bustarviejo</p>
    </div>
    <div style="background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div style="background: linear-gradient(135deg, #f97316 0%, #16a34a 100%); padding: 25px; text-align: center; position: relative;">
        <div style="position: absolute; top: 10px; left: 15px; background: white; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; color: #f97316;">SOCIO OFICIAL</div>
        <img src="${clubLogoUrl}" alt="CD Bustarviejo" style="width: 80px; height: 80px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); object-fit: cover;">
        <h2 style="margin: 15px 0 5px 0; color: white; font-size: 22px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">CD BUSTARVIEJO</h2>
        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 13px;">Desde 1980 · Pasión por el deporte base</p>
      </div>
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 20px; text-align: center;">
        <p style="margin: 0 0 5px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Número de Socio</p>
        <p style="margin: 0; color: #f97316; font-size: 32px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 3px;">${numeroSocio}</p>
      </div>
      <div style="padding: 25px;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
          <p style="margin: 0 0 5px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Nombre completo</p>
          <p style="margin: 0; color: #1e293b; font-size: 20px; font-weight: bold;">${data.nombre_completo}</p>
        </div>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 15px;">
            <p style="margin: 0 0 5px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">DNI</p>
            <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 600;">${data.dni}</p>
          </div>
          <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 15px;">
            <p style="margin: 0 0 5px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Temporada</p>
            <p style="margin: 0; color: #16a34a; font-size: 16px; font-weight: 600;">${temporada}</p>
          </div>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; text-align: center; border-top: 2px dashed #cbd5e1;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">⚽ Fútbol · 🏀 Baloncesto · 💪 Pasión</p>
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">Este carnet es válido para la temporada ${temporada}</p>
      </div>
    </div>
    <div style="text-align: center; padding: 30px 20px; color: white;">
      <div style="background: rgba(255,255,255,0.1); border-radius: 15px; padding: 25px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; font-size: 20px;">💚 Tu apoyo hace posible los sueños</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; opacity: 0.9;">Gracias a socios como tú, más de <strong>200 niños y niñas</strong> de Bustarviejo pueden disfrutar del deporte cada semana.</p>
      </div>
    </div>
    <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7); font-size: 12px;">
      <p style="margin: 0 0 5px 0;">📧 cdbustarviejo@gmail.com</p>
      <p style="margin: 0;">📍 Bustarviejo, Madrid</p>
    </div>
  </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: data.email,
      subject: `🎉 ¡Bienvenido/a al CD Bustarviejo! Tu carnet de socio ${numeroSocio}`,
      body: cardEmailHtml
    });

    // Notificar al admin
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: "cdbustarviejo@gmail.com",
      subject: `🎉 Nueva solicitud de socio (EXTERNO): ${data.nombre_completo}`,
      body: `Se ha recibido una nueva solicitud de socio desde la landing page externa:\n\nNombre: ${data.nombre_completo}\nDNI: ${data.dni}\nEmail: ${data.email}\nTeléfono: ${data.telefono}\nDirección: ${data.direccion}\nMunicipio: ${data.municipio}\nMétodo de pago: Transferencia\nTipo: ${data.tipo_inscripcion}\nEs segundo progenitor: ${data.es_segundo_progenitor ? "Sí" : "No"}${data.referido_por ? `\nReferido por: ${data.referido_por}` : ""}\n\n📎 JUSTIFICANTE DE PAGO:\n${data.justificante_url ? data.justificante_url : "⚠️ No se adjuntó justificante"}\n\nAccede al panel de administración para gestionar.`
    });

    // Si tiene referido, procesar el programa de referidos
    if (data.referido_por_email && activeConfig?.programa_referidos_activo) {
      try {
        const allUsers = await base44.asServiceRole.entities.User.list();
        const referrer = allUsers.find(u => u.email?.toLowerCase() === data.referido_por_email.toLowerCase());
        
        if (referrer) {
          // Registrar la referencia
          await base44.asServiceRole.entities.ReferralReward.create({
            referrer_email: referrer.email,
            referrer_name: referrer.full_name,
            referred_member_id: newMember.id,
            referred_member_name: data.nombre_completo,
            temporada: temporada,
            clothing_credit_earned: activeConfig.referidos_premio_1 || 5
          });

          // Actualizar contador del usuario
          const newCount = (referrer.referrals_count || 0) + 1;
          let newCredit = (referrer.clothing_credit_balance || 0) + (activeConfig.referidos_premio_1 || 5);
          let newRaffles = referrer.raffle_entries_total || 0;

          // Calcular bonificaciones por niveles
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

          await base44.asServiceRole.entities.User.update(referrer.id, {
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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});