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

// Tarea programada: envía recordatorios de renovación a socios según su tipo de pago.
// - Pago único / transferencia: recordatorio 30, 15, 7 días antes de fecha_vencimiento
// - Socio-padre sin hijos en nueva temporada: recordatorio para que renueve o pague cuota
// - Suscripción: NO se envía recordatorio (se renueva sola)
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Verificar admin
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const results = { reminders_sent: 0, parent_reminders_sent: 0, errors: [] };

  try {
    // 1. Obtener temporada activa
    let temporada;
    let seasonConfig;
    try {
      const configs = await base44.asServiceRole.entities.SeasonConfig.list();
      seasonConfig = configs.find(c => c.activa === true);
      temporada = seasonConfig?.temporada;
    } catch {}
    if (!temporada) {
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      temporada = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    }

    // 2. Obtener todos los socios de la temporada activa
    const allMembers = await base44.asServiceRole.entities.ClubMember.filter({ temporada });

    // 3. RECORDATORIOS DE RENOVACIÓN (pago único y transferencia)
    const membersNeedingReminder = allMembers.filter(m => 
      m.estado_pago === 'Pagado' &&
      !m.renovacion_automatica &&
      m.fecha_vencimiento &&
      !m.es_socio_padre &&
      (m.origen_pago === 'stripe_unico' || m.origen_pago === 'transferencia' || !m.origen_pago)
    );

    for (const member of membersNeedingReminder) {
      try {
        const vencimiento = new Date(member.fecha_vencimiento);
        const diffDays = Math.ceil((vencimiento - now) / (1000 * 60 * 60 * 24));
        const count = member.recordatorio_renovacion_count || 0;

        let shouldSend = false;
        let reminderType = '';

        if (diffDays <= 30 && diffDays > 15 && count < 1) {
          shouldSend = true;
          reminderType = '30 días';
        } else if (diffDays <= 15 && diffDays > 7 && count < 2) {
          shouldSend = true;
          reminderType = '15 días';
        } else if (diffDays <= 7 && diffDays > 0 && count < 3) {
          shouldSend = true;
          reminderType = '7 días';
        }

        if (shouldSend && member.email) {
          await sendViaResend(member.email, `🔔 Tu membresía del CD Bustarviejo vence en ${reminderType}`, `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(to right, #ea580c, #15803d); padding: 20px; border-radius: 12px 12px 0 0;">
                <h2 style="color: white; margin: 0;">🔔 Recordatorio de renovación</h2>
              </div>
              <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p>Hola <strong>${member.nombre_completo}</strong>,</p>
                <p>Tu membresía de socio del CD Bustarviejo para la temporada <strong>${temporada}</strong> vence el <strong>${member.fecha_vencimiento}</strong>.</p>
                <p>Te quedan <strong>${diffDays} días</strong> de membresía.</p>
                <p>Para seguir disfrutando de los beneficios de socio, renueva tu cuota antes de que expire.</p>
                <p style="margin-top: 16px;">
                  <a href="https://manuelbermudo2804-tech.github.io/-club-landing-page-Bustarviejo/" style="display: inline-block; background: linear-gradient(to right, #ea580c, #15803d); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Renovar ahora →
                  </a>
                </p>
                <p style="color: #64748b; font-size: 12px; margin-top: 20px;">CD Bustarviejo</p>
              </div>
            </div>`);

          await base44.asServiceRole.entities.ClubMember.update(member.id, {
            recordatorio_renovacion_enviado: true,
            recordatorio_renovacion_fecha: new Date().toISOString(),
            recordatorio_renovacion_count: count + 1,
          });

          results.reminders_sent++;
          console.log(`[memberRenewalReminders] Enviado a ${member.email} (${reminderType}, count=${count + 1})`);
        }
      } catch (err) {
        results.errors.push({ member_id: member.id, error: err?.message });
        console.error(`[memberRenewalReminders] Error con ${member.email}:`, err?.message);
      }
    }

    // 4. SOCIOS-PADRE SIN HIJOS EN NUEVA TEMPORADA
    // Solo ejecutar esto cuando ya se ha abierto la nueva temporada (ej: a partir de junio)
    // Buscamos socios-padre de la temporada actual que no tienen hijos en la nueva temporada
    const parentMembers = allMembers.filter(m => 
      m.es_socio_padre === true &&
      m.estado_pago === 'Pagado' &&
      !m.recordatorio_renovacion_enviado
    );

    if (parentMembers.length > 0) {
      // Obtener jugadores activos de la temporada actual
      let activePlayers = [];
      try {
        activePlayers = await base44.asServiceRole.entities.Player.filter({ activo: true });
      } catch {}

      for (const parent of parentMembers) {
        try {
          const hijos = parent.jugadores_hijos || [];
          if (hijos.length === 0) continue;

          // Verificar si algún hijo sigue activo
          const tieneHijosActivos = hijos.some(h => 
            activePlayers.find(p => p.id === h.jugador_id && p.activo === true)
          );

          if (!tieneHijosActivos && parent.email) {
            const vencimiento = parent.fecha_vencimiento ? new Date(parent.fecha_vencimiento) : null;
            const diffDays = vencimiento ? Math.ceil((vencimiento - now) / (1000 * 60 * 60 * 24)) : 0;

            // Solo enviar si estamos cerca del vencimiento o pasado
            if (diffDays <= 30) {
              await sendViaResend(parent.email, '🔔 ¿Quieres seguir siendo socio del CD Bustarviejo?', `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(to right, #ea580c, #15803d); padding: 20px; border-radius: 12px 12px 0 0;">
                    <h2 style="color: white; margin: 0;">¿Quieres seguir con nosotros?</h2>
                  </div>
                  <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                    <p>Hola <strong>${parent.nombre_completo}</strong>,</p>
                    <p>Hemos visto que tus hijos no están inscritos en la nueva temporada del CD Bustarviejo.</p>
                    <p>Si quieres <strong>seguir siendo socio</strong> y disfrutar de los descuentos y beneficios del carnet, puedes renovar tu cuota de socio por solo <strong>${seasonConfig?.precio_socio || 25}€</strong>.</p>
                    <p>Si vas a inscribir a tus hijos más tarde, tu membresía se renovará automáticamente al hacerlo.</p>
                    <p style="margin-top: 16px;">
                      <a href="https://manuelbermudo2804-tech.github.io/-club-landing-page-Bustarviejo/" style="display: inline-block; background: linear-gradient(to right, #ea580c, #15803d); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Renovar como socio →
                      </a>
                    </p>
                    <p style="color: #64748b; font-size: 12px; margin-top: 20px;">CD Bustarviejo</p>
                  </div>
                </div>`);

              await base44.asServiceRole.entities.ClubMember.update(parent.id, {
                recordatorio_renovacion_enviado: true,
                recordatorio_renovacion_fecha: new Date().toISOString(),
                recordatorio_renovacion_count: 1,
              });

              results.parent_reminders_sent++;
              console.log(`[memberRenewalReminders] Socio-padre sin hijos: enviado a ${parent.email}`);
            }
          }
        } catch (err) {
          results.errors.push({ member_id: parent.id, error: err?.message });
        }
      }
    }

    console.log('[memberRenewalReminders] Completado', results);
    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('[memberRenewalReminders] Error general:', error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});