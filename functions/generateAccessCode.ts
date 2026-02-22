import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CD Bustarviejo <noreply@cdbustarviejo.com>';

async function sendWithResend(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('[generateAccessCode] Error Resend:', data);
    throw new Error(data.message || 'Error enviando email');
  }
  console.log('[generateAccessCode] ✅ Email enviado via Resend a:', to, 'ID:', data.id);
  return data;
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
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
    padre_nuevo: 'Has sido invitado/a a unirte a la app del <strong>CD Bustarviejo</strong> para gestionar la inscripción y actividades de tus hijos.',
    segundo_progenitor: 'El primer progenitor te ha dado acceso a la app del <strong>CD Bustarviejo</strong> para seguir las actividades de vuestros hijos.',
    juvenil: 'Tu padre/tutor te ha autorizado para acceder a la app del <strong>CD Bustarviejo</strong> con tu propio perfil juvenil.',
    jugador_adulto: 'Has sido invitado/a a acceder a la app del <strong>CD Bustarviejo</strong> como jugador.'
  };

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;">

<!-- Wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:24px 16px;">

<!-- Main card -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background-color:#ea580c;padding:32px 24px;text-align:center;border-radius:16px 16px 0 0;">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" style="width:600px" arcsize="3%" fillcolor="#ea580c" stroke="f"><v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0"><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom:16px;">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" width="72" height="72" style="display:block;border:3px solid #ffffff;border-radius:14px;" />
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:1px;">
          CD BUSTARVIEJO
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#fed7aa;padding-top:6px;letter-spacing:0.5px;">
          ${tipoLabels[tipo] || 'Invitación'}
        </td></tr>
      </table>
      <!--[if mso]></v:textbox></v:roundrect><![endif]-->
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background-color:#ffffff;padding:32px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        
        <!-- Saludo -->
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:17px;color:#1e293b;padding-bottom:12px;">
          ${nombreDestino ? `Hola <strong>${nombreDestino}</strong>,` : 'Hola,'}
        </td></tr>

        <!-- Descripción -->
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#475569;line-height:24px;padding-bottom:20px;">
          ${tipoDescriptions[tipo]}
        </td></tr>

        ${mensajePersonalizado ? `
        <!-- Mensaje personalizado -->
        <tr><td style="padding-bottom:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="4" style="background-color:#ea580c;border-radius:4px;"></td>
              <td style="background-color:#fef7f0;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#78350f;font-style:italic;line-height:22px;">
                ${mensajePersonalizado}
              </td>
            </tr>
          </table>
        </td></tr>` : ''}

        <!-- Código de acceso -->
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:12px;overflow:hidden;">
            <tr><td style="background-color:#1e293b;padding:28px 20px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;padding-bottom:10px;">
                  Tu código de acceso
                </td></tr>
                <tr><td align="center" style="font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:bold;color:#f97316;letter-spacing:8px;padding-bottom:10px;">
                  ${code}
                </td></tr>
                <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;">
                  Válido 7 días &bull; Vinculado a tu email
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Pasos -->
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#1e293b;padding-bottom:12px;">
          &#128241; Cómo acceder:
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #bbf7d0;border-radius:10px;overflow:hidden;">
            <tr><td style="background-color:#f0fdf4;padding:18px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#166534;line-height:28px;">
                  <strong>1.</strong> Pulsa el botón de abajo para abrir la app<br/>
                  <strong>2.</strong> Regístrate con <strong>este mismo email</strong><br/>
                  <strong>3.</strong> Introduce el código: <strong style="color:#ea580c;">${code}</strong><br/>
                  <strong>4.</strong> ¡Listo! Ya tendrás acceso completo
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Botón -->
        <tr><td align="center" style="padding-bottom:28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="border-radius:10px;background-color:#ea580c;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${appUrl}" style="height:50px;v-text-anchor:middle;width:260px;" arcsize="20%" fillcolor="#ea580c" stroke="f"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Abrir la App del Club</center></v:roundrect><![endif]-->
              <!--[if !mso]><!-->
              <a href="${appUrl}" target="_blank" style="display:inline-block;background-color:#ea580c;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:10px;">
                Abrir la App del Club &#8594;
              </a>
              <!--<![endif]-->
            </td></tr>
          </table>
        </td></tr>

        <!-- Instalar app -->
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#1e293b;padding-bottom:12px;">
          &#128242; Instala la app en tu móvil:
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #bfdbfe;border-radius:10px;overflow:hidden;">
            <tr><td style="background-color:#eff6ff;padding:16px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1e40af;font-weight:bold;padding-bottom:4px;">iPhone (Safari):</td></tr>
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3b82f6;padding-bottom:12px;">Abre en Safari &rarr; Compartir (&#8593;) &rarr; &quot;Añadir a pantalla de inicio&quot;</td></tr>
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1e40af;font-weight:bold;padding-bottom:4px;">Android (Chrome):</td></tr>
                <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3b82f6;">Abre en Chrome &rarr; Menú (&#8942;) &rarr; &quot;Instalar aplicación&quot;</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background-color:#f8fafc;padding:20px 28px;border-radius:0 0 16px 16px;border-top:1px solid #e2e8f0;text-align:center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;">
          CD Bustarviejo &bull; <a href="mailto:cdbustarviejo@gmail.com" style="color:#ea580c;text-decoration:none;">cdbustarviejo@gmail.com</a>
        </td></tr>
      </table>
    </td>
  </tr>

</table>
<!-- /Main card -->

</td></tr>
</table>
<!-- /Wrapper -->

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
      
      await sendWithResend(
        existingCode.email,
        `🔑 CD Bustarviejo - Tu nuevo código de acceso: ${codigo}`,
        emailHTML
      );

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
        
        await sendWithResend(
          email.toLowerCase().trim(),
          `🔑 CD Bustarviejo - Tu código de acceso: ${existing.codigo}`,
          emailHTML
        );

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
    
    await sendWithResend(
      email.toLowerCase().trim(),
      `🔑 CD Bustarviejo - Tu código de acceso: ${codigo}`,
      emailHTML
    );

    await base44.asServiceRole.entities.AccessCode.update(accessCode.id, {
      email_enviado: true
    });

    return Response.json({ success: true, codigo, id: accessCode.id });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});