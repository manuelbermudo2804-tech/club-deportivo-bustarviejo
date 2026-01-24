import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Obtener config activa
    const configs = await base44.asServiceRole.entities.SeasonConfig.list();
    const activeConfig = configs.find(c => c.activa === true);
    
    if (!activeConfig?.programa_referidos_activo) {
      console.log('❌ Programa de referidos no está activo');
      return Response.json({ message: 'Programa no activo' }, { status: 200 });
    }

    // Obtener todos los ClubMembers sin procesar
    const allMembers = await base44.asServiceRole.entities.ClubMember.list();
    const unprocessed = allMembers.filter(m => 
      m.referido_por_email && 
      m.referido_procesado !== true && 
      m.estado_pago === 'Pagado' &&
      m.temporada === activeConfig.temporada
    );

    console.log(`🔄 Procesando ${unprocessed.length} referidos históricos...`);

    let processed = 0;
    for (const member of unprocessed) {
      try {
        // Crear ReferralHistory
        await base44.asServiceRole.entities.ReferralHistory.create({
          temporada: activeConfig.temporada,
          referidor_email: member.referido_por_email,
          referidor_nombre: member.referido_por,
          referido_email: member.email,
          referido_nombre: member.nombre_completo,
          referido_id: member.id,
          estado: 'activo',
          credito_otorgado: activeConfig.referidos_premio_1 || 5,
          sorteos_otorgados: 0,
          fecha_referido: new Date().toISOString()
        });

        // Marcar como procesado
        await base44.asServiceRole.entities.ClubMember.update(member.id, {
          referido_procesado: true
        });

        processed++;
        console.log(`✅ Procesado: ${member.nombre_completo} (referido por ${member.referido_por})`);
      } catch (error) {
        console.error(`❌ Error procesando ${member.nombre_completo}:`, error.message);
      }
    }

    return Response.json({ 
      message: `Procesados ${processed}/${unprocessed.length} referidos`,
      processed,
      total: unprocessed.length
    });
  } catch (error) {
    console.error('❌ Error en processHistoricReferrals:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});