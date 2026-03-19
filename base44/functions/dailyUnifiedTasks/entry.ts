import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CD Bustarviejo <noreply@cdbustarviejo.com>';
const MAX_AUTO_RESENDS = 3;

async function sendWithResend(to, subject, html) {
  if (!RESEND_API_KEY) { console.error('[RESEND] API key not set'); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
  });
  if (!resp.ok) console.error(`[RESEND] Error ${resp.status}:`, await resp.text().catch(() => ''));
}

// ══════════════════════════════════════════════════
// TASK 1: Auto-close callups for past matches
// ══════════════════════════════════════════════════
async function taskAutoCloseCallups(base44) {
  const today = new Date().toISOString().split('T')[0];
  const allCallups = await base44.asServiceRole.entities.Convocatoria.list('-fecha_partido', 200);
  const deleted = [];
  const closed = [];

  for (const c of allCallups) {
    if (c.cerrada || c.estado_convocatoria === 'cancelada') continue;
    if (!c.fecha_partido || c.fecha_partido >= today) continue;

    if (!c.publicada) {
      await base44.asServiceRole.entities.Convocatoria.delete(c.id);
      deleted.push({ id: c.id, titulo: c.titulo, fecha: c.fecha_partido });
    } else {
      await base44.asServiceRole.entities.Convocatoria.update(c.id, { cerrada: true });
      closed.push({ id: c.id, titulo: c.titulo, fecha: c.fecha_partido });
    }
  }

  // Clean old ProximoPartido (>7 days)
  const allProximos = await base44.asServiceRole.entities.ProximoPartido.list('-updated_date', 200);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];
  let proximosCleaned = 0;
  for (const p of allProximos) {
    if (p.jugado && p.fecha_iso && p.fecha_iso < cutoff) {
      await base44.asServiceRole.entities.ProximoPartido.delete(p.id);
      proximosCleaned++;
    }
  }

  console.log(`[CALLUPS] Deleted ${deleted.length} drafts, closed ${closed.length}, cleaned ${proximosCleaned} old matches`);
  return { deleted: deleted.length, closed: closed.length, proximosCleaned };
}

