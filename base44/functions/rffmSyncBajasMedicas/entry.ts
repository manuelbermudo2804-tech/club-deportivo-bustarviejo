import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const B = 'https://intranet.ffmadrid.es';
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const dec = async (r) => new TextDecoder('iso-8859-1').decode(await r.arrayBuffer());

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
  return { ck, html: await dec(r) };
}

function parseBajas(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '|').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/(\s*\|\s*)+/g, '|');
  const i = text.indexOf('Fecha Baja M');
  if (i < 0) return [];
  const parts = text.slice(i).split('|').slice(1).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (let k = 0; k + 3 < parts.length; k += 4) {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(parts[k + 3])) break;
    const [d, m, y] = parts[k + 3].split('-');
    out.push({ dni: parts[k], nombre: parts[k + 1], categoria: parts[k + 2], fecha: `${y}-${m}-${d}` });
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { html } = await login();
    if (!html.includes('NFG_GC_VisLicenciasEquipo')) throw new Error('No se pudo leer la intranet de la Federación');
    const bajas = parseBajas(html);

    const players = await base44.asServiceRole.entities.Player.filter({ activo: true }, '-created_date', 1000);
    const byDni = {}, byName = {};
    for (const p of players) {
      if (p.dni_jugador) byDni[norm(p.dni_jugador)] = p;
      byName[norm(p.nombre)] = p;
    }

    const marcados = [], sinCoincidencia = [], idsBaja = new Set();
    for (const b of bajas) {
      const p = byDni[norm(b.dni)] || byName[norm(b.nombre)];
      if (!p) { sinCoincidencia.push(b.nombre); continue; }
      idsBaja.add(p.id);
      if (p.baja_medica_rffm && p.fecha_baja_medica_rffm === b.fecha) continue;
      const data = { baja_medica_rffm: true, fecha_baja_medica_rffm: b.fecha };
      // Solo tocamos 'lesionado' si no lo había marcado ya la familia/entrenador
      if (!p.lesionado) {
        data.lesionado = true;
        data.lesionado_por_rffm = true;
        data.motivo_indisponibilidad = `Baja médica en la Federación desde ${b.fecha.split('-').reverse().join('/')}`;
      }
      await base44.asServiceRole.entities.Player.update(p.id, data);
      marcados.push(p.nombre);
    }

    const altas = [];
    for (const p of players) {
      if (!p.baja_medica_rffm || idsBaja.has(p.id)) continue;
      const data = { baja_medica_rffm: false, fecha_baja_medica_rffm: null };
      if (p.lesionado_por_rffm) { data.lesionado = false; data.lesionado_por_rffm = false; data.motivo_indisponibilidad = ''; }
      await base44.asServiceRole.entities.Player.update(p.id, data);
      altas.push(p.nombre);
    }

    return Response.json({ bajas_federacion: bajas.length, marcados, altas, sin_coincidencia: sinCoincidencia });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});