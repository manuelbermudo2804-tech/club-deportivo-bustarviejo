import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ORIGINS = new Set([
  'https://www.cdbustarviejo.com',
  'https://cdbustarviejo.com'
]);
const cors = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.cdbustarviejo.com',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
});
const clean = (v) => String(v || '').trim().toUpperCase().replace(/[.\s-]/g, '');
Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const headers = cors(origin);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return Response.json({ error: 'Método no permitido' }, { status: 405, headers });
  if (!ALLOWED_ORIGINS.has(origin)) return Response.json({ error: 'Origen no autorizado' }, { status: 403, headers });
  try {
    const body = await req.json();
    if (body.action === 'pricing') {
      const pricingClient = createClientFromRequest(req);
      const cfgs = await pricingClient.asServiceRole.entities.CampusSettings.list('-created_date', 5);
      const configured = cfgs?.[0] || { precio_semana_general:60, precio_semana_socio:55, precio_quincena_general:110, precio_quincena_socio:95, precio_mes_general:200, precio_mes_socio:170 };
      return Response.json({ rates: {
        precio_semana_general:Number(configured.precio_semana_general),
        precio_semana_socio:Number(configured.precio_semana_socio),
        precio_quincena_general:Number(configured.precio_quincena_general),
        precio_quincena_socio:Number(configured.precio_quincena_socio),
        precio_cuatro_semanas_general:Number(configured.precio_mes_general),
        precio_cuatro_semanas_socio:Number(configured.precio_mes_socio)
      } }, { status:200, headers });
    }
    const email = String(body.email || '').trim().toLowerCase();
    const dni = clean(body.dni);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !dni || dni.length < 8 || dni.length > 12) {
      return Response.json({ error: 'Introduce un correo y DNI/NIE válidos.' }, { status: 400, headers });
    }
    const base44 = createClientFromRequest(req);
    const matches = await base44.asServiceRole.entities.ClubMember.filter({ email });
    const member = (matches || []).find(m => clean(m.dni) === dni && m.activo === true && String(m.estado_pago || '').toLowerCase() === 'pagado');
    if (!member) return Response.json({ verified: false, children: [] }, { status: 200, headers });
    const linked = [...(member.jugadores_hijos || []), ...(member.jugadores_relacionados || [])];
    const unique = new Map();
    for (const child of linked) {
      if (child?.jugador_id && child?.jugador_nombre) unique.set(child.jugador_id, { id: child.jugador_id, name: child.jugador_nombre });
    }
    for (const child of (member.campus_participantes || [])) {
      if (child?.participante_id && child?.participante_nombre) unique.set(child.participante_id, { id: child.participante_id, name: child.participante_nombre });
    }
    return Response.json({ verified: true, member_id: member.id, children: [...unique.values()] }, { status: 200, headers });
  } catch (error) {
    console.error('[campusMemberLookup]', error?.message);
    return Response.json({ error: 'No se ha podido verificar ahora. Inténtalo de nuevo.' }, { status: 500, headers });
  }
});