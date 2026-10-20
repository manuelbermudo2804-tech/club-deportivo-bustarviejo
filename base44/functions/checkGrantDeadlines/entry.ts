import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import webpush from "npm:web-push@3.6.7";

// Vigilante diario de PLAZOS de las subvenciones que interesan al club.
// Revisa las GrantAlert en estado 'interesa' o 'revisando' y:
//  1) Si tienen fecha_limite -> avisa cuando faltan 7, 3 o 1 días.
//  2) Si vienen de la BDNS y aún no tenían plazo -> consulta su ficha oficial
//     para detectar si ya se ha publicado el extracto y se ha abierto el periodo.

function fechaMadridIso(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function diasHasta(fechaIso) {
  // Comparar días naturales en UTC evita errores de zona horaria y cambios de horario.
  const fecha = String(fechaIso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const limiteMs = Date.parse(`${fecha}T00:00:00.000Z`);
  const hoyMs = Date.parse(`${fechaMadridIso()}T00:00:00.000Z`);
  if (!Number.isFinite(limiteMs) || !Number.isFinite(hoyMs)) return null;
  return Math.round((limiteMs - hoyMs) / 86400000);
}

// Extrae el código BDNS del enlace de infosubvenciones (.../convocatoria/909145)
function codigoBDNS(enlace) {
  const m = (enlace || "").match(/convocatoria\/(\d+)/);
  return m ? m[1] : null;
}

// Consulta la ficha JSON de la BDNS para ver si ya hay extracto publicado
async function consultarExtractoBDNS(codigo) {
  try {
    const url =
      `https://www.infosubvenciones.es/bdnstrans/api/convocatorias?numConv=${codigo}`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "CD-Bustarviejo-GrantWatcher/1.0",
      },
    });
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
  if (alertas.length === 0) return false;
  let entregas = 0;
  try {
    webpush.setVapidDetails(
      "mailto:CDBUSTARVIEJO@GMAIL.COM",
      Deno.env.get("VAPID_PUBLIC_KEY"),
      Deno.env.get("VAPID_PRIVATE_KEY"),
    );
    const admins = await base44.asServiceRole.entities.User.filter({
      role: "admin",
    });
    const subs = [];
    for (const a of admins) {
      if (!a.email) continue;
      const s = await base44.asServiceRole.entities.PushSubscription.filter({
        usuario_email: a.email,
        activa: true,
      });
      subs.push(...s);
    }
    const n = alertas.length;
    let titulo, cuerpo;
    if (tipo === "abierto") {
      titulo = n === 1
        ? "📢 ¡Se abrió el plazo de una subvención!"
        : `📢 ${n} subvenciones con plazo abierto`;
      cuerpo = n === 1
        ? alertas[0].titulo.slice(0, 120)
        : "Ya puedes solicitarlas. Revisa el panel de subvenciones.";
    } else {
      titulo = n === 1
        ? "⏰ Plazo de subvención a punto de cerrar"
        : `⏰ ${n} subvenciones a punto de cerrar`;
      cuerpo = n === 1
        ? alertas[0].titulo.slice(0, 120)
        : "Tienes solicitudes con el plazo terminando. Revísalas.";
    }
    const payloadJson = JSON.stringify({
      title: titulo,
      body: cuerpo,
      tag: "grant-deadline",
      requireInteraction: true,
      data: { url: "/SubvencionesPanel", timestamp: new Date().toISOString() },
    });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth_key || sub.keys?.auth,
              p256dh: sub.p256dh_key || sub.keys?.p256dh,
            },
          },
          payloadJson,
          { urgency: "high", TTL: 86400 },
        );
        entregas++;
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          try {
            await base44.asServiceRole.entities.PushSubscription.update(
              sub.id,
              { activa: false },
            );
          } catch (_) {}
        }
      }
    }
  } catch (e) {
    console.error("Error push plazos:", e.message);
  }
  return entregas > 0;
}

