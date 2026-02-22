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

function buildEmailHTML(code, tipo, nombreDestino, appUrl, mensajePersonalizado, jugadorNombre) {
  const tipoLabels = {
    padre_nuevo: '⚽ Bienvenido/a a la Familia del CD Bustarviejo',
    segundo_progenitor: '👨‍👩‍👧 Acceso para Segundo Progenitor',
    juvenil: '🏆 ¡Tu Acceso Juvenil al CD Bustarviejo!',
    jugador_adulto: '⚽ ¡Bienvenido Jugador!'
  };

  const tipoEmoji = {
    padre_nuevo: '👋',
    segundo_progenitor: '👨‍👩‍👧',
    juvenil: '🎮',
    jugador_adulto: '⚽'
  };

  const tipoDescriptions = {
    padre_nuevo: `¡Enhorabuena! Has sido invitado/a a unirte a la <strong>aplicación oficial del CD Bustarviejo</strong>. 
      Desde aquí podrás gestionar todo lo relacionado con la actividad deportiva de tus hijos en el club de forma fácil y rápida.`,
    segundo_progenitor: `El otro progenitor/tutor te ha dado acceso a la <strong>aplicación del CD Bustarviejo</strong> para que tú también puedas seguir de cerca las actividades deportivas de vuestros hijos${jugadorNombre ? ` (<strong>${jugadorNombre}</strong>)` : ''}.`,
    juvenil: `¡Hola! Tu padre/madre/tutor te ha autorizado para que tengas <strong>tu propio acceso</strong> a la app del CD Bustarviejo${jugadorNombre ? ` como jugador/a de <strong>${jugadorNombre}</strong>` : ''}. ¡Ya puedes ver tus convocatorias y mucho más!`,
    jugador_adulto: `¡Bienvenido/a! Has sido invitado/a a acceder a la <strong>aplicación oficial del CD Bustarviejo</strong> como jugador/a${jugadorNombre ? ` (<strong>${jugadorNombre}</strong>)` : ''}. Desde aquí podrás gestionar tus convocatorias, pagos y comunicarte con el equipo.`
  };

  const featuresByType = {
    padre_nuevo: [
      { icon: '📋', text: '<strong>Inscripciones:</strong> Registra y renueva a tus hijos de forma digital' },
      { icon: '💳', text: '<strong>Pagos:</strong> Gestiona cuotas y ve el estado de tus pagos' },
      { icon: '📅', text: '<strong>Convocatorias:</strong> Recibe y confirma asistencia a partidos al instante' },
      { icon: '💬', text: '<strong>Chat:</strong> Comunícate directamente con entrenadores y coordinadores' },
      { icon: '📆', text: '<strong>Calendario:</strong> Horarios de entrenamientos, partidos y eventos del club' },
      { icon: '🏆', text: '<strong>Competición:</strong> Clasificaciones, resultados y goleadores en tiempo real' },
      { icon: '📢', text: '<strong>Anuncios:</strong> Información importante del club siempre a mano' },
      { icon: '🖊️', text: '<strong>Firmas:</strong> Firma documentos de federación desde el móvil' },
      { icon: '🛍️', text: '<strong>Equipación:</strong> Pide la ropa del club y haz seguimiento de pedidos' },
      { icon: '🖼️', text: '<strong>Galería:</strong> Fotos y recuerdos de entrenamientos y partidos' },
    ],
    segundo_progenitor: [
      { icon: '📅', text: '<strong>Convocatorias:</strong> Ve y confirma asistencia a partidos' },
      { icon: '💳', text: '<strong>Pagos:</strong> Consulta el estado de cuotas y pagos' },
      { icon: '💬', text: '<strong>Chat:</strong> Comunícate con entrenadores y coordinadores' },
      { icon: '📆', text: '<strong>Calendario:</strong> Horarios de entrenamientos y partidos' },
      { icon: '🏆', text: '<strong>Competición:</strong> Clasificaciones y resultados' },
      { icon: '📢', text: '<strong>Anuncios:</strong> Información del club siempre actualizada' },
      { icon: '📄', text: '<strong>Documentos:</strong> Accede a documentos y notificaciones' },
    ],
    juvenil: [
      { icon: '📅', text: '<strong>Convocatorias:</strong> Ve cuándo estás convocado/a para partidos' },
      { icon: '📆', text: '<strong>Calendario:</strong> Tus horarios de entrenamiento y partidos' },
      { icon: '🏆', text: '<strong>Competición:</strong> Clasificaciones y resultados de tu equipo' },
      { icon: '📢', text: '<strong>Anuncios:</strong> Noticias del club que te interesan' },
      { icon: '⭐', text: '<strong>Evaluaciones:</strong> Sigue tu progreso como jugador/a' },
      { icon: '✉️', text: '<strong>Buzón:</strong> Envía mensajes a la coordinación del club' },
      { icon: '🖼️', text: '<strong>Galería:</strong> Fotos de tu equipo' },
    ],
    jugador_adulto: [
      { icon: '📅', text: '<strong>Convocatorias:</strong> Recibe y confirma asistencia a partidos' },
      { icon: '💳', text: '<strong>Pagos:</strong> Gestiona tus cuotas y ve el estado de pagos' },
      { icon: '💬', text: '<strong>Chat:</strong> Comunícate con entrenadores y coordinadores' },
      { icon: '📆', text: '<strong>Calendario:</strong> Horarios de entrenamiento y partidos' },
      { icon: '🏆', text: '<strong>Competición:</strong> Clasificaciones, resultados y goleadores' },
      { icon: '🖊️', text: '<strong>Firmas:</strong> Firma documentos de federación desde el móvil' },
      { icon: '📢', text: '<strong>Anuncios:</strong> Información del club siempre actualizada' },
      { icon: '🖼️', text: '<strong>Galería:</strong> Fotos de entrenamientos y partidos' },
    ]
  };

  const features = featuresByType[tipo] || featuresByType.padre_nuevo;

  const importantNotes = {
    padre_nuevo: '⚠️ <strong>Importante:</strong> Regístrate con <strong>este mismo email</strong> (el que has recibido esta invitación). Si usas otro email, el código no funcionará.',
    segundo_progenitor: '⚠️ <strong>Importante:</strong> Debes registrarte con <strong>este mismo email</strong>. Ambos progenitores tendréis acceso independiente a la misma información de vuestros hijos.',
    juvenil: '⚠️ <strong>Importante:</strong> Regístrate con <strong>este email</strong>. Tu padre/tutor ha autorizado este acceso y puede revocarlo en cualquier momento. Recuerda ser respetuoso/a en el uso de la app.',
    jugador_adulto: '⚠️ <strong>Importante:</strong> Regístrate con <strong>este mismo email</strong> para que tu perfil de jugador quede vinculado correctamente.'
  };

  const featuresHTML = features.map(f => `
                <tr><td style="padding:6px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td width="30" valign="top" style="font-size:16px;padding-top:2px;">${f.icon}</td>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#334155;line-height:20px;">${f.text}</td>
                  </tr></table>
                </td></tr>`).join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:24px 16px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background-color:#ea580c;padding:36px 24px 28px;text-align:center;border-radius:16px 16px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom:16px;">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" width="80" height="80" style="display:block;border:4px solid #ffffff;border-radius:16px;" />
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:bold;color:#ffffff;letter-spacing:1px;">
          CD BUSTARVIEJO
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#fed7aa;padding-top:6px;letter-spacing:1px;text-transform:uppercase;">
          Temporada 2025/2026
        </td></tr>
      </table>
    </td>
  </tr>

  <!-- Tipo de invitación -->
  <tr>
    <td style="background-color:#1e293b;padding:12px 28px;text-align:center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#f97316;letter-spacing:0.5px;">
          ${tipoLabels[tipo] || 'Invitación'}
        </td></tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background-color:#ffffff;padding:32px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        
        <!-- Saludo -->
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:20px;color:#1e293b;padding-bottom:16px;font-weight:bold;">
          ${tipoEmoji[tipo]} ${nombreDestino ? `¡Hola ${nombreDestino}!` : '¡Hola!'}
        </td></tr>

        <!-- Descripción -->
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#475569;line-height:26px;padding-bottom:24px;">
          ${tipoDescriptions[tipo]}
        </td></tr>

        ${mensajePersonalizado ? `
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="4" style="background-color:#ea580c;border-radius:4px;"></td>
              <td style="background-color:#fef7f0;padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#78350f;font-style:italic;line-height:22px;">
                &ldquo;${mensajePersonalizado}&rdquo;
              </td>
            </tr>
          </table>
        </td></tr>` : ''}

        <!-- =============================== -->
        <!-- BOTÓN PRINCIPAL - PRIMERO -->
        <!-- =============================== -->
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#1e293b;padding-bottom:12px;text-align:center;">
          &#128640; Empezar es muy f&aacute;cil. Pulsa este bot&oacute;n:
        </td></tr>
        <tr><td align="center" style="padding-bottom:28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="border-radius:14px;background-color:#16a34a;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${appUrl}" style="height:60px;v-text-anchor:middle;width:340px;" arcsize="18%" fillcolor="#16a34a" stroke="f"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:20px;font-weight:bold;">&#128242; Abrir la App del Club</center></v:roundrect><![endif]-->
              <!--[if !mso]><!-->
              <a href="${appUrl}" target="_blank" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;text-decoration:none;padding:20px 52px;border-radius:14px;">
                &#128242; Abrir la App del Club
              </a>
              <!--<![endif]-->
            </td></tr>
          </table>
        </td></tr>

        <!-- ============================================ -->
        <!-- PASO 1: INSTALAR LA APP DESDE EL NAVEGADOR  -->
        <!-- ============================================ -->
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:3px solid #16a34a;border-radius:16px;overflow:hidden;">
            <tr><td style="background-color:#16a34a;padding:16px 22px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">
                  &#128242; PASO 1: Instala la app en tu m&oacute;vil
                </td></tr>
                <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#bbf7d0;padding-top:4px;">
                  Al pulsar el bot&oacute;n verde se abrir&aacute; la web en tu navegador. Ahora inst&aacute;lala como app:
                </td></tr>
              </table>
            </td></tr>
            <tr><td style="background-color:#f0fdf4;padding:24px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Android -->
                <tr><td style="padding-bottom:20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #bbf7d0;border-radius:12px;overflow:hidden;">
                    <tr><td style="background-color:#16a34a;padding:10px 16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;">
                          &#129302; Android (Samsung, Xiaomi, etc.)
                        </td></tr>
                      </table>
                    </td></tr>
                    <tr><td style="background-color:#f0fdf4;padding:16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#166534;line-height:24px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px;">
                            <tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#166534;line-height:22px;">
                              &#127881; <strong>En muchos Android se instala autom&aacute;ticamente.</strong> Al pulsar el bot&oacute;n verde, Chrome te mostrar&aacute; un aviso de <strong>&quot;Instalar aplicaci&oacute;n&quot;</strong>. Simplemente pulsa <strong>Instalar</strong> y listo.
                            </td></tr>
                          </table>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;margin-bottom:4px;">
                            <tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#166534;background-color:#dcfce7;padding:8px 12px;border-radius:8px;line-height:20px;">
                              Si no sale ese aviso: pulsa el <strong>men&uacute;</strong> (&#8942; tres puntos arriba a la derecha) &rarr; <strong>&quot;Instalar aplicaci&oacute;n&quot;</strong> o <strong>&quot;A&ntilde;adir a pantalla de inicio&quot;</strong>
                            </td></tr>
                          </table>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </td></tr>

                <!-- iPhone -->
                <tr><td>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #bfdbfe;border-radius:12px;overflow:hidden;">
                    <tr><td style="background-color:#1e40af;padding:10px 16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;">
                          &#127822; iPhone / iPad
                        </td></tr>
                      </table>
                    </td></tr>
                    <tr><td style="background-color:#eff6ff;padding:16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1e3a5f;line-height:22px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                            <tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#dc2626;line-height:20px;background-color:#fef2f2;padding:8px 12px;border-radius:8px;border:1px solid #fecaca;">
                              &#9888; <strong>IMPORTANTE:</strong> En iPhone la app solo se puede instalar desde <strong>Safari</strong>. Si al pulsar el bot&oacute;n se abre otro navegador (Chrome, Gmail, etc.), copia la direcci&oacute;n <strong>app.cdbustarviejo.com</strong> y p&eacute;gala en Safari.
                            </td></tr>
                          </table>
                          <strong>Una vez est&eacute;s en Safari:</strong>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
                            <tr><td style="background-color:#1e40af;color:#fff;width:24px;height:24px;text-align:center;line-height:24px;border-radius:50%;font-size:12px;font-weight:bold;">1</td>
                            <td style="padding-left:10px;font-family:Arial,sans-serif;font-size:13px;color:#1e3a5f;">Pulsa el bot&oacute;n <strong>Compartir</strong> (el cuadrado con flecha hacia arriba &#8593;, est&aacute; abajo en la pantalla)</td></tr>
                          </table>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">
                            <tr><td style="background-color:#1e40af;color:#fff;width:24px;height:24px;text-align:center;line-height:24px;border-radius:50%;font-size:12px;font-weight:bold;">2</td>
                            <td style="padding-left:10px;font-family:Arial,sans-serif;font-size:13px;color:#1e3a5f;">Desliza hacia abajo y pulsa <strong>&quot;A&ntilde;adir a pantalla de inicio&quot;</strong></td></tr>
                          </table>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">
                            <tr><td style="background-color:#1e40af;color:#fff;width:24px;height:24px;text-align:center;line-height:24px;border-radius:50%;font-size:12px;font-weight:bold;">3</td>
                            <td style="padding-left:10px;font-family:Arial,sans-serif;font-size:13px;color:#1e3a5f;">Pulsa <strong>&quot;A&ntilde;adir&quot;</strong> arriba a la derecha. &iexcl;Listo! &#127881;</td></tr>
                          </table>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </td></tr>

              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- ======================================= -->
        <!-- PASO 2: CREAR CUENTA E INTRODUCIR CÓDIGO -->
        <!-- ======================================= -->
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:3px solid #ea580c;border-radius:16px;overflow:hidden;">
            <tr><td style="background-color:#ea580c;padding:16px 22px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">
                  &#128273; PASO 2: Crea tu cuenta e introduce tu c&oacute;digo
                </td></tr>
              </table>
            </td></tr>
            <tr><td style="background-color:#fff7ed;padding:24px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                
                <!-- Instrucciones -->
                <tr><td style="padding-bottom:16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr><td style="padding:6px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="background-color:#ea580c;color:#fff;width:24px;height:24px;text-align:center;line-height:24px;border-radius:50%;font-size:12px;font-weight:bold;">1</td>
                        <td style="padding-left:10px;font-family:Arial,sans-serif;font-size:14px;color:#9a3412;line-height:22px;">Abre la app desde el <strong>icono</strong> que acabas de instalar en tu pantalla de inicio</td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding:6px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="background-color:#ea580c;color:#fff;width:24px;height:24px;text-align:center;line-height:24px;border-radius:50%;font-size:12px;font-weight:bold;">2</td>
                        <td style="padding-left:10px;font-family:Arial,sans-serif;font-size:14px;color:#9a3412;line-height:22px;">Pulsa <strong>&quot;Crear cuenta&quot;</strong> y reg&iacute;strate usando <strong><u>este mismo email</u></strong></td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding:6px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="background-color:#ea580c;color:#fff;width:24px;height:24px;text-align:center;line-height:24px;border-radius:50%;font-size:12px;font-weight:bold;">3</td>
                        <td style="padding-left:10px;font-family:Arial,sans-serif;font-size:14px;color:#9a3412;line-height:22px;">Te pedir&aacute; un <strong>c&oacute;digo de acceso</strong> &mdash; introduce el que aparece aqu&iacute; abajo</td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding:6px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="background-color:#ea580c;color:#fff;width:24px;height:24px;text-align:center;line-height:24px;border-radius:50%;font-size:12px;font-weight:bold;">4</td>
                        <td style="padding-left:10px;font-family:Arial,sans-serif;font-size:14px;color:#9a3412;line-height:22px;"><strong>&iexcl;Listo!</strong> Ya tendr&aacute;s acceso completo a la app del club &#127881;</td>
                      </tr></table>
                    </td></tr>
                  </table>
                </td></tr>

                <!-- Código grande -->
                <tr><td style="padding-bottom:16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:14px;overflow:hidden;">
                    <tr><td style="background-color:#1e293b;padding:28px 20px;text-align:center;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:3px;padding-bottom:10px;">
                          Tu c&oacute;digo de acceso personal
                        </td></tr>
                        <tr><td align="center" style="font-family:'Courier New',Courier,monospace;font-size:42px;font-weight:bold;color:#f97316;letter-spacing:10px;padding-bottom:10px;">
                          ${code}
                        </td></tr>
                        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;">
                          &#128337; V&aacute;lido 7 d&iacute;as &bull; &#128274; Vinculado a tu email
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </td></tr>

                <!-- Nota importante -->
                <tr><td>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #fde68a;border-radius:10px;overflow:hidden;">
                    <tr><td style="background-color:#fffbeb;padding:14px 20px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#92400e;line-height:22px;">
                          ${importantNotes[tipo]}
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </td></tr>

              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Separador -->
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="border-bottom:2px solid #f1f5f9;">&nbsp;</td></tr>
          </table>
        </td></tr>

        <!-- ¿Qué podrás hacer? -->
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#1e293b;padding-bottom:16px;">
          &#127775; &iquest;Qu&eacute; podr&aacute;s hacer desde la app?
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr><td style="background-color:#fafbfc;padding:18px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${featuresHTML}
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Tip final -->
        <tr><td style="padding-bottom:16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;line-height:20px;background-color:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;">
              &#128161; <strong>Tip:</strong> Al instalar la app tendr&aacute;s un icono en tu pantalla de inicio como cualquier otra app (WhatsApp, Instagram...) y recibir&aacute;s notificaciones de convocatorias, pagos y novedades del club.
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background-color:#1e293b;padding:28px;border-radius:0 0 16px 16px;text-align:center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom:12px;">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" width="40" height="40" style="display:inline-block;border-radius:8px;" />
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;padding-bottom:4px;">
          CD Bustarviejo
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;padding-bottom:12px;">
          F&uacute;tbol &bull; Baloncesto &bull; Desde 1950
        </td></tr>
        <tr><td align="center" style="padding-bottom:12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:0 8px;">
                <a href="mailto:cdbustarviejo@gmail.com" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#f97316;text-decoration:none;">&#9993; cdbustarviejo@gmail.com</a>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#64748b;line-height:18px;">
          Este correo ha sido enviado porque alguien del CD Bustarviejo te ha invitado a la app del club.<br/>
          Si no esperabas este email, puedes ignorarlo con total tranquilidad.
        </td></tr>
      </table>
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
      const emailHTML = buildEmailHTML(codigo, existingCode.tipo, existingCode.nombre_destino, appUrl, existingCode.mensaje_personalizado, existingCode.jugador_nombre);
      
      await sendWithResend(
        existingCode.email,
        `⚽ CD Bustarviejo - Tu invitación al club (Código: ${codigo})`,
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
        const emailHTML = buildEmailHTML(existing.codigo, tipo, nombre_destino || existing.nombre_destino, appUrl, mensaje_personalizado, jugador_nombre || existing.jugador_nombre);
        
        await sendWithResend(
          email.toLowerCase().trim(),
          `⚽ CD Bustarviejo - Tu invitación al club (Código: ${existing.codigo})`,
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
    const emailHTML = buildEmailHTML(codigo, tipo, nombre_destino, appUrl, mensaje_personalizado, jugador_nombre);
    
    await sendWithResend(
      email.toLowerCase().trim(),
      `⚽ CD Bustarviejo - Tu invitación al club (Código: ${codigo})`,
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