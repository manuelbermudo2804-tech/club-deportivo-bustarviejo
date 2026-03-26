import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CD Bustarviejo <noreply@cdbustarviejo.com>';
const MAX_AUTO_RESENDS = 3;

const SOCIAL_FOOTER = `<div style="background:#1e293b;padding:24px;text-align:center;border-radius:0 0 12px 12px;margin-top:24px;"><div style="margin-bottom:12px;"><a href="https://www.cdbustarviejo.com" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:8px;">🌐 www.cdbustarviejo.com</a></div><div style="margin-bottom:14px;"><a href="https://www.facebook.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Facebook">📘</a><a href="https://www.instagram.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Instagram">📸</a></div><div style="color:#94a3b8;font-size:12px;line-height:1.6;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a></div></div>`;

function injectFooter(html) {
  if (html.includes('www.cdbustarviejo.com')) return html;
  if (html.includes('</body>')) return html.replace('</body>', SOCIAL_FOOTER + '</body>');
  return html + SOCIAL_FOOTER;
}

async function sendWithResend(to, subject, html) {
  if (!RESEND_API_KEY) { console.error('[RESEND] API key not set'); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html: injectFooter(html) })
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
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:12px;">Recordatorio nº${reenvioNum}. Ayuda: info@cdbustarviejo.com</p>
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
// TASK 5: Remind parents with pending callup confirmations
// Sends reminders 48h and 24h before the match
// ══════════════════════════════════════════════════
async function taskCallupReminders(base44) {
  const now = new Date();
  const allCallups = await base44.asServiceRole.entities.Convocatoria.list('-fecha_partido', 200);
  let sent = 0, skipped = 0;

  for (const c of allCallups) {
    if (!c.publicada || c.cerrada || c.estado_convocatoria === 'cancelada') continue;

    // Calculate hours until match
    const matchDateTime = new Date(c.fecha_partido + 'T' + (c.hora_partido || '12:00'));
    const hoursUntil = (matchDateTime - now) / (1000 * 60 * 60);

    // Only remind between 20-50h before (covers both 24h and 48h windows)
    if (hoursUntil < 20 || hoursUntil > 50) continue;

    // Determine reminder type
    const reminderType = hoursUntil <= 26 ? '24h' : '48h';

    const pendingPlayers = (c.jugadores_convocados || []).filter(j => j.confirmacion === 'pendiente');
    if (!pendingPlayers.length) continue;

    for (const jp of pendingPlayers) {
      const emails = [];
      if (jp.email_padre) emails.push(jp.email_padre);
      if (jp.email_jugador && !jp.email_padre) emails.push(jp.email_jugador);

      if (!emails.length) continue;

      // Check if we already sent this specific reminder
      const reminderKey = `callup-reminder-${c.id}-${jp.jugador_id}-${reminderType}`;
      try {
        const existing = await base44.asServiceRole.entities.AppNotification.filter({ referencia_id: reminderKey });
        if (existing.length > 0) { skipped++; continue; }
      } catch { /* continue if filter fails */ }

      // Send email reminder
      const fechaStr = new Date(c.fecha_partido).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      const urgency = reminderType === '24h' ? '⚠️ MAÑANA' : '⏰ En 2 días';
      const subject = `${urgency} - Confirma asistencia de ${jp.jugador_nombre} al partido`;
      const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1);">
  <div style="background:${reminderType === '24h' ? '#dc2626' : '#ea580c'};padding:24px;text-align:center;color:#fff;">
    <div style="font-size:36px;margin-bottom:8px;">${reminderType === '24h' ? '⚠️' : '⏰'}</div>
    <h1 style="margin:0;font-size:22px;">Confirmación pendiente</h1>
    <p style="margin:8px 0 0;opacity:.9;font-size:14px;">${jp.jugador_nombre} - ${c.categoria}</p>
  </div>
  <div style="padding:24px;text-align:center;">
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      <strong>${jp.jugador_nombre}</strong> está convocado para un partido que es <strong>${urgency.toLowerCase()}</strong> y aún no has confirmado si asistirá.
    </p>
    <div style="background:#fef3c7;border:2px solid #fbbf24;border-radius:12px;padding:16px;margin:16px 0;text-align:left;">
      <p style="margin:0 0 8px;font-weight:bold;color:#92400e;">📋 ${c.titulo}</p>
      <p style="margin:4px 0;color:#78350f;">📅 ${fechaStr} a las ${c.hora_partido || 'hora por confirmar'}</p>
      <p style="margin:4px 0;color:#78350f;">📍 ${c.ubicacion || 'Por confirmar'}</p>
      ${c.rival ? `<p style="margin:4px 0;color:#78350f;">⚽ vs ${c.rival}</p>` : ''}
    </div>
    <a href="https://app.cdbustarviejo.com/ParentCallups" style="display:inline-block;background:#ea580c;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:10px;margin-top:8px;">
      Confirmar Asistencia →
    </a>
    <p style="font-size:12px;color:#94a3b8;margin-top:16px;">Si ya has confirmado en la app, ignora este mensaje.</p>
  </div>
</div></body></html>`;

      for (const email of emails) {
        try {
          await sendWithResend(email, subject, html);
          sent++;
        } catch (err) {
          console.error(`[CALLUP-REMINDER] Error sending to ${email}:`, err.message);
        }
      }

      // Record that we sent this reminder
      try {
        await base44.asServiceRole.entities.AppNotification.create({
          usuario_email: emails[0],
          tipo: 'convocatoria_pendiente',
          titulo: `${urgency} - Confirma asistencia`,
          mensaje: `${jp.jugador_nombre} tiene una convocatoria pendiente: ${c.titulo}`,
          prioridad: 'importante',
          url_accion: '/ParentCallups',
          referencia_id: reminderKey,
          vista: false
        });
      } catch {}
    }
  }

  console.log(`[CALLUP-REMINDER] Sent: ${sent}, Skipped: ${skipped}`);
  return { sent, skipped };
}

// ══════════════════════════════════════════════════
// TASK 6: Cleanup old data (reduce DB volume)
// ══════════════════════════════════════════════════
async function taskCleanupOldData(base44) {
  const now = new Date();
  const stats = { birthdayLogs: 0, notifications: 0, chatMessages: 0, analyticsEvents: 0 };

  // 1. BirthdayLog older than 90 days
  const cutoff90 = new Date(now);
  cutoff90.setDate(cutoff90.getDate() - 90);
  const cutoff90Str = cutoff90.toISOString();
  try {
    const oldLogs = await base44.asServiceRole.entities.BirthdayLog.filter({
      created_date: { $lt: cutoff90Str }
    });
    for (const log of oldLogs) {
      await base44.asServiceRole.entities.BirthdayLog.delete(log.id);
      stats.birthdayLogs++;
    }
  } catch (e) { console.error('[CLEANUP] BirthdayLog error:', e.message); }

  // 2. AppNotification read (vista=true) older than 30 days
  const cutoff30 = new Date(now);
  cutoff30.setDate(cutoff30.getDate() - 30);
  const cutoff30Str = cutoff30.toISOString();
  try {
    const oldNotifs = await base44.asServiceRole.entities.AppNotification.filter({
      vista: true,
      created_date: { $lt: cutoff30Str }
    });
    for (const n of oldNotifs) {
      await base44.asServiceRole.entities.AppNotification.delete(n.id);
      stats.notifications++;
    }
  } catch (e) { console.error('[CLEANUP] AppNotification error:', e.message); }

  // 3. ChatMessage older than 6 months (deleted=true or very old)
  const cutoff180 = new Date(now);
  cutoff180.setDate(cutoff180.getDate() - 180);
  const cutoff180Str = cutoff180.toISOString();
  try {
    // Only delete messages marked as deleted
    const oldDeletedMsgs = await base44.asServiceRole.entities.ChatMessage.filter({
      eliminado: true,
      created_date: { $lt: cutoff180Str }
    });
    for (const m of oldDeletedMsgs) {
      await base44.asServiceRole.entities.ChatMessage.delete(m.id);
      stats.chatMessages++;
    }
  } catch (e) { console.error('[CLEANUP] ChatMessage error:', e.message); }

  // 4. AnalyticsEvent older than 60 days
  const cutoff60 = new Date(now);
  cutoff60.setDate(cutoff60.getDate() - 60);
  const cutoff60Str = cutoff60.toISOString();
  try {
    const oldEvents = await base44.asServiceRole.entities.AnalyticsEvent.filter({
      created_date: { $lt: cutoff60Str }
    });
    for (const ev of oldEvents) {
      await base44.asServiceRole.entities.AnalyticsEvent.delete(ev.id);
      stats.analyticsEvents++;
    }
  } catch (e) { console.error('[CLEANUP] AnalyticsEvent error:', e.message); }

  const total = stats.birthdayLogs + stats.notifications + stats.chatMessages + stats.analyticsEvents;
  console.log(`[CLEANUP] Deleted ${total} old records: ${JSON.stringify(stats)}`);
  return stats;
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
    const callupReminders = await taskCallupReminders(base44);
    const codes = await taskExpireAccessCodes(base44);
    const birthdays = await taskBirthdays(base44);
    const announcements = await taskExpireAnnouncements(base44);
    const cleanup = await taskCleanupOldData(base44);

    console.log('═══════════════════════════════════════');
    console.log('  DAILY UNIFIED TASKS - Complete!');
    console.log('═══════════════════════════════════════');

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      callups,
      callupReminders,
      accessCodes: codes,
      birthdays,
      announcements,
      cleanup
    });
  } catch (error) {
    console.error('[DAILY] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});