async function enviarEmail(base44, abiertas, cerrando) {
  let entregas = 0;
  try {
    const admins = await base44.asServiceRole.entities.User.filter({
      role: "admin",
    });
    const emails = admins.map((a) => a.email).filter(Boolean);
    if (emails.length === 0) return;

    let cuerpo = "<h2>Aviso de plazos de subvenciones</h2>";
    if (abiertas.length > 0) {
      cuerpo += "<h3>📢 Plazo recién abierto</h3><ul>";
      for (const a of abiertas) {
        cuerpo += `<li><strong>${a.titulo}</strong>${
          a.fecha_limite ? ` — cierra el ${a.fecha_limite}` : ""
        }<br><a href="${a.enlace}">Ver convocatoria oficial</a></li>`;
      }
      cuerpo += "</ul>";
    }
    if (cerrando.length > 0) {
      cuerpo += "<h3>⏰ A punto de cerrar</h3><ul>";
      for (const a of cerrando) {
        cuerpo += `<li><strong>${a.titulo}</strong> — quedan ${
          diasHasta(a.fecha_limite)
        } días (cierra el ${a.fecha_limite})<br><a href="${a.enlace}">Ver convocatoria oficial</a></li>`;
      }
      cuerpo += "</ul>";
    }
    cuerpo +=
      "<p>Entra en el panel de Subvenciones del club para gestionarlas.</p>";

    for (const email of emails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: abiertas.length > 0
          ? "📢 Subvención con plazo abierto — CD Bustarviejo"
          : "⏰ Subvención a punto de cerrar — CD Bustarviejo",
        body: cuerpo,
        from_name: "CD Bustarviejo · Subvenciones",
      });
      entregas++;
    }
  } catch (e) {
    console.error("Error email plazos:", e.message);
  }
  return entregas > 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let isManual = false;
    try {
      const user = await base44.auth.me();
      if (user) {
        if (user.role !== "admin") {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        isManual = true;
      }
    } catch (_) { /* scheduled run */ }

    // Subvenciones que el club está siguiendo
    const seguidas = [];
    for (const estado of ["interesa", "revisando"]) {
      const items = await base44.asServiceRole.entities.GrantAlert.filter({
        estado,
      });
      seguidas.push(...items);
    }

    const recienAbiertas = [];
    const cerrando = [];
    const summary = {
      seguidas: seguidas.length,
      comprobadas_bdns: 0,
      abiertas: 0,
      cerrando: 0,
    };

    for (const alerta of seguidas) {
      // CASO 1: ya tiene fecha límite -> comprobar proximidad del cierre
      if (alerta.fecha_limite) {
        const dias = diasHasta(alerta.fecha_limite);
        if (dias === null) {
          console.warn(
            "Fecha límite no válida en subvención:",
            alerta.id,
            alerta.fecha_limite,
          );
          continue;
        }
        const yaAvisados = Array.isArray(alerta.avisos_plazo_enviados)
          ? alerta.avisos_plazo_enviados
          : [];
        // Si una ejecución diaria falla, emitir el siguiente aviso pendiente dentro del umbral,
        // en vez de perderlo por no coincidir exactamente con el día 7, 3 o 1.
        for (const umbral of [1, 3, 7]) {
          if (
            dias >= 0 && dias <= umbral && !yaAvisados.includes(String(umbral))
          ) {
            cerrando.push({ ...alerta, _umbralAvisoPendiente: String(umbral) });
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
        const updates = {};
        if (info.fin) {
          const fin = String(info.fin).slice(0, 10);
          if (
            /^\d{4}-\d{2}-\d{2}$/.test(fin) &&
            !Number.isNaN(Date.parse(`${fin}T00:00:00.000Z`))
          ) updates.fecha_limite = fin;
        }
        if (!alerta.plazo_abierto_notificado) {
          recienAbiertas.push({ ...alerta, ...updates });
          // Guardamos la fecha detectada, pero no marcamos el aviso como enviado
          // hasta que haya constancia de al menos una entrega.
          if (Object.keys(updates).length > 0) {
            await base44.asServiceRole.entities.GrantAlert.update(
              alerta.id,
              updates,
            );
          }
        }
      }
    }

    summary.abiertas = recienAbiertas.length;
    summary.cerrando = cerrando.length;

    const abiertasPushOk = recienAbiertas.length > 0
      ? await enviarPush(base44, recienAbiertas, "abierto")
      : false;
    const cerrandoPushOk = cerrando.length > 0
      ? await enviarPush(base44, cerrando, "cerrando")
      : false;
    const emailOk = recienAbiertas.length > 0 || cerrando.length > 0
      ? await enviarEmail(base44, recienAbiertas, cerrando)
      : false;

    // Registrar avisos solo si al menos un canal confirma entrega. Si todos fallan,
    // el siguiente ciclo volverá a intentarlo en lugar de perder el aviso.
    for (const alerta of recienAbiertas) {
      if (abiertasPushOk || emailOk) {
        await base44.asServiceRole.entities.GrantAlert.update(alerta.id, {
          plazo_abierto_notificado: true,
        });
      }
    }
    const confirmados = cerrandoPushOk || emailOk;
    if (confirmados) {
      for (const alerta of cerrando) {
        const umbral = alerta._umbralAvisoPendiente;
        if (!umbral) continue;
        const actuales = Array.isArray(alerta.avisos_plazo_enviados)
          ? alerta.avisos_plazo_enviados
          : [];
        await base44.asServiceRole.entities.GrantAlert.update(alerta.id, {
          avisos_plazo_enviados: [...new Set([...actuales, umbral])],
        });
      }
    }

    return Response.json({
      success: true,
      manual: isManual,
      ...summary,
      notificaciones_confirmadas: abiertasPushOk || cerrandoPushOk || emailOk,
    });
  } catch (error) {
    console.error("Error en checkGrantDeadlines:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
