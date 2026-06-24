import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import webpush from 'npm:web-push@3.6.7';

// Vigilante diario de PLAZOS de las subvenciones que interesan al club.
// Revisa las GrantAlert en estado 'interesa' o 'revisando' y:
//  1) Si tienen fecha_limite -> avisa cuando faltan 7, 3 o 1 días.
//  2) Si vienen de la BDNS y aún no tenían plazo -> consulta su ficha oficial
//     para detectar si ya se ha publicado el extracto y se ha abierto el periodo.

function diasHasta(fechaIso) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(fechaIso);
  limite.setHours(0, 0, 0, 0);
  return Math.round((limite - hoy) / (1000 * 60 * 60 * 24));
}

// Extrae el código BDNS del enlace de infosubvenciones (.../convocatoria/909145)
function codigoBDNS(enlace) {
  const m = (enlace || '').match(/convocatoria\/(\d+)/);
  return m ? m[1] : null;
}

// Consulta la ficha JSON de la BDNS para ver si ya hay extracto publicado
async function consultarExtractoBDNS(codigo) {
  try {
    const url = `https://www.infosubvenciones.es/bdnstrans/api/convocatorias?numConv=${codigo}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'CD-Bustarviejo-GrantWatcher/1.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const conv = Array.isArray(json) ? json[0] : json;
    if (!conv) return null;
    // La BDNS marca el inicio/fin del periodo cuando se publica el extracto
    const inicio = conv.inicioSolicitud || conv.fechaInicioSolicitud || null;
    const fin = conv.finSolicitud || conv.fechaFinSolicitud || null;
    return { inicio, fin };
  } catch (_) {
    return null;
  }
}

async function enviarPush(base44, alertas, tipo) {
  if (alertas.length === 0) return;
  try {
    webpush.setVapidDetails(
      'mailto:CDBUSTARVIEJO@GMAIL.COM',
      Deno.env.get('VAPID_PUBLIC_KEY'),
      Deno.env.get('VAPID_PRIVATE_KEY')
    );
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const subs = [];
    for (const a of admins) {
      if (!a.email) continue;
      const s = await base44.asServiceRole.entities.PushSubscription.filter({ usuario_email: a.email, activa: true });
      subs.push(...s);
    }
    const n = alertas.length;
    let titulo, cuerpo;
    if (tipo === 'abierto') {
      titulo = n === 1 ? '📢 ¡Se abrió el plazo de una subvención!' : `📢 ${n} subvenciones con plazo abierto`;
      cuerpo = n === 1 ? alertas[0].titulo.slice(0, 120) : 'Ya puedes solicitarlas. Revisa el panel de subvenciones.';
    } else {
      titulo = n === 1 ? '⏰ Plazo de subvención a punto de cerrar' : `⏰ ${n} subvenciones a punto de cerrar`;
      cuerpo = n === 1 ? alertas[0].titulo.slice(0, 120) : 'Tienes solicitudes con el plazo terminando. Revísalas.';
    }
    const payloadJson = JSON.stringify({
      title: titulo,
      body: cuerpo,
      tag: 'grant-deadline',
      requireInteraction: true,
      data: { url: '/SubvencionesPanel', timestamp: new Date().toISOString() },
    });
    for (const sub of subs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { auth: sub.auth_key || sub.keys?.auth, p256dh: sub.p256dh_key || sub.keys?.p256dh },
        }, payloadJson, { urgency: 'high', TTL: 86400 });
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          try { await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false }); } catch (_) {}
        }
      }
    }
  } catch (e) {
    console.error('Error push plazos:', e.message);
  }
}

async function enviarEmail(base44, abiertas, cerrando) {
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const emails = admins.map((a) => a.email).filter(Boolean);
    if (emails.length === 0) return;

    let cuerpo = '<h2>Aviso de plazos de subvenciones</h2>';
    if (abiertas.length > 0) {
      cuerpo += '<h3>📢 Plazo recién abierto</h3><ul>';
      for (const a of abiertas) {
        cuerpo += `<li><strong>${a.titulo}</strong>${a.fecha_limite ? ` — cierra el ${a.fecha_limite}` : ''}<br><a href="${a.enlace}">Ver convocatoria oficial</a></li>`;
      }
      cuerpo += '</ul>';
    }
    if (cerrando.length > 0) {
      cuerpo += '<h3>⏰ A punto de cerrar</h3><ul>';
      for (const a of cerrando) {
        cuerpo += `<li><strong>${a.titulo}</strong> — quedan ${diasHasta(a.fecha_limite)} días (cierra el ${a.fecha_limite})<br><a href="${a.enlace}">Ver convocatoria oficial</a></li>`;
      }
      cuerpo += '</ul>';
    }
    cuerpo += '<p>Entra en el panel de Subvenciones del club para gestionarlas.</p>';

    for (const email of emails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: abiertas.length > 0 ? '📢 Subvención con plazo abierto — CD Bustarviejo' : '⏰ Subvención a punto de cerrar — CD Bustarviejo',
        body: cuerpo,
        from_name: 'CD Bustarviejo · Subvenciones',
      });
    }
  } catch (e) {
    console.error('Error email plazos:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let isManual = false;
    try {
      const user = await base44.auth.me();
      if (user) {
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
        isManual = true;
      }
    } catch (_) { /* scheduled run */ }

    // Subvenciones que el club está siguiendo
    const seguidas = [];
    for (const estado of ['interesa', 'revisando']) {
      const items = await base44.asServiceRole.entities.GrantAlert.filter({ estado });
      seguidas.push(...items);
    }

    const recienAbiertas = [];
    const cerrando = [];
    const summary = { seguidas: seguidas.length, comprobadas_bdns: 0, abiertas: 0, cerrando: 0 };

    for (const alerta of seguidas) {
      // CASO 1: ya tiene fecha límite -> comprobar proximidad del cierre
      if (alerta.fecha_limite) {
        const dias = diasHasta(alerta.fecha_limite);
        const yaAvisados = alerta.avisos_plazo_enviados || [];
        for (const umbral of [7, 3, 1]) {
          if (dias === umbral && !yaAvisados.includes(String(umbral))) {
            cerrando.push(alerta);
            await base44.asServiceRole.entities.GrantAlert.update(alerta.id, {
              avisos_plazo_enviados: [...yaAvisados, String(umbral)],
            });
            break;
          }
        }
        continue;
      }

      // CASO 2: sin fecha límite y viene de la BDNS -> consultar si ya hay extracto/plazo
      const codigo = codigoBDNS(alerta.enlace);
      if (!codigo) continue;
      summary.comprobadas_bdns++;
      const info = await consultarExtractoBDNS(codigo);
      if (info && info.inicio) {
        // ¡Se publicó el extracto y se abrió el plazo!
        const updates = { plazo_abierto_notificado: true };
        if (info.fin) {
          const d = new Date(info.fin);
          if (!isNaN(d.getTime())) updates.fecha_limite = d.toISOString().slice(0, 10);
        }
        if (!alerta.plazo_abierto_notificado) {
          recienAbiertas.push({ ...alerta, ...updates });
          await base44.asServiceRole.entities.GrantAlert.update(alerta.id, updates);
        }
      }
    }

    summary.abiertas = recienAbiertas.length;
    summary.cerrando = cerrando.length;

    if (recienAbiertas.length > 0) await enviarPush(base44, recienAbiertas, 'abierto');
    if (cerrando.length > 0) await enviarPush(base44, cerrando, 'cerrando');
    if (recienAbiertas.length > 0 || cerrando.length > 0) await enviarEmail(base44, recienAbiertas, cerrando);

    return Response.json({ success: true, manual: isManual, ...summary });
  } catch (error) {
    console.error('Error en checkGrantDeadlines:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});