import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  try {
    const { code } = await req.json();
    const token = String(code || '').trim().toUpperCase();
    if (!/^[A-F0-9]{32}$/.test(token)) return Response.json({ found: false }, { headers });

    const base44 = createClientFromRequest(req);
    const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    if (configs.length !== 1) return Response.json({ found: false }, { headers });
    const temporada = configs[0].temporada;

    const matches = await base44.asServiceRole.entities.ClubMember.filter({
      codigo_referido: token, temporada, estado_pago: 'Pagado'
    });
    if (matches.length !== 1) return Response.json({ found: false }, { headers });
    const member = matches[0];
    return Response.json({
      found: true,
      referidor_nombre: member.nombre_completo || 'Un socio del club'
    }, { headers });
  } catch (error) {
    console.error('[resolveReferralCode]', error);
    return Response.json({ found: false }, { status: 500, headers });
  }
});