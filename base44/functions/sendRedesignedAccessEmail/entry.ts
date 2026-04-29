// Endpoint TEMPORAL de prueba — envía un correo con el NUEVO diseño rediseñado
// para que el admin pueda comparar con el actual antes de aplicarlo al de producción.
// Una vez aprobado el diseño, se moverá el HTML al archivo generateAccessCode.js
// y este archivo se podrá eliminar.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    console.error('[sendRedesignedAccessEmail] Error Resend:', data);
    throw new Error(data.message || 'Error enviando email');
  }
  return data;
}

function buildRedesignedHTML(code, tipo, nombreDestino, mensajePersonalizado, jugadorNombre) {
  const tipoLabels = {
    padre_nuevo: 'Bienvenido a la Familia del Club',
    segundo_progenitor: 'Acceso para Segundo Progenitor',
    juvenil: 'Tu Acceso Juvenil',
    jugador_adulto: 'Bienvenido Jugador',
    entrenador: 'Bienvenido Entrenador',
    coordinador: 'Bienvenido Coordinador'
  };

  const tipoDescriptions = {
    padre_nuevo: `Te damos la bienvenida a la <strong>app oficial del CD Bustarviejo</strong>. Desde aquí podrás gestionar todo lo relacionado con la actividad deportiva de tus hijos.`,
    segundo_progenitor: `El otro progenitor te ha dado acceso a la <strong>app del CD Bustarviejo</strong>${jugadorNombre ? ` (jugador/a: <strong>${jugadorNombre}</strong>)` : ''} para que ambos podáis seguir las actividades.`,
    juvenil: `Tu padre/madre/tutor te ha autorizado para que tengas <strong>tu propio acceso</strong> a la app${jugadorNombre ? ` como jugador/a de <strong>${jugadorNombre}</strong>` : ''}. ¡Ya puedes ver tus convocatorias!`,
    jugador_adulto: `Has sido invitado/a a la <strong>app oficial del CD Bustarviejo</strong>${jugadorNombre ? ` (<strong>${jugadorNombre}</strong>)` : ''}. Gestiona convocatorias, pagos y comunícate con el equipo.`,
    entrenador: `Te damos la bienvenida al equipo técnico como <strong>Entrenador</strong>. Gestiona convocatorias, asistencia, evaluaciones y comunícate con familias.`,
    coordinador: `Te damos la bienvenida al equipo técnico como <strong>Coordinador</strong>. Supervisa categorías, plantillas, asistencia y comunicación.`
  };

  const featuresByType = {
    padre_nuevo: [
      { icon: '📋', text: 'Inscripciones y renovaciones digitales' },
      { icon: '💳', text: 'Pagos y estado de cuotas' },
      { icon: '📅', text: 'Convocatorias y asistencia a partidos' },
      { icon: '💬', text: 'Chat con entrenadores y coordinadores' },
      { icon: '📆', text: 'Calendario de entrenamientos y eventos' },
      { icon: '🏆', text: 'Clasificaciones y resultados en directo' },
      { icon: '🖊️', text: 'Firma de documentos federativos' },
      { icon: '🛍️', text: 'Tienda de equipación del club' }
    ],
    segundo_progenitor: [
      { icon: '📅', text: 'Convocatorias y asistencia' },
      { icon: '💳', text: 'Estado de cuotas y pagos' },
      { icon: '💬', text: 'Chat con el club' },
      { icon: '📆', text: 'Calendario y horarios' },
      { icon: '🏆', text: 'Clasificaciones y resultados' },
      { icon: '📄', text: 'Documentos y notificaciones' }
    ],
    juvenil: [
      { icon: '📅', text: 'Tus convocatorias' },
      { icon: '📆', text: 'Tus horarios de entreno' },
      { icon: '🏆', text: 'Clasificaciones de tu equipo' },
      { icon: '⭐', text: 'Tu progreso como jugador' },
      { icon: '✉️', text: 'Buzón con la coordinación' },
      { icon: '🖼️', text: 'Galería de fotos' }
    ],
    jugador_adulto: [
      { icon: '📅', text: 'Convocatorias y asistencia' },
      { icon: '💳', text: 'Cuotas y pagos' },
      { icon: '💬', text: 'Chat con el club' },
      { icon: '📆', text: 'Calendario' },
      { icon: '🏆', text: 'Clasificaciones y goleadores' },
      { icon: '🖊️', text: 'Firmas federativas' }
    ],
    entrenador: [
      { icon: '📋', text: 'Crear convocatorias' },
      { icon: '✅', text: 'Pasar asistencia y evaluar' },
      { icon: '💬', text: 'Chat con familias' },
      { icon: '📚', text: 'Biblioteca de ejercicios' },
      { icon: '🎯', text: 'Pizarra táctica' },
      { icon: '📊', text: 'Estadísticas de jugadores' }
    ],
    coordinador: [
      { icon: '📋', text: 'Supervisar categorías' },
      { icon: '💬', text: 'Chat con familias y entrenadores' },
      { icon: '✅', text: 'Asistencia y evaluaciones' },
      { icon: '🏆', text: 'Resultados y clasificaciones' },
      { icon: '📊', text: 'Informes de rendimiento' },
      { icon: '🖊️', text: 'Gestión de firmas' }
    ]
  };

  const features = featuresByType[tipo] || featuresByType.padre_nuevo;
  const featuresHTML = features.map(f => `
    <tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#475569;line-height:22px;">
      <span style="display:inline-block;width:24px;font-size:16px;">${f.icon}</span>${f.text}
    </td></tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CD Bustarviejo</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;">
<tr><td align="center" style="padding:32px 16px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">

  <!-- HEADER limpio -->
  <tr>
    <td style="background:linear-gradient(135deg,#ea580c 0%,#dc2626 100%);padding:40px 32px 32px;text-align:center;">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" width="72" height="72" style="display:inline-block;border:3px solid #ffffff;border-radius:18px;margin-bottom:16px;" />
      <div style="font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.5px;line-height:28px;">
        CD Bustarviejo
      </div>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.85);margin-top:6px;letter-spacing:0.5px;">
        ${tipoLabels[tipo] || 'Invitación al club'}
      </div>
    </td>
  </tr>

  <!-- SALUDO -->
  <tr>
    <td style="padding:36px 32px 8px;">
      <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#0f172a;line-height:30px;">
        ${nombreDestino ? `¡Hola ${nombreDestino}! 👋` : '¡Hola! 👋'}
      </div>
    </td>
  </tr>

  <!-- DESCRIPCIÓN -->
  <tr>
    <td style="padding:8px 32px 24px;">
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#475569;line-height:24px;">
        ${tipoDescriptions[tipo]}
      </div>
    </td>
  </tr>

  ${mensajePersonalizado ? `
  <tr><td style="padding:0 32px 24px;">
    <div style="background-color:#fff7ed;border-left:4px solid #ea580c;padding:14px 18px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;color:#7c2d12;font-style:italic;line-height:22px;">
      &ldquo;${mensajePersonalizado}&rdquo;
    </div>
  </td></tr>` : ''}

  <!-- ⭐ CÓDIGO DESTACADO ARRIBA — lo más importante -->
  <tr>
    <td style="padding:0 32px 32px;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:16px;padding:28px 20px;text-align:center;">
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:2.5px;margin-bottom:12px;">
          Tu código de acceso
        </div>
        <div style="font-family:'SF Mono','Monaco','Courier New',monospace;font-size:38px;font-weight:700;color:#fb923c;letter-spacing:8px;margin-bottom:10px;">
          ${code}
        </div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748b;">
          Válido 7 días · Vinculado a tu email
        </div>
      </div>
    </td>
  </tr>

  <!-- AVISO CLAVE: Email -->
  <tr>
    <td style="padding:0 32px 28px;">
      <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;">
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#78350f;line-height:20px;">
          <strong>⚠️ Importante:</strong> Regístrate con <strong>este mismo email</strong> al que ha llegado el correo. Con cualquier otro, el código no funcionará.
        </div>
      </div>
    </td>
  </tr>

  <!-- SEPARADOR -->
  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>

  <!-- PASOS — diseño limpio y secuencial -->
  <tr>
    <td style="padding:32px 32px 8px;">
      <div style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#0f172a;margin-bottom:4px;">
        Cómo empezar en 2 pasos
      </div>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:#64748b;">
        Tarda menos de 2 minutos
      </div>
    </td>
  </tr>

  <!-- PASO 1: INSTALAR -->
  <tr>
    <td style="padding:24px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="44" valign="top">
            <div style="width:36px;height:36px;background-color:#ea580c;color:#ffffff;border-radius:50%;text-align:center;line-height:36px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;">1</div>
          </td>
          <td valign="top" style="padding-left:4px;">
            <div style="font-family:Arial,sans-serif;font-size:17px;font-weight:700;color:#0f172a;margin-bottom:4px;">
              Instala la app en tu móvil
            </div>
            <div style="font-family:Arial,sans-serif;font-size:14px;color:#64748b;line-height:22px;">
              Funciona como WhatsApp: tendrás un icono propio en tu pantalla de inicio.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- BOTÓN ANDROID -->
  <tr>
    <td style="padding:20px 32px 0;">
      <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px;">
        <div style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#166534;margin-bottom:10px;">
          📱 Android (Samsung, Xiaomi, etc.)
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding:6px 0 12px;">
            <a href="https://app.cdbustarviejo.com" target="_blank" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">
              Instalar la app
            </a>
          </td></tr>
        </table>
        <div style="background-color:#ffffff;border-radius:8px;padding:12px 14px;font-family:Arial,sans-serif;font-size:12px;color:#166534;line-height:20px;">
          <strong>⚠️ MUY IMPORTANTE — usa Google Chrome</strong><br/>
          Si tienes un Samsung, NO uses el navegador de Samsung (Samsung Internet) — solo crea un acceso directo gris que no funciona bien. Abre <strong>Chrome</strong> y desde ahí pulsa el botón verde de arriba.
        </div>
        <div style="margin-top:10px;background-color:#ffffff;border-radius:8px;padding:12px 14px;font-family:Arial,sans-serif;font-size:12px;color:#475569;line-height:20px;">
          <strong>¿No te aparece el instalador?</strong><br/>
          En Chrome: pulsa los <strong>3 puntos (⋮)</strong> arriba a la derecha → <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.
        </div>
      </div>
    </td>
  </tr>

  <!-- BOTÓN iPhone -->
  <tr>
    <td style="padding:12px 32px 0;">
      <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:18px;">
        <div style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#1e40af;margin-bottom:10px;">
          🍎 iPhone / iPad
        </div>
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#1e3a5f;line-height:22px;margin-bottom:12px;">
          Abre <strong>Safari</strong> (no Chrome) y entra en:
        </div>
        <div style="background-color:#0f172a;border-radius:8px;padding:12px;text-align:center;margin-bottom:14px;">
          <span style="font-family:'SF Mono','Courier New',monospace;font-size:16px;font-weight:700;color:#fb923c;letter-spacing:1px;">
            app.cdbustarviejo.com
          </span>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:4px 0;font-family:Arial,sans-serif;font-size:13px;color:#1e3a5f;line-height:22px;">
            <strong style="color:#1e40af;">1.</strong> Pulsa el botón <strong>Compartir</strong> (cuadrado con ↑) abajo
          </td></tr>
          <tr><td style="padding:4px 0;font-family:Arial,sans-serif;font-size:13px;color:#1e3a5f;line-height:22px;">
            <strong style="color:#1e40af;">2.</strong> Desliza y pulsa <strong>"Añadir a pantalla de inicio"</strong>
          </td></tr>
          <tr><td style="padding:4px 0;font-family:Arial,sans-serif;font-size:13px;color:#1e3a5f;line-height:22px;">
            <strong style="color:#1e40af;">3.</strong> Pulsa <strong>"Añadir"</strong> arriba a la derecha
          </td></tr>
        </table>
      </div>
    </td>
  </tr>

  <!-- PASO 2: CÓDIGO -->
  <tr>
    <td style="padding:32px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="44" valign="top">
            <div style="width:36px;height:36px;background-color:#ea580c;color:#ffffff;border-radius:50%;text-align:center;line-height:36px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;">2</div>
          </td>
          <td valign="top" style="padding-left:4px;">
            <div style="font-family:Arial,sans-serif;font-size:17px;font-weight:700;color:#0f172a;margin-bottom:4px;">
              Crea tu cuenta y mete el código
            </div>
            <div style="font-family:Arial,sans-serif;font-size:14px;color:#64748b;line-height:22px;">
              Abre el icono recién instalado, pulsa "Crear cuenta", regístrate con <strong>este email</strong> y mete el código que ves arriba.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- TROUBLESHOOTING — icono gris con C -->
  <tr>
    <td style="padding:36px 32px 0;">
      <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:18px;">
        <div style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#991b1b;margin-bottom:10px;">
          🔧 ¿Te sale un icono gris con una "C" o algo raro?
        </div>
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#7f1d1d;line-height:21px;">
          Significa que ya tenías una versión antigua instalada (probablemente desde Samsung Internet u otro navegador). Soluciónalo así:
        </div>
        <ol style="font-family:Arial,sans-serif;font-size:13px;color:#7f1d1d;line-height:21px;padding-left:18px;margin:10px 0 0;">
          <li style="margin-bottom:4px;">Mantén pulsado el icono raro en la pantalla de inicio → <strong>Eliminar / Desinstalar</strong></li>
          <li style="margin-bottom:4px;">Ve a Ajustes → Aplicaciones → busca "CD Bustarviejo" si aparece → <strong>Desinstalar</strong></li>
          <li>Abre <strong>Chrome</strong> (no Samsung Internet) y vuelve a pulsar el botón verde de arriba</li>
        </ol>
      </div>
    </td>
  </tr>

  <!-- SEPARADOR -->
  <tr><td style="padding:36px 32px 0;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>

  <!-- FEATURES -->
  <tr>
    <td style="padding:28px 32px 0;">
      <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#0f172a;margin-bottom:14px;">
        ✨ Qué podrás hacer
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${featuresHTML}
      </table>
    </td>
  </tr>

  <!-- ACCESO WEB -->
  <tr>
    <td style="padding:28px 32px 32px;">
      <div style="background-color:#f1f5f9;border-radius:10px;padding:14px 18px;font-family:Arial,sans-serif;font-size:13px;color:#475569;line-height:20px;">
        💻 <strong>¿Prefieres entrar desde el ordenador?</strong> Visita <a href="https://www.cdbustarviejo.com" target="_blank" style="color:#ea580c;font-weight:600;text-decoration:none;">www.cdbustarviejo.com</a> → Área Interna
      </div>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background-color:#0f172a;padding:24px;text-align:center;">
      <div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#ffffff;margin-bottom:4px;">
        CD Bustarviejo
      </div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;margin-bottom:12px;">
        Fútbol · Baloncesto · Desde 1950
      </div>
      <div style="font-family:Arial,sans-serif;font-size:11px;">
        <a href="mailto:cdbustarviejo@gmail.com" style="color:#fb923c;text-decoration:none;">cdbustarviejo@gmail.com</a>
      </div>
      <div style="font-family:Arial,sans-serif;font-size:10px;color:#64748b;line-height:16px;margin-top:14px;">
        Si no esperabas este correo, puedes ignorarlo.
      </div>
    </td>
  </tr>

</table>

</td></tr>
</table>

</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admins' }, { status: 403 });
    }

    const body = await req.json();
    const {
      to = 'manuelbermudo@hotmail.com',
      tipo = 'padre_nuevo',
      nombre_destino = 'Manuel (PRUEBA REDISEÑO)',
      mensaje_personalizado = 'Este es el correo con el NUEVO diseño rediseñado.',
      jugador_nombre = ''
    } = body;

    const code = 'TEST-2024';
    const html = buildRedesignedHTML(code, tipo, nombre_destino, mensaje_personalizado, jugador_nombre);

    const result = await sendWithResend(
      to,
      `⚽ CD Bustarviejo - Tu invitación al club (Código: ${code}) [REDISEÑO]`,
      html
    );

    return Response.json({ success: true, sentTo: to, resendId: result.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});