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
            console.log(`⚠️ No se pudo identificar al referidor "${referidorNombre}" para el socio ${member.nombre_completo}.`);
            continue;
        }

        // 1. Obtener usuario referidor para actualizar sus contadores
        const referrers = await base44.asServiceRole.entities.User.filter({ email: referidorEmail });
        const referrer = referrers?.[0];

        if (referrer) {
            // Lógica de premios (replicada de ClubMembership)
            const currentCount = referrer.referrals_count || 0;
            const creditEarned = activeConfig.referidos_premio_1 || 5;
            
            // Actualizar contadores
            const newCount = currentCount + 1;
            let newCredit = (referrer.clothing_credit_balance || 0) + creditEarned;
            let newRaffles = referrer.raffle_entries_total || 0;

            // Bonus por hitos (3, 5, 10, 15)
            if (newCount === 3) {
                newCredit += (activeConfig.referidos_premio_3 || 15) - creditEarned;
                newRaffles += activeConfig.referidos_sorteo_3 || 1;
            } else if (newCount === 5) {
                newCredit += (activeConfig.referidos_premio_5 || 25) - (activeConfig.referidos_premio_3 || 15);
                newRaffles += (activeConfig.referidos_sorteo_5 || 3) - (activeConfig.referidos_sorteo_3 || 1);
            } else if (newCount === 10) {
                newCredit += (activeConfig.referidos_premio_10 || 50) - (activeConfig.referidos_premio_5 || 25);
                newRaffles += (activeConfig.referidos_sorteo_10 || 5) - (activeConfig.referidos_sorteo_5 || 3);
            } else if (newCount === 15) {
                newCredit += (activeConfig.referidos_premio_15 || 50) - (activeConfig.referidos_premio_10 || 50);
                newRaffles += (activeConfig.referidos_sorteo_15 || 10) - (activeConfig.referidos_sorteo_10 || 5);
            }

            // Actualizar usuario
            await base44.asServiceRole.entities.User.update(referrer.id, {
                referrals_count: newCount,
                clothing_credit_balance: newCredit,
                raffle_entries_total: newRaffles
            });

            // Registrar CreditoRopaHistorico
            await base44.asServiceRole.entities.CreditoRopaHistorico.create({
                user_email: referrer.email,
                user_nombre: referrer.full_name,
                tipo: "ganado",
                cantidad: creditEarned,
                concepto: `Socio referido (automático): ${member.nombre_completo}`,
                temporada: activeConfig.temporada,
                referido_nombre: member.nombre_completo,
                saldo_antes: referrer.clothing_credit_balance || 0,
                saldo_despues: newCredit,
                fecha_movimiento: new Date().toISOString()
            });

            // Registrar ReferralReward
            await base44.asServiceRole.entities.ReferralReward.create({
                referrer_email: referrer.email,
                referrer_name: referrer.full_name,
                referred_member_id: member.id,
                referred_member_name: member.nombre_completo,
                temporada: activeConfig.temporada,
                clothing_credit_earned: creditEarned
            });
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

        // Marcar como procesado Y actualizar datos del referidor
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