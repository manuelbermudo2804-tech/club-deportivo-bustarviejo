import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Método no permitido' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden importar
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admins pueden importar' }, { status: 403 });
    }

    const body = await req.json();

    // Validar datos mínimos
    if (!body.nombre_completo || !body.email || !body.dni) {
      return Response.json({ error: 'Faltan campos: nombre_completo, email, dni' }, { status: 400 });
    }

    // Generar número de socio
    const allMembers = await base44.entities.ClubMember.list();
    const currentYear = new Date().getFullYear();
    const membersThisYear = allMembers.filter(m => m.numero_socio?.includes(`CDB-${currentYear}`));
    const nextNumber = membersThisYear.length + 1;
    const numeroSocio = `CDB-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    // Obtener temporada activa
    const configs = await base44.entities.SeasonConfig.filter({ activa: true });
    const temporada = configs[0]?.temporada || `${currentYear}/${currentYear + 1}`;

    // Crear registro de socio
    const newMember = await base44.entities.ClubMember.create({
      numero_socio: numeroSocio,
      nombre_completo: body.nombre_completo,
      dni: body.dni,
      email: body.email,
      telefono: body.telefono || '',
      direccion: body.direccion || '',
      municipio: body.municipio || '',
      cuota_socio: 25,
      tipo_inscripcion: body.tipo_inscripcion || 'Nueva Inscripción',
      estado_pago: body.estado_pago || 'Pendiente',
      temporada: temporada,
      activo: true,
      es_socio_externo: true,
      metodo_pago: body.metodo_pago || 'Stripe'
    });

    return Response.json({
      success: true,
      message: `Socio ${body.nombre_completo} importado correctamente`,
      numero_socio: numeroSocio,
      member_id: newMember.id
    });
  } catch (error) {
    console.error('Error importando socio:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});