// ══════════════════════════════════════════════════
// TASK 2: Expire access codes (with auto-resend)
// ══════════════════════════════════════════════════
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function buildAutoResendEmail(code, nombreDestino, reenvioNum) {
  const appUrl = 'https://app.cdbustarviejo.com';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#ea580c;padding:28px 24px;text-align:center;border-radius:16px 16px 0 0;">
    <div style="font-size:22px;font-weight:bold;color:#fff;">CD BUSTARVIEJO</div>
    <div style="font-size:12px;color:#fed7aa;margin-top:4px;">⏰ Recordatorio de Invitación</div>
  </td></tr>
  <tr><td style="background:#fff;padding:28px;">
    <p style="font-size:17px;color:#1e293b;">${nombreDestino ? `Hola <strong>${nombreDestino}</strong>,` : 'Hola,'}</p>
    <p style="font-size:15px;color:#475569;line-height:24px;">Tu código anterior expiró. <strong>Te hemos generado uno nuevo automáticamente.</strong></p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;margin:20px 0;">
      <tr><td style="background:#1e293b;padding:28px 20px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:3px;margin-bottom:10px;">🔑 Tu nuevo código</div>
        <div style="font-family:'Courier New',monospace;font-size:40px;font-weight:bold;color:#f97316;letter-spacing:10px;">${code}</div>
        <div style="font-size:11px;color:#64748b;margin-top:10px;">⏱️ Válido 7 días</div>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="border-radius:10px;background:#16a34a;text-align:center;">
        <a href="${appUrl}" target="_blank" style="display:inline-block;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:10px;">Abrir la App →</a>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:12px;">Recordatorio nº${reenvioNum}. Ayuda: cdbustarviejo@gmail.com</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function taskExpireAccessCodes(base44) {
  const pendingCodes = await base44.asServiceRole.entities.AccessCode.filter({ estado: 'pendiente' });
  const now = new Date();
  let expired = 0, autoResent = 0, maxReached = 0;

  for (const code of pendingCodes) {
    if (!code.fecha_expiracion || new Date(code.fecha_expiracion) >= now) continue;

    const currentResends = code.reenvios || 0;
    if (currentResends < MAX_AUTO_RESENDS) {
      try {
        let newCode = generateCode();
        const existing = await base44.asServiceRole.entities.AccessCode.filter({ codigo: newCode });
        if (existing.length > 0) newCode = generateCode();

        const newExpiration = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const reenvioNum = currentResends + 1;

        await base44.asServiceRole.entities.AccessCode.update(code.id, {
          codigo: newCode, estado: 'pendiente',
          fecha_expiracion: newExpiration.toISOString(),
          reenvios: reenvioNum, ultimo_reenvio: now.toISOString()
        });

        const emailHTML = buildAutoResendEmail(newCode, code.nombre_destino, reenvioNum);
        await sendWithResend(code.email, `⏰ CD Bustarviejo - Nuevo código de acceso (${newCode})`, emailHTML);
        autoResent++;
        console.log(`[CODES] ✅ Re-sent to ${code.email} (#${reenvioNum}, code: ${newCode})`);
      } catch (err) {
        console.error(`[CODES] ❌ Error re-sending to ${code.email}:`, err);
        await base44.asServiceRole.entities.AccessCode.update(code.id, { estado: 'expirado' });
        expired++;
      }
    } else {
      await base44.asServiceRole.entities.AccessCode.update(code.id, { estado: 'expirado' });
      expired++;
      maxReached++;
      console.log(`[CODES] ⛔ ${code.email} expired permanently (${currentResends} resends exhausted)`);
    }
  }

  // Notify admins if there were resends
  if (autoResent > 0 || maxReached > 0) {
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        if (admin.email) {
          await sendWithResend(admin.email,
            `🔄 CD Bustarviejo - ${autoResent} códigos reenviados`,
            `<p>${autoResent} códigos reenviados automáticamente. ${maxReached > 0 ? `${maxReached} expirados definitivamente.` : ''}</p>`
          );
        }
      }
    } catch {}
  }

  console.log(`[CODES] Resent: ${autoResent}, expired: ${expired}, max reached: ${maxReached}`);
  return { autoResent, expired, maxReached, checked: pendingCodes.length };
}

// ══════════════════════════════════════════════════
// TASK 3: Birthday wishes + upcoming detection
// ══════════════════════════════════════════════════
function calcEdad(fechaNac, refDate) {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac);
  let edad = refDate.getFullYear() - nac.getFullYear();
  const m = refDate.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < nac.getDate())) edad--;
  return edad;
}

