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

    // Payload opcional para procesar uno específico (desde automatización por evento)
    const payload = await req.json().catch(() => ({}));
    const targetId = payload.event?.entity_id || payload.entity_id;

    let unprocessed = [];

    if (targetId) {
      console.log(`🎯 Procesando referido específico: ${targetId}`);
      try {
        const member = await base44.asServiceRole.entities.ClubMember.get(targetId);
        if (member && 
            (member.referido_por_email || member.referido_por) && 
            member.referido_procesado !== true && 
            member.estado_pago === 'Pagado' && 
            member.temporada === activeConfig.temporada) {
          unprocessed.push(member);
        }
      } catch (e) {
        console.error(`Error obteniendo miembro ${targetId}:`, e);
      }
    } else {
      // Modo batch (cron)
      const allMembers = await base44.asServiceRole.entities.ClubMember.list();
      unprocessed = allMembers.filter(m => 
        (m.referido_por_email || m.referido_por) && 
        m.referido_procesado !== true && 
        m.estado_pago === 'Pagado' &&
        m.temporada === activeConfig.temporada
      );
    }

    console.log(`🔄 Procesando ${unprocessed.length} referidos...`);

    let processed = 0;
    for (const member of unprocessed) {
      try {
        let referidorEmail = member.referido_por_email;
        let referidorNombre = member.referido_por;

        // Si falta email pero hay nombre, buscar usuario por nombre exacto
        if (!referidorEmail && referidorNombre) {
            console.log(`🔍 Buscando email para referidor: "${referidorNombre}"`);
            try {
                // Normalizar búsqueda
                const users = await base44.asServiceRole.entities.User.list();
                const match = users.find(u => 
                    u.full_name?.toLowerCase().trim() === referidorNombre.toLowerCase().trim() ||
                    u.email?.toLowerCase().trim() === referidorNombre.toLowerCase().trim()
                );
                
                if (match) {
                    referidorEmail = match.email;
                    referidorNombre = match.full_name; // Actualizar nombre oficial
                    console.log(`✅ Encontrado usuario: ${referidorEmail}`);
                }
            } catch (err) {
                console.error('Error buscando usuario referidor:', err);
            }
        }

        if (!referidorEmail) {
            console.log(`⚠️ No se pudo identificar al referidor "${referidorNombre}" para el socio ${member.nombre_completo}. Se requiere email o nombre exacto.`);
            continue;
        }

        // Crear ReferralHistory
        await base44.asServiceRole.entities.ReferralHistory.create({
          temporada: activeConfig.temporada,
          referidor_email: referidorEmail,
          referidor_nombre: referidorNombre || referidorEmail,
          referido_email: member.email,
          referido_nombre: member.nombre_completo,
          referido_id: member.id,
          estado: 'activo',
          credito_otorgado: activeConfig.referidos_premio_1 || 5,
          sorteos_otorgados: 0,
          fecha_referido: new Date().toISOString()
        });

        // Marcar como procesado Y actualizar datos del referidor si faltaban
        await base44.asServiceRole.entities.ClubMember.update(member.id, {
          referido_procesado: true,
          referido_por: referidorNombre,
          referido_por_email: referidorEmail
        });

        processed++;
        console.log(`✅ Procesado con éxito: ${member.nombre_completo} -> Referidor: ${referidorNombre}`);
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