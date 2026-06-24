import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import webpush from 'npm:web-push@3.6.7';

// Parser RSS/Atom mínimo sin dependencias externas
function parseFeed(xml) {
  const items = [];
  // RSS <item> o Atom <entry>
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  for (const block of blocks) {
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      if (!m) return '';
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .trim();
    };
    // Enlace: RSS usa <link>texto</link>, Atom usa <link href="...">
    let link = pick('link');
    if (!link) {
      const lm = block.match(/<link\b[^>]*href=["']([^"']+)["']/i);
      if (lm) link = lm[1];
    }
    const guid = pick('guid') || pick('id') || link || pick('title');
    items.push({
      titulo: pick('title'),
      resumen: pick('description') || pick('summary') || pick('content'),
      enlace: link,
      guid,
      fecha: pick('pubDate') || pick('published') || pick('updated') || '',
    });
  }
  return items;
}

function matchesKeywords(item, keywords) {
  if (!keywords || keywords.length === 0) return true;
  const hay = `${item.titulo} ${item.resumen}`.toLowerCase();
  return keywords.some((k) => hay.includes(String(k).toLowerCase()));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Permitir ejecución por scheduler (sin user) o por admin manual
    let isManual = false;
    try {
      const user = await base44.auth.me();
      if (user) {
        if (user.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
        isManual = true;
      }
    } catch (_) { /* scheduled run, no user */ }

    const sources = await base44.asServiceRole.entities.GrantSource.filter({ activa: true });
    const summary = { fuentes_revisadas: 0, nuevas: 0, errores: 0, detalles: [] };
    const nuevasAlertas = [];

    for (const source of sources) {
      summary.fuentes_revisadas++;
      try {
        const res = await fetch(source.rss_url, {
          headers: { 'User-Agent': 'CD-Bustarviejo-GrantWatcher/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        const items = parseFeed(xml).filter((it) => it.titulo);

        let nuevasFuente = 0;
        for (const item of items) {
          if (!matchesKeywords(item, source.palabras_clave)) continue;
          // Evitar duplicados por guid
          const existing = await base44.asServiceRole.entities.GrantAlert.filter({ guid: item.guid });
          if (existing.length > 0) continue;

          let fechaPub = null;
          if (item.fecha) {
            const d = new Date(item.fecha);
            if (!isNaN(d.getTime())) fechaPub = d.toISOString();
          }

          const alerta = await base44.asServiceRole.entities.GrantAlert.create({
            titulo: item.titulo.slice(0, 300),
            resumen: (item.resumen || '').slice(0, 1500),
            enlace: item.enlace || '',
            fuente_id: source.id,
            fuente_nombre: source.nombre,
            categoria: source.categoria || 'Otra',
            fecha_publicacion: fechaPub,
            guid: item.guid,
            estado: 'nueva',
            leida: false,
          });
          nuevasAlertas.push(alerta);
          nuevasFuente++;
        }

        await base44.asServiceRole.entities.GrantSource.update(source.id, {
          ultima_revision: new Date().toISOString(),
          ultimo_error: '',
          total_encontradas: (source.total_encontradas || 0) + nuevasFuente,
        });
        summary.nuevas += nuevasFuente;
        summary.detalles.push({ fuente: source.nombre, nuevas: nuevasFuente });
      } catch (err) {
        summary.errores++;
        summary.detalles.push({ fuente: source.nombre, error: err.message });
        try {
          await base44.asServiceRole.entities.GrantSource.update(source.id, {
            ultima_revision: new Date().toISOString(),
            ultimo_error: err.message,
          });
        } catch (_) {}
      }
    }

    // Push a todos los admins si hay novedades
    if (nuevasAlertas.length > 0) {
      try {
        webpush.setVapidDetails(
          'mailto:CDBUSTARVIEJO@GMAIL.COM',
          Deno.env.get('VAPID_PUBLIC_KEY'),
          Deno.env.get('VAPID_PRIVATE_KEY')
        );
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        const adminEmails = admins.map((a) => a.email).filter(Boolean);
        const subs = [];
        for (const email of adminEmails) {
          const s = await base44.asServiceRole.entities.PushSubscription.filter({ usuario_email: email, activa: true });
          subs.push(...s);
        }
        const n = nuevasAlertas.length;
        const titulo = n === 1 ? 'Nueva subvención detectada' : `${n} nuevas subvenciones detectadas`;
        const cuerpo = n === 1 ? nuevasAlertas[0].titulo.slice(0, 120) : 'Revisa el panel de subvenciones del club';
        const payloadJson = JSON.stringify({
          title: titulo,
          body: cuerpo,
          tag: 'grant-alert',
          requireInteraction: false,
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
        console.error('Error enviando push de subvenciones:', e.message);
      }
    }

    return Response.json({ success: true, manual: isManual, ...summary });
  } catch (error) {
    console.error('Error en checkGrantFeeds:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});