function getBirthdayEmail(tipo, nombre, edad) {
  const colors = { jugador_menor: '#f97316', jugador_adulto: '#f97316', padre: '#22c55e', socio: '#f97316', entrenador: '#3b82f6', coordinador: '#06b6d4' };
  const color = colors[tipo] || '#f97316';
  const emoji = tipo === 'entrenador' ? '🎂⚽🏆' : tipo === 'coordinador' ? '🎂🎯🌟' : '🎂🎉🎊';
  const greeting = tipo === 'jugador_menor'
    ? `<strong>${nombre}</strong> cumple <strong>${edad} años</strong> hoy. ¡Su entusiasmo y dedicación son un ejemplo para todos!`
    : `¡Cumples <strong>${edad} años</strong>! Tu contribución al CD Bustarviejo es invaluable.`;
  const subject = tipo === 'jugador_menor'
    ? `¡${nombre} cumple años hoy! 🎂`
    : `¡Feliz cumpleaños, ${nombre}! 🎂`;

  return {
    subject,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.15);">
  <div style="background:${color};padding:40px 20px;text-align:center;color:#fff;">
    <div style="font-size:48px;margin-bottom:12px;">${emoji}</div>
    <h1 style="margin:0;font-size:28px;">${subject.replace(/🎂/g,'')}</h1>
  </div>
  <div style="padding:36px 28px;text-align:center;font-size:17px;color:#333;line-height:1.7;">
    <p>${greeting}</p>
    <p>¡Que disfrute mucho de este día especial! 💚⚽</p>
  </div>
  <div style="background:#f8fafc;padding:16px;text-align:center;font-size:12px;color:#94a3b8;">CD Bustarviejo — Deporte, Valores y Familia</div>
</div></body></html>`
  };
}

async function taskBirthdays(base44) {
  const today = new Date();
  const todayMD = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const todayStr = today.toISOString().split('T')[0];

  // Load all people with birth dates
  const [players, users, socios] = await Promise.all([
    base44.asServiceRole.entities.Player.filter({ activo: true }),
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.ClubMember.filter({})
  ]);

  // Helper to match birth date to a specific MM-DD
  const matchMD = (fechaNac, md) => fechaNac && fechaNac.substring(5, 10) === md;

  // ── TODAY'S BIRTHDAYS ──
  const destinatarios = [];

  players.filter(p => matchMD(p.fecha_nacimiento, todayMD)).forEach(p => {
    const edad = calcEdad(p.fecha_nacimiento, today);
    if (p.es_mayor_edad === true) {
      if (p.email_jugador) destinatarios.push({ email: p.email_jugador, nombre: p.nombre, tipo: 'jugador_adulto', edad, fecha_nac: p.fecha_nacimiento });
    } else {
      if (p.email_padre) destinatarios.push({ email: p.email_padre, nombre: p.nombre, tipo: 'jugador_menor', edad, fecha_nac: p.fecha_nacimiento });
      if (p.email_tutor_2 && p.email_tutor_2 !== p.email_padre) destinatarios.push({ email: p.email_tutor_2, nombre: p.nombre, tipo: 'jugador_menor', edad, fecha_nac: p.fecha_nacimiento });
    }
  });

  users.filter(u => matchMD(u.fecha_nacimiento, todayMD)).forEach(u => {
    if (!u.email) return;
    let tipo = 'padre';
    if (u.es_entrenador) tipo = 'entrenador';
    else if (u.es_coordinador) tipo = 'coordinador';
    destinatarios.push({ email: u.email, nombre: u.full_name, tipo, edad: calcEdad(u.fecha_nacimiento, today), fecha_nac: u.fecha_nacimiento });
  });

  socios.filter(s => matchMD(s.fecha_nacimiento, todayMD)).forEach(s => {
    if (s.email) destinatarios.push({ email: s.email, nombre: s.nombre_completo || s.email.split('@')[0], tipo: 'socio', edad: calcEdad(s.fecha_nacimiento, today), fecha_nac: s.fecha_nacimiento });
  });

  // Deduplicate by email
  const seen = new Set();
  const uniqueDest = destinatarios.filter(d => { if (seen.has(d.email)) return false; seen.add(d.email); return true; });

  // Send emails (skip if already sent today)
  let sent = 0, skipped = 0;
  for (const dest of uniqueDest) {
    try {
      const logs = await base44.asServiceRole.entities.BirthdayLog.filter({ destinatario_email: dest.email, email_enviado: true });
      if (logs.some(l => l.fecha_envio_email?.split('T')[0] === todayStr)) { skipped++; continue; }

      const tmpl = getBirthdayEmail(dest.tipo, dest.nombre, dest.edad);
      await sendWithResend(dest.email, tmpl.subject, tmpl.html);
      await base44.asServiceRole.entities.BirthdayLog.create({
        destinatario_email: dest.email, destinatario_nombre: dest.nombre,
        destinatario_tipo: dest.tipo, fecha_cumpleanos: dest.fecha_nac,
        edad: dest.edad, email_enviado: true, fecha_envio_email: new Date().toISOString()
      });
      sent++;
      console.log(`[BIRTHDAY] ✅ Sent to ${dest.email} (${dest.tipo}, ${dest.edad} years)`);
    } catch (err) {
      console.error(`[BIRTHDAY] ❌ Error sending to ${dest.email}:`, err.message);
    }
  }

  // ── UPCOMING BIRTHDAYS (next 7 days) ──
  const upcoming = [];
  for (let d = 1; d <= 7; d++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + d);
    const futureMD = `${String(futureDate.getMonth()+1).padStart(2,'0')}-${String(futureDate.getDate()).padStart(2,'0')}`;
    const futureLabel = `${futureDate.getDate()}/${futureDate.getMonth()+1}`;

    players.filter(p => matchMD(p.fecha_nacimiento, futureMD) && p.activo).forEach(p => {
      upcoming.push({ nombre: p.nombre, tipo: 'jugador', fecha: futureLabel, dias: d, edad: calcEdad(p.fecha_nacimiento, futureDate), categoria: p.categoria_principal || p.deporte });
    });
    users.filter(u => matchMD(u.fecha_nacimiento, futureMD)).forEach(u => {
      let tipo = 'padre';
      if (u.es_entrenador) tipo = 'entrenador';
      else if (u.es_coordinador) tipo = 'coordinador';
      else if (u.role === 'admin') tipo = 'admin';
      upcoming.push({ nombre: u.full_name, tipo, fecha: futureLabel, dias: d, edad: calcEdad(u.fecha_nacimiento, futureDate) });
    });
    socios.filter(s => matchMD(s.fecha_nacimiento, futureMD) && s.activo).forEach(s => {
      upcoming.push({ nombre: s.nombre_completo, tipo: 'socio', fecha: futureLabel, dias: d, edad: calcEdad(s.fecha_nacimiento, futureDate) });
    });
  }

  // Deduplicate upcoming by name
  const seenUp = new Set();
  const uniqueUpcoming = upcoming.filter(u => { const k = `${u.nombre}-${u.fecha}`; if (seenUp.has(k)) return false; seenUp.add(k); return true; });

  console.log(`[BIRTHDAY] Sent: ${sent}, Skipped: ${skipped}, Upcoming (7d): ${uniqueUpcoming.length}`);
  return { today: { sent, skipped, total: uniqueDest.length }, upcoming: uniqueUpcoming };
}

// ══════════════════════════════════════════════════
// TASK 4: Auto-unpublish expired announcements
// ══════════════════════════════════════════════════
async function taskExpireAnnouncements(base44) {
  const now = new Date();
  const announcements = await base44.asServiceRole.entities.Announcement.filter({ publicado: true });
  let unpublished = 0;

  for (const a of announcements) {
    let expired = false;

    // Check fecha_caducidad_calculada (datetime)
    if (a.fecha_caducidad_calculada && new Date(a.fecha_caducidad_calculada) < now) {
      expired = true;
    }
    // Check fecha_expiracion (date)
    else if (a.fecha_expiracion && a.fecha_expiracion < now.toISOString().split('T')[0]) {
      expired = true;
    }

    if (expired) {
      await base44.asServiceRole.entities.Announcement.update(a.id, { publicado: false, banner_activo: false });
      unpublished++;
      console.log(`[ANNOUNCEMENTS] ⏰ Unpublished: "${a.titulo}"`);
    }
  }

  console.log(`[ANNOUNCEMENTS] Unpublished ${unpublished} expired announcements`);
  return { unpublished, checked: announcements.length };
}

// ══════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    console.log('═══════════════════════════════════════');
    console.log('  DAILY UNIFIED TASKS - Starting...');
    console.log('═══════════════════════════════════════');

    const callups = await taskAutoCloseCallups(base44);
    const codes = await taskExpireAccessCodes(base44);
    const birthdays = await taskBirthdays(base44);
    const announcements = await taskExpireAnnouncements(base44);

    console.log('═══════════════════════════════════════');
    console.log('  DAILY UNIFIED TASKS - Complete!');
    console.log('═══════════════════════════════════════');

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      callups,
      accessCodes: codes,
      birthdays,
      announcements
    });
  } catch (error) {
    console.error('[DAILY] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});