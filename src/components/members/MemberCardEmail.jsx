import React from "react";

// Componente que genera el HTML del carnet virtual para enviar por email
export function generateMemberCardHTML(member, seasonConfig) {
  const clubLogoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carnet de Socio - CD Bustarviejo</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%); min-height: 100vh;">
  
  <div style="max-width: 600px; margin: 0 auto;">
    
    <!-- Mensaje de bienvenida -->
    <div style="text-align: center; padding: 30px 20px; color: white;">
      <h1 style="margin: 0 0 10px 0; font-size: 28px;">🎉 ¡Bienvenido/a a la familia!</h1>
      <p style="margin: 0; font-size: 16px; opacity: 0.9;">Gracias por ser parte del CD Bustarviejo</p>
    </div>

    <!-- Carnet Virtual -->
    <div style="background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      
      <!-- Header del carnet -->
      <div style="background: linear-gradient(135deg, #f97316 0%, #16a34a 100%); padding: 25px; text-align: center; position: relative;">
        <div style="position: absolute; top: 10px; left: 15px; background: white; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; color: #f97316;">
          SOCIO OFICIAL
        </div>
        <img src="${clubLogoUrl}" alt="CD Bustarviejo" style="width: 80px; height: 80px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); object-fit: cover;">
        <h2 style="margin: 15px 0 5px 0; color: white; font-size: 22px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">CD BUSTARVIEJO</h2>
        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 13px;">Desde 1980 · Pasión por el deporte base</p>
      </div>

      <!-- Número de socio destacado -->
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 20px; text-align: center;">
        <p style="margin: 0 0 5px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Número de Socio</p>
        <p style="margin: 0; color: #f97316; font-size: 32px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 3px;">${member.numero_socio || 'CDB-0000'}</p>
      </div>

      <!-- Datos del socio -->
      <div style="padding: 25px;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
          <p style="margin: 0 0 5px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Nombre completo</p>
          <p style="margin: 0; color: #1e293b; font-size: 20px; font-weight: bold;">${member.nombre_completo}</p>
        </div>
        
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 15px;">
            <p style="margin: 0 0 5px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">DNI</p>
            <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 600;">${member.dni}</p>
          </div>
          <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 15px;">
            <p style="margin: 0 0 5px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Temporada</p>
            <p style="margin: 0; color: #16a34a; font-size: 16px; font-weight: 600;">${member.temporada}</p>
          </div>
        </div>
      </div>

      <!-- Footer del carnet -->
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; text-align: center; border-top: 2px dashed #cbd5e1;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">
          ⚽ Fútbol · 🏀 Baloncesto · 💪 Pasión
        </p>
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">
          Este carnet es válido para la temporada ${member.temporada}
        </p>
      </div>
    </div>

    <!-- Mensaje emotivo -->
    <div style="text-align: center; padding: 30px 20px; color: white;">
      <div style="background: rgba(255,255,255,0.1); border-radius: 15px; padding: 25px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; font-size: 20px;">💚 Tu apoyo hace posible los sueños</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; opacity: 0.9;">
          Gracias a socios como tú, más de <strong>200 niños y niñas</strong> de Bustarviejo pueden disfrutar del deporte cada semana. 
          Tu contribución no es solo económica, es un voto de confianza en el futuro de nuestra comunidad.
        </p>
      </div>
      
      <div style="background: rgba(249,115,22,0.2); border: 1px solid rgba(249,115,22,0.3); border-radius: 15px; padding: 20px;">
        <p style="margin: 0 0 10px 0; font-size: 16px;">📅 Desde 1980 formando deportistas y personas</p>
        <p style="margin: 0; font-size: 13px; opacity: 0.8;">
          Más de 40 años de historia, cientos de jugadores formados, y una comunidad que sigue creciendo gracias a ti.
        </p>
      </div>
    </div>

    <!-- Información de contacto -->
    <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7); font-size: 12px;">
      <p style="margin: 0 0 5px 0;">📧 cdbustarviejo@gmail.com</p>
      <p style="margin: 0;">📍 Bustarviejo, Madrid</p>
    </div>

  </div>
</body>
</html>
  `;
}

// Función para enviar el carnet por email
export async function sendMemberCard(member, seasonConfig, base44) {
  if (!member.email) {
    console.error('[MemberCardEmail] No hay email para el socio:', member.nombre_completo);
    throw new Error('El socio no tiene email');
  }
  
  console.log('[MemberCardEmail] Enviando carnet a:', member.email, 'Socio:', member.nombre_completo);
  
  const htmlContent = generateMemberCardHTML(member, seasonConfig);
  
  try {
    await base44.integrations.Core.SendEmail({
      from_name: "CD Bustarviejo",
      to: member.email,
      subject: `🎉 ¡Bienvenido/a al CD Bustarviejo! Tu carnet de socio ${member.numero_socio || ''}`,
      body: htmlContent
    });
    console.log('[MemberCardEmail] ✅ Email enviado correctamente a:', member.email);
  } catch (error) {
    console.error('[MemberCardEmail] ❌ Error enviando email a:', member.email, error);
    throw error;
  }
}

export default function MemberCardPreview({ member }) {
  const clubLogoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl">
      <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-sm mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-green-600 p-6 text-center relative">
          <span className="absolute top-2 left-3 bg-white text-orange-600 text-xs font-bold px-2 py-1 rounded-full">
            SOCIO OFICIAL
          </span>
          <img 
            src={clubLogoUrl} 
            alt="CD Bustarviejo" 
            className="w-16 h-16 rounded-full border-4 border-white shadow-lg mx-auto object-cover"
          />
          <h3 className="text-white font-bold text-lg mt-3">CD BUSTARVIEJO</h3>
          <p className="text-white/80 text-xs">Desde 1980 · Pasión por el deporte base</p>
        </div>

        {/* Número de socio */}
        <div className="bg-slate-900 p-4 text-center">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Número de Socio</p>
          <p className="text-orange-500 text-2xl font-bold font-mono tracking-widest">
            {member?.numero_socio || 'CDB-0000'}
          </p>
        </div>

        {/* Datos */}
        <div className="p-4 space-y-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-slate-500 text-xs uppercase">Nombre</p>
            <p className="text-slate-900 font-bold">{member?.nombre_completo || 'Nombre del Socio'}</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-50 rounded-lg p-3">
              <p className="text-slate-500 text-xs uppercase">DNI</p>
              <p className="text-slate-900 font-semibold text-sm">{member?.dni || '00000000A'}</p>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg p-3">
              <p className="text-slate-500 text-xs uppercase">Temporada</p>
              <p className="text-green-600 font-semibold text-sm">{member?.temporada || '2024/2025'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-3 text-center border-t-2 border-dashed border-slate-300">
          <p className="text-slate-500 text-xs">⚽ Fútbol · 🏀 Baloncesto · 💪 Pasión</p>
        </div>
      </div>
    </div>
  );
}