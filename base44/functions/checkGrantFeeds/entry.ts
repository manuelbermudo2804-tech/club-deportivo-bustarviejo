import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import webpush from 'npm:web-push@3.6.7';

// Fuente oficial: Base de Datos Nacional de Subvenciones (BDNS / infosubvenciones)
// Es el registro donde POR LEY se publican todas las convocatorias de España.
const BDNS_BASE = 'https://www.infosubvenciones.es/bdnstrans';

// Búsquedas que lanzamos contra la BDNS (cubren los intereses del club)
const BUSQUEDAS = ['deporte', 'deportivo', 'club deportivo', 'asociaciones deportivas', 'escuela deportiva'];

// Municipios/ámbitos relevantes para CD Bustarviejo (Madrid + cercanos + estatal)
const AMBITOS_RELEVANTES = [
  'MADRID', 'COMUNIDAD DE MADRID', 'BUSTARVIEJO', 'COLMENAR VIEJO', 'TRES CANTOS',
  'SOTO DEL REAL', 'MIRAFLORES', 'GUADALIX', 'CABRERA',
];

function normaliza(s) {
  return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

// Decide si una convocatoria es relevante para el club según su ámbito territorial
function esRelevante(conv) {
  const n1 = normaliza(conv.nivel1); // ESTATAL / AUTONOMICO / LOCAL
  const n2 = normaliza(conv.nivel2);
  const n3 = normaliza(conv.nivel3);
  // Ámbito estatal: siempre relevante (CSD, ministerios, fundaciones nacionales)
  if (n1.includes('ESTATAL')) return true;
  // Autonómico o local: solo si menciona Madrid o un municipio cercano
  const texto = `${n2} ${n3}`;
  return AMBITOS_RELEVANTES.some((a) => texto.includes(normaliza(a)));
}

async function buscarBDNS(termino) {
  const url = `${BDNS_BASE}/api/convocatorias/busqueda?page=0&pageSize=50&descripcion=${encodeURIComponent(termino)}&order=fechaRecepcion&direccion=desc`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'CD-Bustarviejo-GrantWatcher/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.content) ? json.content : [];
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

    const summary = { busquedas: BUSQUEDAS.length, revisadas: 0, relevantes: 0, nuevas: 0, errores: 0, detalles: [] };
    const nuevasAlertas = [];
    const vistos = new Set();

    for (const termino of BUSQUEDAS) {
      try {
        const convocatorias = await buscarBDNS(termino);
        let nuevasTermino = 0;
        for (const conv of convocatorias) {
          summary.revisadas++;
          const guid = `bdns-${conv.numeroConvocatoria || conv.id}`;
          if (vistos.has(guid)) continue; // ya procesada en esta misma ejecución
          if (!esRelevante(conv)) continue;
          summary.relevantes++;
          vistos.add(guid);

          // Evitar duplicados en BD por guid
          const existing = await base44.asServiceRole.entities.GrantAlert.filter({ guid });
          if (existing.length > 0) continue;

          const ambito = [conv.nivel3, conv.nivel2].filter(Boolean).join(' · ');
          let fechaPub = null;
          if (conv.fechaRecepcion) {
            const d = new Date(conv.fechaRecepcion);
            if (!isNaN(d.getTime())) fechaPub = d.toISOString();
          }

          const alerta = await base44.asServiceRole.entities.GrantAlert.create({
            titulo: (conv.descripcion || 'Convocatoria de subvención').replace(/\s+/g, ' ').trim().slice(0, 300),
            resumen: `Ámbito: ${ambito || conv.nivel1 || 'No especificado'} · Nº ${conv.numeroConvocatoria || conv.id}`,
            enlace: `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/${conv.numeroConvocatoria || conv.id}`,
            fuente_nombre: 'BDNS · Base de Datos Nacional de Subvenciones',
            categoria: conv.nivel1 && normaliza(conv.nivel1).includes('LOCAL') ? 'Ayuntamiento'
              : conv.nivel1 && normaliza(conv.nivel1).includes('AUTONOMICO') ? 'Comunidad de Madrid'
              : 'BOE / BOCM',
            fecha_publicacion: fechaPub,
            guid,
            estado: 'nueva',
            leida: false,
          });
          nuevasAlertas.push(alerta);
          nuevasTermino++;
        }
        summary.nuevas += nuevasTermino;
        summary.detalles.push({ busqueda: termino, nuevas: nuevasTermino });
      } catch (err) {
        summary.errores++;
        summary.detalles.push({ busqueda: termino, error: err.message });
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