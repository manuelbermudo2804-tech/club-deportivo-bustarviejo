import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SOCIAL_FOOTER = `<div style="background:#1e293b;padding:24px;text-align:center;border-radius:0 0 12px 12px;margin-top:24px;"><div style="margin-bottom:12px;"><a href="https://www.cdbustarviejo.com" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:8px;">🌐 www.cdbustarviejo.com</a></div><div style="margin-bottom:14px;"><a href="https://www.facebook.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Facebook">📘</a><a href="https://www.instagram.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Instagram">📸</a></div><div style="color:#94a3b8;font-size:12px;line-height:1.6;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a></div></div>`;

function injectFooter(html) {
  if (html.includes('www.cdbustarviejo.com')) return html;
  if (html.includes('</body>')) return html.replace('</body>', SOCIAL_FOOTER + '</body>');
  return html + SOCIAL_FOOTER;
}

async function sendViaResend(to, subject, html) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) { console.error('[RESEND] API key not set'); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'CD Bustarviejo <noreply@cdbustarviejo.com>', to: [to], subject, html: injectFooter(html) })
  });
  if (!resp.ok) console.error(`[RESEND] Error ${resp.status}:`, await resp.text().catch(() => ''));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { forceDate = null, forceEmails = null } = await req.json().catch(() => ({}));

    // Obtener fecha actual o forzada
    const today = forceDate ? new Date(forceDate) : new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayMDKey = `${month}-${day}`;

    console.log(`🎂 [BIRTHDAY] Iniciando búsqueda para: ${todayMDKey}`);

    // Funciones auxiliares
    const calcularEdad = (fechaNac) => {
      if (!fechaNac) return null;
      const nac = new Date(fechaNac);
      let edad = today.getFullYear() - nac.getFullYear();
      const m = today.getMonth() - nac.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < nac.getDate())) edad--;
      return edad;
    };

    const obtenerPlantillaEmail = (tipo, nombre, edad) => {
      const plantillas = {
        jugador_menor: () => ({
          subject: `¡${nombre} cumple años hoy! 🎂 Feliz cumpleaños`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
    .header p { margin: 10px 0 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 40px 30px; text-align: center; }
    .emoji { font-size: 48px; margin: 20px 0; animation: bounce 1s infinite; }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    .message { font-size: 18px; color: #333; line-height: 1.6; margin: 20px 0; }
    .highlight { font-weight: bold; color: #f97316; font-size: 20px; }
    .club-name { color: #22c55e; font-weight: bold; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    .badge { display: inline-block; background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎂 ¡${nombre.split(' ')[0]} cumple años!</h1>
      <p>Hoy es un día especial</p>
    </div>
    <div class="content">
      <div class="emoji">🎉 🎈 🎊</div>
      <div class="message">
        <p>Queridos papás,</p>
        <p><span class="highlight">${nombre}</span> cumple <span class="highlight">${edad} años</span> hoy y en el <span class="club-name">CD Bustarviejo</span> queremos felicitarlo por todo su trabajo y dedicación.</p>
        <p>Su entusiasmo, esfuerzo y actitud positiva son un ejemplo para todos sus compañeros. ¡Que disfrute mucho de este día especial rodeado de familia y amigos!</p>
        <div class="badge">¡QUE LO DISFRUTE!</div>
      </div>
    </div>
    <div class="footer">
      <p>© CD Bustarviejo - Deporte, Valores y Familia</p>
      <p>Feliz cumpleaños desde toda la familia del club 💚⚽</p>
    </div>
  </div>
</body>
</html>
          `
        }),
        jugador_adulto: () => ({
          subject: `¡Feliz cumpleaños, ${nombre}! 🎂 Hoy es tu día especial`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
    .content { padding: 40px 30px; text-align: center; }
    .emoji { font-size: 64px; margin: 20px 0; animation: bounce 1s infinite; }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
    .message { font-size: 18px; color: #333; line-height: 1.8; margin: 20px 0; }
    .highlight { font-weight: bold; color: #f97316; font-size: 22px; }
    .club-name { color: #22c55e; font-weight: bold; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    .badge { display: inline-block; background: #f97316; color: white; padding: 10px 20px; border-radius: 25px; font-weight: bold; margin: 15px 0; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡FELIZ CUMPLEAÑOS, ${nombre.toUpperCase()}!</h1>
    </div>
    <div class="content">
      <div class="emoji">🎂✨🎉</div>
      <div class="message">
        <p>¡Hoy es <span class="highlight">TU DÍA</span>!</p>
        <p>Cumples <span class="highlight">${edad} años</span> y en el <span class="club-name">CD Bustarviejo</span> queremos que sepas lo especial que eres para todos nosotros.</p>
        <p>Tu compromiso, tu pasión por el deporte y tu amistad con los compañeros nos inspiran cada día. ¡Que disfrutes al máximo de esta jornada tan especial!</p>
        <p>Que los próximos 365 días estén llenos de alegría, éxitos y momentos inolvidables. 🚀⚽💪</p>
        <div class="badge">¡LO MEJOR ESTÁ POR VENIR!</div>
      </div>
    </div>
    <div class="footer">
      <p>© CD Bustarviejo - Deporte, Valores y Familia</p>
      <p>¡A disfrutar del día! 🎈🎊</p>
    </div>
  </div>
</body>
</html>
          `
        }),
        padre: () => ({
          subject: `¡Feliz cumpleaños! 🎂 Que disfrutes de tu día especial`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
    .content { padding: 40px 30px; text-align: center; }
    .emoji { font-size: 64px; margin: 20px 0; }
    .message { font-size: 18px; color: #333; line-height: 1.8; margin: 20px 0; }
    .highlight { font-weight: bold; color: #22c55e; font-size: 22px; }
    .badge { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 25px; font-weight: bold; margin: 15px 0; font-size: 16px; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Feliz Cumpleaños, ${nombre}!</h1>
    </div>
    <div class="content">
      <div class="emoji">🎂🎉👨‍👩‍👧‍👦</div>
      <div class="message">
        <p>Desde el <span class="highlight">CD Bustarviejo</span> queremos desearte un cumpleaños extraordinario.</p>
        <p>Tu implicación en el club, tu apoyo constante a tus hijos y tu dedicación hacen que sea posible que todos disfrutemos de este hermoso deporte en familia.</p>
        <p>¡Gracias por ser parte de nuestra familia! 💚⚽</p>
        <div class="badge">¡QUE DISFRUTES TU DÍA!</div>
      </div>
    </div>
    <div class="footer">
      <p>© CD Bustarviejo - Deporte, Valores y Familia</p>
    </div>
  </div>
</body>
</html>
          `
        }),
        socio: () => ({
          subject: `¡Feliz cumpleaños, socio! 🎂 Un día muy especial para ti`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
    .content { padding: 40px 30px; text-align: center; }
    .emoji { font-size: 64px; margin: 20px 0; }
    .message { font-size: 18px; color: #333; line-height: 1.8; margin: 20px 0; }
    .highlight { font-weight: bold; color: #f97316; }
    .badge { display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 25px; font-weight: bold; margin: 15px 0; font-size: 16px; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Felicidades, ${nombre}!</h1>
    </div>
    <div class="content">
      <div class="emoji">🎂🎊🎈</div>
      <div class="message">
        <p>En el <span class="highlight">CD Bustarviejo</span> estamos felices de celebrar tu cumpleaños.</p>
        <p>Tu apoyo como socio es fundamental para que el club siga creciendo y ofreciendo los mejores servicios a todos nuestros miembros.</p>
        <p>¡Que disfrutes intensamente de tu día y que venga cargado de momentos especiales!</p>
        <div class="badge">¡FELIZ CUMPLEAÑOS!</div>
      </div>
    </div>
    <div class="footer">
      <p>© CD Bustarviejo - Deporte, Valores y Familia</p>
      <p>Gracias por ser parte de nuestra comunidad 💚</p>
    </div>
  </div>
</body>
</html>
          `
        }),
        entrenador: () => ({
          subject: `¡Feliz cumpleaños, entrenador! 🎂 Tu día especial ha llegado`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
    .content { padding: 40px 30px; text-align: center; }
    .emoji { font-size: 64px; margin: 20px 0; }
    .message { font-size: 18px; color: #333; line-height: 1.8; margin: 20px 0; }
    .highlight { font-weight: bold; color: #3b82f6; }
    .badge { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 25px; font-weight: bold; margin: 15px 0; font-size: 16px; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Feliz Cumpleaños, Coach ${nombre.split(' ')[0]}!</h1>
    </div>
    <div class="content">
      <div class="emoji">🎂⚽🏆</div>
      <div class="message">
        <p>Tu dedicación, pasión y liderazgo son inspiración para todos en el <span class="highlight">CD Bustarviejo</span>.</p>
        <p>Gracias por formar no solo grandes deportistas, sino también grandes personas. Tu contribución al club es inestimable.</p>
        <p>¡Que este año esté lleno de victorias, momentos memorables y la satisfacción de ver crecer a nuestros jugadores!</p>
        <div class="badge">¡FELICIDADES!</div>
      </div>
    </div>
    <div class="footer">
      <p>© CD Bustarviejo - Deporte, Valores y Familia</p>
      <p>Un día especial para un entrenador especial 💙⚽</p>
    </div>
  </div>
</body>
</html>
          `
        }),
        coordinador: () => ({
          subject: `¡Feliz cumpleaños, coordinador! 🎂 Tu día ha llegado`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
    .content { padding: 40px 30px; text-align: center; }
    .emoji { font-size: 64px; margin: 20px 0; }
    .message { font-size: 18px; color: #333; line-height: 1.8; margin: 20px 0; }
    .highlight { font-weight: bold; color: #06b6d4; }
    .badge { display: inline-block; background: #06b6d4; color: white; padding: 12px 24px; border-radius: 25px; font-weight: bold; margin: 15px 0; font-size: 16px; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Feliz Cumpleaños, ${nombre}!</h1>
    </div>
    <div class="content">
      <div class="emoji">🎂🎯🌟</div>
      <div class="message">
        <p>Tu coordinación, organización y visión estratégica son pilares del <span class="highlight">CD Bustarviejo</span>.</p>
        <p>Gracias por trabajar sin parar para que todo funcione a la perfección y nuestro club siga adelante con excelencia.</p>
        <p>¡Que disfrutes de un cumpleaños extraordinario lleno de logros y satisfacciones!</p>
        <div class="badge">¡FELICIDADES!</div>
      </div>
    </div>
    <div class="footer">
      <p>© CD Bustarviejo - Deporte, Valores y Familia</p>
      <p>Tu liderazgo nos hace grandes 💙</p>
    </div>
  </div>
</body>
</html>
          `
        })
      };
      return (plantillas[tipo] || plantillas.padre)();
    };

    // 1️⃣ BUSCAR JUGADORES (Player.fecha_nacimiento)
    console.log('🔍 Buscando jugadores con cumpleaños hoy...');
    const playersCandidates = await base44.entities.Player.filter({ activo: true });
    const playersToday = playersCandidates.filter(p => {
      if (!p.fecha_nacimiento) return false;
      const pBirthMD = p.fecha_nacimiento.substring(5, 10);
      return pBirthMD === todayMDKey;
    });

    // 2️⃣ BUSCAR USUARIOS (User.fecha_nacimiento)
    console.log('🔍 Buscando usuarios con cumpleaños hoy...');
    const usersCandidates = await base44.entities.User.list();
    const usersToday = usersCandidates.filter(u => {
      if (!u.fecha_nacimiento) return false;
      const uBirthMD = u.fecha_nacimiento.substring(5, 10);
      return uBirthMD === todayMDKey;
    });

    // 3️⃣ BUSCAR SOCIOS (ClubMember.fecha_nacimiento)
    console.log('🔍 Buscando socios con cumpleaños hoy...');
    const sociosCandidates = await base44.entities.ClubMember.filter({});
    const sociosToday = sociosCandidates.filter(s => {
      if (!s.fecha_nacimiento) return false;
      const sBirthMD = s.fecha_nacimiento.substring(5, 10);
      return sBirthMD === todayMDKey;
    });

    // Compilar lista de destinatarios
    const destinatarios = [];

    // Jugadores menores → enviar a ambos progenitores
    playersToday.forEach(p => {
      if (p.es_mayor_edad !== true) {
        const edad = calcularEdad(p.fecha_nacimiento);
        if (p.email_padre) {
          destinatarios.push({
            email: p.email_padre,
            nombre: p.nombre,
            tipo: 'jugador_menor',
            edad,
            fecha_nac: p.fecha_nacimiento
          });
        }
        // Segundo progenitor/tutor
        if (p.email_tutor_2 && p.email_tutor_2 !== p.email_padre) {
          destinatarios.push({
            email: p.email_tutor_2,
            nombre: p.nombre,
            tipo: 'jugador_menor',
            edad,
            fecha_nac: p.fecha_nacimiento
          });
        }
      }
    });

    // Jugadores adultos
    playersToday.forEach(p => {
      if (p.es_mayor_edad === true && p.email_jugador) {
        const edad = calcularEdad(p.fecha_nacimiento);
        destinatarios.push({
          email: p.email_jugador,
          nombre: p.nombre,
          tipo: 'jugador_adulto',
          edad,
          fecha_nac: p.fecha_nacimiento
        });
      }
    });

    // Usuarios (entrenadores, coordinadores, tesoreros)
    usersToday.forEach(u => {
      if (u.email && u.role !== 'user') {
        const edad = calcularEdad(u.fecha_nacimiento);
        let tipo = 'padre';
        if (u.es_entrenador === true) tipo = 'entrenador';
        if (u.es_coordinador === true) tipo = 'coordinador';
        
        destinatarios.push({
          email: u.email,
          nombre: u.full_name,
          tipo,
          edad,
          fecha_nac: u.fecha_nacimiento
        });
      }
    });

    // Padres de familia (User.role === 'user')
    usersToday.forEach(u => {
      if (u.email && u.role === 'user') {
        const edad = calcularEdad(u.fecha_nacimiento);
        destinatarios.push({
          email: u.email,
          nombre: u.full_name,
          tipo: 'padre',
          edad,
          fecha_nac: u.fecha_nacimiento
        });
      }
    });

    // Socios
    sociosToday.forEach(s => {
      if (s.email) {
        const edad = calcularEdad(s.fecha_nacimiento);
        destinatarios.push({
          email: s.email,
          nombre: s.nombre || s.email.split('@')[0],
          tipo: 'socio',
          edad,
          fecha_nac: s.fecha_nacimiento
        });
      }
    });

    // Filtrar si se especifica forceEmails
    let finalDestinatarios = destinatarios;
    if (forceEmails && Array.isArray(forceEmails)) {
      finalDestinatarios = destinatarios.filter(d => forceEmails.includes(d.email));
    }

    console.log(`📧 Encontrados ${finalDestinatarios.length} cumpleañeros hoy`);

    // Procesar envíos
    const resultados = [];
    for (const dest of finalDestinatarios) {
      try {
        // Verificar si ya se envió hoy
        const logs = await base44.asServiceRole.entities.BirthdayLog.filter({
          destinatario_email: dest.email,
          email_enviado: true
        });

        const hoyYaEnviado = logs.some(log => {
          const logDate = log.fecha_envio_email.split('T')[0];
          const todayStr = today.toISOString().split('T')[0];
          return logDate === todayStr;
        });

        if (hoyYaEnviado) {
          console.log(`⏭️ Ya enviado hoy a ${dest.email}`);
          resultados.push({ email: dest.email, status: 'skipped', reason: 'already_sent' });
          continue;
        }

        // Obtener plantilla
        const plantilla = obtenerPlantillaEmail(dest.tipo, dest.nombre, dest.edad);

        // Enviar email
        await sendViaResend(dest.email, plantilla.subject, plantilla.html);

        // Crear log
        await base44.asServiceRole.entities.BirthdayLog.create({
          destinatario_email: dest.email,
          destinatario_nombre: dest.nombre,
          destinatario_tipo: dest.tipo,
          fecha_cumpleanos: dest.fecha_nac,
          edad: dest.edad,
          email_enviado: true,
          fecha_envio_email: new Date().toISOString()
        });

        console.log(`✅ Email enviado a ${dest.email} (${dest.tipo})`);
        resultados.push({ email: dest.email, status: 'sent', tipo: dest.tipo, edad: dest.edad });
      } catch (err) {
        console.error(`❌ Error enviando a ${dest.email}:`, err.message);
        resultados.push({ email: dest.email, status: 'error', error: err.message });
      }
    }

    return Response.json({
      success: true,
      fecha: todayMDKey,
      total_encontrados: destinatarios.length,
      total_procesados: finalDestinatarios.length,
      resultados
    });
  } catch (error) {
    console.error('❌ [BIRTHDAY] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});