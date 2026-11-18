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
    if (body.action === 'availability') {
      const availabilityClient = createClientFromRequest(req);
      const cfgs = await availabilityClient.asServiceRole.entities.CampusSettings.list('-created_date', 100);
      const configured = (cfgs || []).find(c => c.activo === true) || (cfgs || [])[0];
      if (!configured?.id) return Response.json({ error: 'El campus todavía no tiene una edición configurada.' }, { status: 409, headers });
      const season = String(configured.temporada || configured.fecha_inicio?.slice(0,4) || '2027');
      const [registrations, participants] = await Promise.all([
        availabilityClient.asServiceRole.entities.CampusRegistration.list('-created_date', 2000),
        availabilityClient.asServiceRole.entities.CampusParticipant.list('-created_date', 3000)
      ]);
      const registrationsById = new Map((registrations || []).map(r => [r.id, r]));
      const active = (participants || []).filter(p => {
        if (String(p.temporada || '2027') !== season || ['cancelado','lista_espera'].includes(String(p.estado || '').toLowerCase())) return false;
        const parent = registrationsById.get(p.registration_id);
        return !parent || !['cancelada','revision'].includes(String(parent.estado || '').toLowerCase());
      });
      const groups = [
        { key:'6-8', label:'6–8 años', capacity:configured.plazas_6_8 },
        { key:'9-11', label:'9–11 años', capacity:configured.plazas_9_11 },
        { key:'12-16', label:'12–16 años', capacity:configured.plazas_12_16 }
      ];
      const weeks = ['S1','S2','S3','S4','S5'];
      const matrix = groups.map(g => ({
        group:g.key, label:g.label,
        weeks:weeks.map(week => {
          const occupied = active.filter(p => p.grupo_edad === g.key && (p.semanas_ocupadas || []).includes(week)).length;
          const cap = g.capacity === undefined || g.capacity === null || g.capacity === '' ? null : Math.max(0, Number(g.capacity));
          const generalCap = configured.maximo_total === undefined || configured.maximo_total === null || configured.maximo_total === '' ? null : Math.max(0, Number(configured.maximo_total));
          const generalOccupied = active.filter(p => (p.semanas_ocupadas || []).includes(week)).length;
          const remaining = cap === null ? null : Math.max(0, cap - occupied);
          const generalRemaining = generalCap === null || generalCap === 0 ? null : Math.max(0, generalCap - generalOccupied);
          return { week, occupied, capacity:cap, remaining:remaining === null ? null : (generalRemaining === null ? remaining : Math.min(remaining, generalRemaining)), full:(remaining !== null && remaining <= 0) || (generalRemaining !== null && generalRemaining <= 0) };
        })
      }));
      return Response.json({ season, weeks, groups:matrix, updated_at:new Date().toISOString() }, { status:200, headers });
    }
    if (body.action === 'pricing') {
      const pricingClient = createClientFromRequest(req);
      const cfgs = await pricingClient.asServiceRole.entities.CampusSettings.list('-created_date', 5);
      const configured = (cfgs || []).find(c => c.activo === true) || cfgs?.[0] || { precio_semana_general:60, precio_semana_socio:55, precio_quincena_general:110, precio_quincena_socio:95, precio_mes_general:200, precio_mes_socio:170 };
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
    const today = new Date().toISOString().slice(0, 10);
    const member = (matches || []).find(m => clean(m.dni) === dni && m.activo === true && String(m.estado_pago || '').toLowerCase() === 'pagado' && (!m.fecha_vencimiento || m.fecha_vencimiento >= today));
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