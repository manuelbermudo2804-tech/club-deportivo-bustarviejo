import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Endpoint PÚBLICO: dado un código de referido (hash del email del socio que invita),
// devuelve el nombre y email del referidor para mostrarlo en la página de alta y
// poder atribuir la papeleta tras el pago.
// El código es un hash corto del email (misma lógica que el frontend).
function generateReferralCode(email) {
  if (!email) return '';
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
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

    const match = users.find(u => u.email && generateReferralCode(u.email) === target);
    if (match) {
      return Response.json({
        found: true,
        referidor_nombre: match.full_name || match.email.split('@')[0],
        referidor_email: match.email,
      }, { headers: corsHeaders });
    }

    return Response.json({ found: false }, { headers: corsHeaders });
  } catch (error) {
    console.error('[resolveReferralCode] Error:', error?.message || error);
    return Response.json({ found: false, error: error?.message || 'Error interno' }, { status: 500, headers: corsHeaders });
  }
});