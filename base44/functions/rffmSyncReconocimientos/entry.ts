import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const B = 'https://intranet.ffmadrid.es';
const CLUB = '1000188';
const dec = async (r) => new TextDecoder('iso-8859-1').decode(await r.arrayBuffer());
// Clave de nombre independiente del orden ("APELLIDOS, NOMBRE" vs "Nombre Apellidos")
const key = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');

async function login() {
  const jar = {};
  const add = (r) => { for (const c of (r.headers.getSetCookie?.() || [])) { const kv = c.split(';')[0]; jar[kv.split('=')[0]] = kv; } };
  const ck = () => Object.values(jar).join('; ');
  let r = await fetch(B + '/nfg/NPcd/NFG_VisClasificacion', { redirect: 'manual' }); add(r);
  let lu = r.headers.get('location') || '/nfg/NLogin'; if (!lu.startsWith('http')) lu = B + lu;
  r = await fetch(lu, { redirect: 'manual', headers: { Cookie: ck() } }); add(r);
  const h = await r.text();
  let act = (h.match(/<form[^>]*action="([^"]+)"/i) || [])[1] || '/nfg/NLogin'; if (!act.startsWith('http')) act = B + act;
  const hid = {};
  for (const m of h.matchAll(/<input[^>]*type="hidden"[^>]*>/gi)) {
    const n = (m[0].match(/name="([^"]+)"/) || [])[1]; const v = (m[0].match(/value="([^"]*)"/) || [])[1] || '';
    if (n) hid[n] = v;
  }
  const uf = (h.match(/<input[^>]*type="text"[^>]*name="([^"]+)"/i) || [])[1] || 'NUser';
  const pf = (h.match(/<input[^>]*type="password"[^>]*name="([^"]+)"/i) || [])[1] || 'NPass';
  r = await fetch(act, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: ck(), Referer: lu },
    body: new URLSearchParams({ ...hid, [uf]: Deno.env.get('RFFM_USER'), [pf]: Deno.env.get('RFFM_PASSWORD') }).toString() }); add(r);
  let loc = r.headers.get('location');
  for (let i = 0; i < 5 && loc; i++) { r = await fetch(loc.startsWith('http') ? loc : B + loc, { redirect: 'manual', headers: { Cookie: ck() } }); add(r); loc = r.headers.get('location'); }
  await dec(r);
  return ck;
}

const clean = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '|').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/(\s*\|\s*)+/g, ' | ');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const ck = await login();
    const g = await dec(await fetch(`${B}/nfg/NPcd/NFG_GC_GestionLicencias?cod_primaria=${CLUB}`, { headers: { Cookie: ck() } }));
    const teams = [...g.matchAll(/Codigo_Equipo=(\d+)">([^<]+)<\/a>[\s\S]*?nowrap>&nbsp;([^<]+)</g)].map((m) => ({ c: m[1], n: m[3].trim() }));
    if (!teams.length) throw new Error('No se pudo leer la intranet de la Federación');

    const fed = {}; // key -> { fecha, categoria }
    for (const t of teams) {
      const txt = clean(await dec(await fetch(`${B}/nfg/NPcd/NFG_GC_VisLicenciasEquipo?cod_primaria=${CLUB}&Codigo_Equipo=${t.c}`, { headers: { Cookie: ck() } })));
      const part = txt.slice(txt.indexOf('licencia en vigor'));
      for (const m of part.matchAll(/\| [0-9A-Z]{8,10} \| ([^|]+?) \| \w+ \| \d\d-\d\d-\d{4} \| \d\d-\d\d-\d{4} \| (\d\d)-(\d\d)-(\d{4}) \|/g)) {
        const k = key(m[1]); const fecha = `${m[4]}-${m[3]}-${m[2]}`;
        if (!fed[k] || fecha > fed[k].fecha) fed[k] = { fecha, categoria: t.n };
      }
    }

    const sr = base44.asServiceRole.entities;
    const players = await sr.Player.filter({ activo: true }, '-created_date', 1000);
    const existentes = await sr.ReconocimientoMedico.list('-created_date', 2000);
    const byJugador = Object.fromEntries(existentes.map((r) => [r.jugador_id, r]));
    const now = new Date().toISOString();
    const crear = [], actualizar = [];
    for (const p of players) {
      const f = fed[key(p.nombre)] || null;
      const prev = byJugador[p.id];
      const data = {
        jugador_id: p.id, jugador_nombre: p.nombre,
        categoria: f?.categoria || p.categoria_principal || p.deporte || '',
        fecha_vencimiento: f?.fecha || null,
        email_padre: p.email_padre || '', email_tutor_2: p.email_tutor_2 || '', email_jugador: p.email_jugador || p.acceso_menor_email || '',
        ultima_sincronizacion: now,
      };
      if (prev) actualizar.push({ id: prev.id, ...data }); else crear.push(data);
    }
    for (let i = 0; i < crear.length; i += 200) await sr.ReconocimientoMedico.bulkCreate(crear.slice(i, i + 200));
    for (let i = 0; i < actualizar.length; i += 200) await sr.ReconocimientoMedico.bulkUpdate(actualizar.slice(i, i + 200));

    const conFecha = [...crear, ...actualizar].filter((d) => d.fecha_vencimiento).length;
    return Response.json({ jugadores: players.length, con_fecha: conFecha, sin_fecha: players.length - conFecha });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});