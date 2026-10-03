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

    const { buscar } = await req.json().catch(() => ({}));
    const hallazgos = [];
    const fed = {}; // key -> { fecha, categoria }
    for (const t of teams) {
      const txt = clean(await dec(await fetch(`${B}/nfg/NPcd/NFG_GC_VisLicenciasEquipo?cod_primaria=${CLUB}&Codigo_Equipo=${t.c}`, { headers: { Cookie: ck() } })));
      if (buscar) {
        const i = txt.toUpperCase().indexOf(buscar.toUpperCase());
        if (i >= 0) hallazgos.push({ equipo: t.n, texto: txt.slice(Math.max(0, i - 150), i + 200), en_vigor_desde: txt.indexOf('licencia en vigor'), pos: i });
        continue;
      }
      // Incluye fichas en vigor y en tramitación: la última fecha de la fila es la del reconocimiento
      for (const m of txt.matchAll(/\| [0-9A-Z]{8,10} \| ([^|]+?) \| \w+ \|((?: \d\d-\d\d-\d{4} \|)+)/g)) {
        const ds = m[2].match(/\d\d-\d\d-\d{4}/g);
        if (ds.length < 2) continue;
        const [d, mo, y] = ds[ds.length - 1].split('-');
        const k = key(m[1]); const fecha = `${y}-${mo}-${d}`;
        const [bd, bm, by] = ds[0].split('-');
        if (!fed[k] || fecha > fed[k].fecha) fed[k] = { fecha, categoria: t.n, nac: `${by}-${bm}-${bd}`, tokens: k.split(' ') };
      }
    }

    if (buscar) return Response.json({ hallazgos });
    const sr = base44.asServiceRole.entities;
    const players = await sr.Player.filter({ activo: true }, '-created_date', 1000);
    const existentes = await sr.ReconocimientoMedico.list('-created_date', 2000);
    const byJugador = Object.fromEntries(existentes.map((r) => [r.jugador_id, r]));
    const now = new Date().toISOString();
    const crear = [], actualizar = [];
    for (const p of players) {
      if (`${p.categoria_principal || ''} ${p.deporte || ''}`.toLowerCase().includes('baloncesto')) continue;
      let f = fed[key(p.nombre)] || null;
      if (!f && p.fecha_nacimiento) {
        // Nombre escrito distinto (Emma/Enma, un solo apellido...): misma fecha de nacimiento + algún apellido/nombre en común
        const toks = key(p.nombre).split(' ').filter((x) => x.length > 2);
        const cands = Object.values(fed).filter((x) => x.nac === p.fecha_nacimiento.slice(0, 10) && toks.some((tk) => x.tokens.includes(tk)));
        // Desempate (hermanos gemelos): gana el que más palabras comparte, admitiendo 1 letra distinta
        const near = (a, b) => a === b || (a.length === b.length && a.length > 3 && [...a].filter((c, i) => c !== b[i]).length === 1);
        const score = (x) => toks.filter((tk) => x.tokens.some((ft) => near(tk, ft))).length;
        const sc = cands.map(score); const max = Math.max(...sc, 0);
        if (cands.length && sc.filter((s) => s === max).length === 1) f = cands[sc.indexOf(max)];
      }
      const prev = byJugador[p.id];
      const data = {
        jugador_id: p.id, jugador_nombre: p.nombre,
        categoria: f?.categoria || p.categoria_principal || p.deporte || '',
        fecha_vencimiento: f?.fecha || null,
        email_padre: p.email_padre || '', email_tutor_2: p.email_tutor_2 || '', email_jugador: p.email_jugador || p.acceso_menor_email || '',
        ultima_sincronizacion: now,
      };
      // Si ya pasó el reconocimiento (la Federación da una fecha nueva y más tarde), la cita ya no sirve: se quita
      if (prev?.cita_pdf_uri && data.fecha_vencimiento && (!prev.fecha_vencimiento || data.fecha_vencimiento > prev.fecha_vencimiento)) {
        Object.assign(data, { cita_pdf_uri: null, cita_pdf_nombre: null, cita_fecha_subida: null, cita_subida_por: null });
      }
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