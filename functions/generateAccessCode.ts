import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 3; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  code += '-';
  for (let i = 0; i < 3; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildEmailHTML(code, tipo, nombreDestino, appUrl, mensajePersonalizado) {
  const tipoLabels = {
    padre_nuevo: 'Invitación para Familias',
    segundo_progenitor: 'Invitación Segundo Progenitor',
    juvenil: 'Acceso Juvenil',
    jugador_adulto: 'Acceso Jugador +18'
  };

  const tipoDescriptions = {
    padre_nuevo: 'Has sido invitado a unirte a la aplicación del CD Bustarviejo para gestionar la inscripción y actividades de tus hijos.',
    segundo_progenitor: 'El primer progenitor te ha dado acceso a la aplicación del CD Bustarviejo para poder seguir las actividades de vuestros hijos.',
    juvenil: 'Tu padre/tutor te ha autorizado para acceder a la aplicación del CD Bustarviejo con tu propio perfil juvenil.',
    jugador_adulto: 'Has sido invitado a acceder a la aplicación del CD Bustarviejo como jugador.'
  };

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#ea580c,#16a34a);border-radius:20px 20px 0 0;padding:30px;text-align:center;">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" style="width:80px;height:80px;border-radius:16px;border:3px solid white;"/>
      <h1 style="color:white;margin:15px 0 5px;font-size:24px;">CD Bustarviejo</h1>
      <p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px;">${tipoLabels[tipo] || 'Invitación'}</p>
    </div>
    
    <div style="background:white;padding:30px;border-radius:0 0 20px 20px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
      ${nombreDestino ? `<p style="font-size:18px;color:#1e293b;">Hola <strong>${nombreDestino}</strong>,</p>` : '<p style="font-size:18px;color:#1e293b;">Hola,</p>'}
      
      <p style="color:#475569;line-height:1.6;">${tipoDescriptions[tipo]}</p>
      
      ${mensajePersonalizado ? `<div style="background:#f8fafc;border-left:4px solid #ea580c;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;"><p style="color:#475569;margin:0;font-style:italic;">${mensajePersonalizado}</p></div>` : ''}
      
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:16px;padding:24px;text-align:center;margin:24px 0;">
        <p style="color:#94a3b8;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Tu código de acceso</p>
        <p style="color:#f97316;font-size:36px;font-weight:900;margin:0;letter-spacing:6px;font-family:monospace;">${code}</p>
        <p style="color:#64748b;margin:8px 0 0;font-size:12px;">Válido durante 7 días</p>
      </div>
      
      <h3 style="color:#1e293b;margin:24px 0 12px;">📱 Cómo acceder:</h3>
      <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:20px;">
        <ol style="color:#166534;margin:0;padding-left:20px;line-height:2;">
          <li>Entra en <a href="${appUrl}" style="color:#ea580c;font-weight:bold;">${appUrl}</a></li>
          <li>Regístrate con tu email (<strong>usa este mismo email</strong>)</li>
          <li>Al entrar por primera vez, introduce el código: <strong style="color:#ea580c;">${code}</strong></li>
          <li>¡Listo! Ya tendrás acceso completo</li>
        </ol>
      </div>
      
      <h3 style="color:#1e293b;margin:24px 0 12px;">📲 Instala la App en tu móvil:</h3>
      <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;padding:20px;">
        <p style="color:#1e40af;margin:0 0 8px;font-weight:bold;">iPhone (Safari):</p>
        <p style="color:#3b82f6;margin:0 0 12px;">Abre en Safari → Pulsa Compartir (↑) → "Añadir a pantalla de inicio"</p>
        <p style="color:#1e40af;margin:0 0 8px;font-weight:bold;">Android (Chrome):</p>
        <p style="color:#3b82f6;margin:0;">Abre en Chrome → Menú (⋮) → "Instalar aplicación"</p>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#c2410c);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;">Acceder a la App →</a>
      </div>
      
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
        CD Bustarviejo • <a href="mailto:CDBUSTARVIEJO@GMAIL.COM" style="color:#ea580c;">CDBUSTARVIEJO@GMAIL.COM</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { email, tipo, nombre_destino, jugador_id, jugador_nombre, mensaje_personalizado, action } = body;

    // Padres pueden generar códigos de tipo segundo_progenitor y juvenil
    // Admins pueden generar cualquier tipo
    const isAdmin = user.role === 'admin';
    const allowedParentTypes = ['segundo_progenitor', 'juvenil'];
    
    if (!isAdmin && action !== 'resend') {
      if (!allowedParentTypes.includes(tipo)) {
        return Response.json({ error: 'No tienes permisos para generar este tipo de invitación' }, { status: 403 });
      }
    }

    // Action: resend - reenviar un código existente
    if (action === 'resend') {
      const { access_code_id } = body;
      
      // Solo admin o el creador original puede reenviar
      const codes = await base44.asServiceRole.entities.AccessCode.filter({ id: access_code_id });
      if (!codes || codes.length === 0) {
        return Response.json({ error: 'Código no encontrado' }, { status: 404 });
      }
      
      const existingCode = codes[0];
      
      if (!isAdmin && existingCode.invitado_por_email !== user.email) {
        return Response.json({ error: 'No tienes permisos para reenviar este código' }, { status: 403 });
      }
      
      // Si está expirado, generar nuevo código
      let codigo = existingCode.codigo;
      const now = new Date();
      const expDate = new Date(existingCode.fecha_expiracion);
      
      if (now > expDate || existingCode.estado === 'expirado') {
        codigo = generateCode();
        const existing = await base44.asServiceRole.entities.AccessCode.filter({ codigo });
        if (existing.length > 0) {
          codigo = generateCode();
        }
      }

      const nuevaExpiracion = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      await base44.asServiceRole.entities.AccessCode.update(existingCode.id, {
        codigo,
        estado: 'pendiente',
        fecha_expiracion: nuevaExpiracion.toISOString(),
        reenvios: (existingCode.reenvios || 0) + 1,
        ultimo_reenvio: now.toISOString()
      });

      const appUrl = 'https://app.cdbustarviejo.com';
      const emailHTML = buildEmailHTML(codigo, existingCode.tipo, existingCode.nombre_destino, appUrl, existingCode.mensaje_personalizado);
      
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: existingCode.email,
        subject: `🔑 CD Bustarviejo - Tu nuevo código de acceso: ${codigo}`,
        body: emailHTML,
        from_name: 'CD Bustarviejo'
      });

      return Response.json({ success: true, codigo, reenvio: true });
    }

    // Generate new code
    if (!email || !tipo) {
      return Response.json({ error: 'Email y tipo son obligatorios' }, { status: 400 });
    }

    // Verificar que no haya un código pendiente para este email y tipo
    const existingCodes = await base44.asServiceRole.entities.AccessCode.filter({ 
      email: email.toLowerCase().trim(),
      tipo,
      estado: 'pendiente'
    });
    
    if (existingCodes.length > 0) {
      const existing = existingCodes[0];
      const now = new Date();
      const expDate = new Date(existing.fecha_expiracion);
      
      if (now < expDate) {
        // Todavía válido, reenviar
        const appUrl = 'https://app.cdbustarviejo.com';
        const emailHTML = buildEmailHTML(existing.codigo, tipo, nombre_destino || existing.nombre_destino, appUrl, mensaje_personalizado);
        
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email.toLowerCase().trim(),
          subject: `🔑 CD Bustarviejo - Tu código de acceso: ${existing.codigo}`,
          body: emailHTML,
          from_name: 'CD Bustarviejo'
        });

        await base44.asServiceRole.entities.AccessCode.update(existing.id, {
          reenvios: (existing.reenvios || 0) + 1,
          ultimo_reenvio: now.toISOString(),
          email_enviado: true
        });

        return Response.json({ success: true, codigo: existing.codigo, reenvio: true, id: existing.id });
      }
    }

    // Generar nuevo código único
    let codigo = generateCode();
    const checkExisting = await base44.asServiceRole.entities.AccessCode.filter({ codigo });
    if (checkExisting.length > 0) {
      codigo = generateCode();
    }

    const now = new Date();
    const expiracion = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Determinar rol
    let rolAsignado = 'familia';
    if (tipo === 'juvenil') rolAsignado = 'jugador_menor';
    if (tipo === 'jugador_adulto') rolAsignado = 'jugador_adulto';
    if (tipo === 'segundo_progenitor') rolAsignado = 'familia';

    // Crear registro
    const accessCode = await base44.asServiceRole.entities.AccessCode.create({
      codigo,
      email: email.toLowerCase().trim(),
      tipo,
      estado: 'pendiente',
      nombre_destino: nombre_destino || '',
      jugador_id: jugador_id || '',
      jugador_nombre: jugador_nombre || '',
      invitado_por_email: user.email,
      invitado_por_nombre: user.full_name || user.email,
      fecha_envio: now.toISOString(),
      fecha_expiracion: expiracion.toISOString(),
      email_enviado: false,
      reenvios: 0,
      rol_asignado: rolAsignado,
      mensaje_personalizado: mensaje_personalizado || ''
    });

    // Enviar email
    const appUrl = 'https://app.cdbustarviejo.com';
    const emailHTML = buildEmailHTML(codigo, tipo, nombre_destino, appUrl, mensaje_personalizado);
    
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email.toLowerCase().trim(),
      subject: `🔑 CD Bustarviejo - Tu código de acceso: ${codigo}`,
      body: emailHTML,
      from_name: 'CD Bustarviejo'
    });

    await base44.asServiceRole.entities.AccessCode.update(accessCode.id, {
      email_enviado: true
    });

    return Response.json({ success: true, codigo, id: accessCode.id });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});