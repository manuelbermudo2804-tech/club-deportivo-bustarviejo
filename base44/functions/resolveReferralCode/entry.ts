import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Endpoint público: resuelve un código de invitación y devuelve únicamente
// el nombre público del socio. Nunca expone su correo electrónico.
function generateReferralCode(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return '';
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const { code } = await req.json();
    if (!code) return Response.json({ found: false }, { headers: corsHeaders });

    const base44 = createClientFromRequest(req);
    const target = String(code).toUpperCase().trim();

    // Buscar entre los usuarios de la app cuyo hash de email coincida con el código.
    // Los socios que invitan son usuarios registrados (familias/jugadores).
    let users = [];
    try {
      users = await base44.asServiceRole.entities.User.list('', 5000);
    } catch (e) {
      console.error('[resolveReferralCode] Error listando usuarios:', e?.message || e);
    }

    const matches = users.filter(u => u.email && generateReferralCode(u.email) === target);
    // Un código ambiguo nunca se atribuye: evita asignar la papeleta a la persona equivocada.
    if (matches.length === 1) {
      const match = matches[0];
      const email = String(match.email).trim().toLowerCase();
      const configs = await base44.asServiceRole.entities.SeasonConfig.list();
      const activeConfig = configs.find(c => c.activa === true);
      const temporada = activeConfig?.temporada;
      if (!temporada) return Response.json({ found: false }, { headers: corsHeaders });

      // Solo un socio con la cuota pagada en la temporada activa puede ser referidor.
      const memberships = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
      const isPaidMember = memberships.some(m => m.estado_pago === 'Pagado');
      if (!isPaidMember) return Response.json({ found: false }, { headers: corsHeaders });

      return Response.json({
        found: true,
        referidor_nombre: match.full_name || memberships.find(m => m.estado_pago === 'Pagado')?.nombre_completo || 'Un socio del club',
      }, { headers: corsHeaders });
    }

    return Response.json({ found: false }, { headers: corsHeaders });
  } catch (error) {
    console.error('[resolveReferralCode] Error:', error?.message || error);
    return Response.json({ found: false, error: error?.message || 'Error interno' }, { status: 500, headers: corsHeaders });
  }
});