import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Automation: cuando se crea un ClubMember, crea una AppNotification para admins
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data, event } = body;

    if (!data || event?.type !== 'create') {
      return Response.json({ skipped: true });
    }

    const member = data;
    console.log('[notifyNewMember] Nuevo socio:', member.nombre_completo, member.email);

    await base44.asServiceRole.entities.AppNotification.create({
      tipo: 'nuevo_socio',
      titulo: `🎉 Nuevo socio: ${member.nombre_completo}`,
      mensaje: `${member.nombre_completo} se ha registrado como socio (${member.estado_pago || 'Pendiente'})`,
      destinatario_tipo: 'admins',
      leida: false,
      fecha: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifyNewMember] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});