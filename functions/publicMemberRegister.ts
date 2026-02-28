import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Endpoint PÚBLICO: registra un ClubMember en estado Pendiente.
// La web externa llama aquí ANTES de redirigir al Payment Link de Stripe.
// Cuando Stripe notifica el pago (webhook), se busca por email y se marca Pagado.
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[publicMemberRegister] Payload:', JSON.stringify(body));

    const {
      nombre_completo, dni, telefono, email, direccion, municipio,
      fecha_nacimiento, tipo_inscripcion, referido_por
    } = body;

    if (!nombre_completo || !email) {
      return Response.json({ error: 'Nombre y email son obligatorios' }, { status: 400, headers: corsHeaders });
    }

    const base44 = createClientFromRequest(req);

    // Determinar temporada
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const temporada = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

    // Verificar si ya existe
    let existing = [];
    try {
      existing = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
    } catch {}

    if (existing.length > 0) {
      const member = existing[0];
      if (member.estado_pago === 'Pagado') {
        return Response.json({ error: 'Ya eres socio esta temporada.', already_paid: true }, { status: 400, headers: corsHeaders });
      }
      // Actualizar datos si estaba pendiente
      await base44.asServiceRole.entities.ClubMember.update(member.id, {
        nombre_completo: nombre_completo || member.nombre_completo,
        dni: dni || member.dni,
        telefono: telefono || member.telefono,
        direccion: direccion || member.direccion,
        municipio: municipio || member.municipio,
        fecha_nacimiento: fecha_nacimiento || member.fecha_nacimiento,
        tipo_inscripcion: tipo_inscripcion || member.tipo_inscripcion,
        referido_por: referido_por || member.referido_por,
      });
      console.log('[publicMemberRegister] Socio existente actualizado:', member.id);
      return Response.json({ success: true, membership_id: member.id }, { headers: corsHeaders });
    }

    // Generar número de socio
    let allMembers = [];
    try { allMembers = await base44.asServiceRole.entities.ClubMember.list(); } catch {}
    const currentYear = now.getFullYear();
    const membersThisYear = allMembers.filter(m => m.numero_socio?.includes(`CDB-${currentYear}`));
    const nextNumber = membersThisYear.length + 1;
    const numeroSocio = `CDB-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    const membership = await base44.asServiceRole.entities.ClubMember.create({
      numero_socio: numeroSocio,
      tipo_inscripcion: tipo_inscripcion || 'Nueva Inscripción',
      nombre_completo,
      dni: dni || '',
      telefono: telefono || '',
      email,
      direccion: direccion || '',
      municipio: municipio || '',
      fecha_nacimiento: fecha_nacimiento || '',
      es_socio_externo: true,
      cuota_socio: 25,
      estado_pago: 'Pendiente',
      metodo_pago: 'Tarjeta',
      temporada,
      activo: false,
      referido_por: referido_por || '',
      notas: 'Pre-registro desde web externa - pendiente pago Stripe Payment Link',
    });

    console.log('[publicMemberRegister] Socio creado:', membership.id, numeroSocio);
    return Response.json({ success: true, membership_id: membership.id }, { headers: corsHeaders });

  } catch (error) {
    console.error('[publicMemberRegister] Error:', error?.message || error);
    return Response.json({ error: error?.message || 'Error interno' }, { status: 500, headers: corsHeaders });
  }
});