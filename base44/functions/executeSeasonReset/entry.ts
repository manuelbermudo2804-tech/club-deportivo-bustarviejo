import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Wrapper con reintentos para rate limit (429)
async function withRetry(fn, maxRetries = 3, baseDelayMs = 2000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const is429 = e.message?.includes('429') || e.message?.includes('Rate limit') || e.response?.status === 429;
      if (!is429 || attempt === maxRetries) throw e;
      await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }
}

// Borra todos los registros de una entidad en lotes pequeños con throttle
async function deleteAllInChunks(base44, entityName, chunkSize = 4, delayMs = 1000) {
  try {
    const items = await withRetry(() => base44.asServiceRole.entities[entityName].list());
    if (!items || items.length === 0) return { entity: entityName, deleted: 0 };
    
    let deleted = 0;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        chunk.map(item => withRetry(() => base44.asServiceRole.entities[entityName].delete(item.id)))
      );
      deleted += results.filter(r => r.status === 'fulfilled').length;
      if (i + chunkSize < items.length) await sleep(delayMs);
    }
    return { entity: entityName, deleted, total: items.length };
  } catch (e) {
    console.error(`Error borrando ${entityName}:`, e.message);
    return { entity: entityName, deleted: 0, error: e.message };
  }
}

// Actualiza todos los registros con throttle entre lotes
async function updateAllInChunks(base44, entityName, items, updateData, chunkSize = 4, delayMs = 1000) {
  if (!items || items.length === 0) return { entity: entityName, updated: 0 };
  let updated = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map(item => withRetry(() => base44.asServiceRole.entities[entityName].update(item.id, updateData)))
    );
    updated += results.filter(r => r.status === 'fulfilled').length;
    if (i + chunkSize < items.length) await sleep(delayMs);
  }
  return { entity: entityName, updated, total: items.length };
}

// Calcula el nombre de la siguiente temporada partiendo del nombre actual
function calcNextSeasonName(currentName) {
  const m = String(currentName || '').match(/(\d{4})[-/](\d{4})/);
  if (m) {
    const start = parseInt(m[1]) + 1;
    const end = parseInt(m[2]) + 1;
    return `${start}-${end}`;
  }
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { config } = body;
    
    // VALIDACIONES FAIL-FAST (antes de cualquier operación pesada)
    if (!config || !config.newSeasonName) {
      return Response.json({ error: 'Missing config or newSeasonName' }, { status: 400 });
    }
    if (typeof config.cuotaUnica !== 'number' || typeof config.cuotaTresMeses !== 'number') {
      return Response.json({ error: 'Faltan cuotaUnica o cuotaTresMeses' }, { status: 400 });
    }

    const log = [];
    const startTime = Date.now();

    // 1. Cargar temporada activa actual
    // ⚠️ Protección: puede haber más de una "activa" por error histórico
    const activeSeasons = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    const activeSeason = activeSeasons[0];
    const previousSeasonName = activeSeason?.temporada || 'Desconocida';
    if (activeSeasons.length > 1) {
      log.push(`⚠️ Detectadas ${activeSeasons.length} temporadas activas. Se desactivarán todas excepto la nueva.`);
    }
    
    // Validación: que la nueva temporada NO sea igual a la actual
    if (config.newSeasonName === previousSeasonName) {
      return Response.json({ 
        error: `La nueva temporada "${config.newSeasonName}" es igual a la actual. Usa un nombre diferente (sugerido: ${calcNextSeasonName(previousSeasonName)})` 
      }, { status: 400 });
    }

    // 2. Archivar pagos (chunks pequeños con throttle, cada pago = 2 ops: create + delete)
    if (config.archivePayments) {
      const payments = await base44.asServiceRole.entities.Payment.list();
      let archived = 0;
      for (let i = 0; i < payments.length; i += 5) {
        const chunk = payments.slice(i, i + 5);
        const results = await Promise.allSettled(chunk.map(async (p) => {
          const { id, created_date, updated_date, ...data } = p;
          await base44.asServiceRole.entities.PaymentHistory.create({ ...data, archivado_fecha: new Date().toISOString() });
          await base44.asServiceRole.entities.Payment.delete(p.id);
        }));
        archived += results.filter(r => r.status === 'fulfilled').length;
        if (i + 5 < payments.length) await sleep(700);
      }
      log.push(`✅ Pagos archivados: ${archived}/${payments.length}`);
    }

    // 3. Resetear sponsors activos (sin tocar campo monto que no existe)
    if (config.archivePayments) {
      const sponsors = await base44.asServiceRole.entities.Sponsor.list();
      const activeSponsors = sponsors.filter(s => s.activo === true);
      const r = await updateAllInChunks(base44, 'Sponsor', activeSponsors, { 
        activo: false,
        notas: `Pendiente renovar para temporada ${config.newSeasonName}`
      });
      log.push(`✅ Sponsors desactivados: ${r.updated}/${r.total}`);
    }

    // 4. Desactivar jugadores y archivar a PlayerHistory los no renovados
    if (config.resetPlayerStatus) {
      const players = await base44.asServiceRole.entities.Player.list();
      const activePlayers = players.filter(p => p.activo);
      
      // Archivar jugadores que NO están renovando
      const toArchive = activePlayers.filter(p => p.estado_renovacion !== 'renovado');
      let archived = 0;
      for (let i = 0; i < toArchive.length; i += 8) {
        const chunk = toArchive.slice(i, i + 8);
        const results = await Promise.allSettled(chunk.map(async (p) => {
          const { id, created_date, updated_date, ...data } = p;
          await base44.asServiceRole.entities.PlayerHistory.create({
            ...data,
            temporada_archivada: previousSeasonName,
            fecha_archivado: new Date().toISOString()
          });
        }));
        archived += results.filter(r => r.status === 'fulfilled').length;
        if (i + 8 < toArchive.length) await sleep(600);
      }
      
      // Desactivar TODOS y resetear estado renovación
      // ⚠️ FIX: Las firmas federativas SIEMPRE se resetean (cada temporada son nuevas)
      const updateData = {
        activo: false,
        estado_renovacion: 'pendiente',
        temporada_renovacion: config.newSeasonName,
        enlace_firma_jugador: '',
        enlace_firma_tutor: '',
        firma_jugador_completada: false,
        firma_tutor_completada: false
      };
      const r = await updateAllInChunks(base44, 'Player', activePlayers, updateData);
      log.push(`✅ Jugadores desactivados: ${r.updated}/${r.total} (archivados a histórico: ${archived})`);
    }

    // 5. Borrado masivo de entidades de temporada
    const entitiesToDelete = [];
    if (config.deleteReminders) entitiesToDelete.push('Reminder');
    if (config.deleteCallups || config.deleteConvocatorias) entitiesToDelete.push('Convocatoria');
    if (config.deleteLotteryOrders) entitiesToDelete.push('LotteryOrder');
    if (config.deleteAttendances) entitiesToDelete.push('Attendance');
    if (config.deleteEvaluations) entitiesToDelete.push('PlayerEvaluation');
    if (config.deleteTrainingSchedules) entitiesToDelete.push('TrainingSchedule');
    if (config.deletePhotoGallery) entitiesToDelete.push('PhotoGallery');
    if (config.deleteEvents) entitiesToDelete.push('Event');
    if (config.deleteAnnouncements) entitiesToDelete.push('Announcement');
    if (config.deleteChatMessages) entitiesToDelete.push('ChatMessage');
    if (config.deletePrivateConversations || config.deleteCoordinatorChats) {
      entitiesToDelete.push('CoordinatorConversation', 'CoordinatorMessage');
      entitiesToDelete.push('StaffConversation', 'StaffMessage');
      entitiesToDelete.push('AdminConversation', 'AdminMessage');
      entitiesToDelete.push('PrivateConversation', 'PrivateMessage');
    }
    if (config.deleteAppNotifications) entitiesToDelete.push('AppNotification');
    if (config.deleteCertificates) entitiesToDelete.push('Certificate');
    if (config.deleteSurveys) entitiesToDelete.push('SurveyResponse', 'Survey');
    if (config.deleteMatchResults) entitiesToDelete.push('MatchResult');
    if (config.deleteDocuments) entitiesToDelete.push('Document');
    if (config.deleteClothingOrders) entitiesToDelete.push('ClothingOrder');

    // Entidades adicionales siempre borradas en reset
    entitiesToDelete.push(
      'AutomaticReminder', 'CustomPaymentPlan', 'ExtraChargePayment', 'ExtraCharge',
      'BatchPayment', 'VolunteerSignup', 'VolunteerOpportunity', 'MarketReservation',
      'MarketListing', 'BoardTask', 'Feedback', 'Clasificacion', 'Resultado', 'Goleador',
      'MatchObservation', 'CompetitionAsset', 'TacticaPizarra',
      'CommunicationLog', 'CoordinatorChatLog', 'CoachChatLog', 'ChatbotLog',
      'ReferralReward', 'ReferralHistory', 'FemeninoInterest', 'StripePaymentLog',
      'ProximoPartido', 'JuniorMailbox', 'MatchReport', 'BirthdayLog', 'MatchMinutes',
      'ChatAcceptance', 'AccessCodeAttempt', 'SystemAlert', 'AnalyticsEvent', 'SponsorImpression',
      'PushNotification', 'EmailInvitation', 'InvitationRequest', 'AdminInvitation',
      'SecondParentInvitation', 'AccessRequest', 'AccessCode', 'ContactForm',
      'PlayerGoal', 'PlayerDevelopmentNote', 'SocialPost', 'Order'
    );

    // Borrado SECUENCIAL entidad-por-entidad (evita explosión de rate limit en backend)
    // Cada entidad internamente borra en lotes pequeños con throttle
    const uniqueEntities = [...new Set(entitiesToDelete)];
    for (const name of uniqueEntities) {
      const r = await deleteAllInChunks(base44, name);
      if (r.deleted > 0 || r.error) {
        log.push(`${r.error ? '⚠️' : '✅'} ${r.entity}: ${r.deleted}${r.total !== undefined ? '/' + r.total : ''}${r.error ? ' (' + r.error + ')' : ''}`);
      }
    }

    // 6. Desactivar socios de temporada anterior (no borrar)
    if (config.resetClubMembers) {
      const members = await base44.asServiceRole.entities.ClubMember.list();
      const toDeactivate = members.filter(m => m.activo !== false && m.temporada !== config.newSeasonName);
      const r = await updateAllInChunks(base44, 'ClubMember', toDeactivate, {
        activo: false,
        temporada_anterior: previousSeasonName
      });
      log.push(`✅ Socios desactivados: ${r.updated}/${r.total}`);
    }

    // 7. Resetear contadores de referidos en usuarios (sin tocar créditos de ropa)
    if (config.resetUserReferrals) {
      const users = await base44.asServiceRole.entities.User.list();
      const toReset = users.filter(u => 
        (u.referrals_count > 0) || (u.referidos_list?.length > 0) || (u.raffle_entries_total > 0)
      );
      const r = await updateAllInChunks(base44, 'User', toReset, {
        referrals_count: 0,
        referidos_list: [],
        raffle_entries_total: 0
      });
      log.push(`✅ Usuarios reseteados (referidos): ${r.updated}/${r.total}`);
    }

    // 8. Desactivar TODAS las temporadas marcadas como activas (no solo la primera)
    // Esto blinda el sistema contra el caso de tener varias "activa: true" por error.
    if (activeSeasons.length > 0) {
      let deactivated = 0;
      for (const s of activeSeasons) {
        try {
          await withRetry(() => base44.asServiceRole.entities.SeasonConfig.update(s.id, { activa: false }));
          deactivated++;
        } catch (e) {
          console.error(`Error desactivando temporada ${s.temporada}:`, e.message);
        }
      }
      log.push(`✅ Temporadas anteriores desactivadas: ${deactivated}/${activeSeasons.length}`);
    }

    // 9. Crear nueva temporada (o reactivar si ya existe)
    const existingNew = await base44.asServiceRole.entities.SeasonConfig.filter({ temporada: config.newSeasonName });
    if (existingNew.length > 0) {
      await base44.asServiceRole.entities.SeasonConfig.update(existingNew[0].id, { 
        activa: true,
        cuota_unica: config.cuotaUnica,
        cuota_tres_meses: config.cuotaTresMeses,
        permitir_renovaciones: true
      });
      log.push(`✅ Temporada ${config.newSeasonName} reactivada`);
    } else {
      await base44.asServiceRole.entities.SeasonConfig.create({
        temporada: config.newSeasonName,
        activa: true,
        cuota_unica: config.cuotaUnica,
        cuota_tres_meses: config.cuotaTresMeses,
        fecha_inicio: new Date().toISOString().split('T')[0],
        permitir_renovaciones: true,
        tienda_ropa_abierta: false,
        loteria_navidad_abierta: false,
        bizum_activo: activeSeason?.bizum_activo || false,
        bizum_telefono: activeSeason?.bizum_telefono || '',
        mostrar_patrocinadores: activeSeason?.mostrar_patrocinadores || false,
        notificaciones_admin_email: activeSeason?.notificaciones_admin_email || true,
        programa_referidos_activo: activeSeason?.programa_referidos_activo || false
      });
      log.push(`✅ Temporada ${config.newSeasonName} creada`);
    }

    // 10. Limpieza de categorías: borrar las antiguas (>=2 temporadas atrás), desactivar resto
    const allCategories = await base44.asServiceRole.entities.CategoryConfig.list();
    const categoriesOld = allCategories.filter(c => c.temporada !== config.newSeasonName && c.temporada !== previousSeasonName);
    const categoriesPrev = allCategories.filter(c => c.temporada === previousSeasonName);
    
    // Borrar categorías de hace 2+ temporadas (limpieza de basura acumulada)
    let deletedOldCats = 0;
    for (let i = 0; i < categoriesOld.length; i += 8) {
      const chunk = categoriesOld.slice(i, i + 8);
      const results = await Promise.allSettled(
        chunk.map(c => base44.asServiceRole.entities.CategoryConfig.delete(c.id))
      );
      deletedOldCats += results.filter(r => r.status === 'fulfilled').length;
      if (i + 8 < categoriesOld.length) await sleep(500);
    }
    
    // Desactivar categorías de la temporada anterior (mantener para histórico de pagos)
    const r = await updateAllInChunks(base44, 'CategoryConfig', categoriesPrev.filter(c => c.activa), { activa: false });
    log.push(`✅ Categorías: ${deletedOldCats} antiguas borradas, ${r.updated} de temporada anterior desactivadas`);

    // 11. Crear categorías BASE para la nueva temporada (si no existen)
    const BASE_CATEGORIES = [
      'Fútbol Pre-Benjamín (Mixto)', 'Fútbol Benjamín (Mixto)', 'Fútbol Alevín (Mixto)',
      'Fútbol Infantil (Mixto)', 'Fútbol Cadete', 'Fútbol Juvenil',
      'Fútbol Aficionado', 'Fútbol Femenino', 'Baloncesto (Mixto)'
    ];
    const DEFAULT_QUOTAS = {
      'Fútbol Pre-Benjamín (Mixto)': { i: 100, s: 80, t: 80 },
      'Fútbol Benjamín (Mixto)': { i: 100, s: 80, t: 80 },
      'Fútbol Alevín (Mixto)': { i: 115, s: 88, t: 88 },
      'Fútbol Infantil (Mixto)': { i: 115, s: 88, t: 88 },
      'Fútbol Cadete': { i: 150, s: 95, t: 95 },
      'Fútbol Juvenil': { i: 140, s: 100, t: 100 },
      'Fútbol Aficionado': { i: 165, s: 100, t: 95 },
      'Fútbol Femenino': { i: 150, s: 95, t: 95 },
      'Baloncesto (Mixto)': { i: 90, s: 75, t: 75 }
    };
    const newSeasonCats = allCategories.filter(c => c.temporada === config.newSeasonName);
    let createdCats = 0;
    for (const baseName of BASE_CATEGORIES) {
      if (newSeasonCats.some(c => c.nombre === baseName)) continue;
      const src = categoriesPrev.find(c => c.nombre === baseName);
      const q = src 
        ? { i: src.cuota_inscripcion, s: src.cuota_segunda, t: src.cuota_tercera } 
        : DEFAULT_QUOTAS[baseName];
      try {
        await base44.asServiceRole.entities.CategoryConfig.create({
          nombre: baseName,
          temporada: config.newSeasonName,
          activa: true,
          es_base: true,
          deporte: baseName.includes('Baloncesto') ? 'Baloncesto' : 'Fútbol',
          cuota_inscripcion: q.i,
          cuota_segunda: q.s,
          cuota_tercera: q.t,
          cuota_total: q.i + q.s + q.t
        });
        createdCats++;
      } catch (e) { /* ignorar errores individuales */ }
    }
    log.push(`✅ Categorías base creadas para nueva temporada: ${createdCats}`);

    // 11.5. GARANTÍA FINAL: solo UNA temporada puede quedar activa.
    // Releer y desactivar cualquier "activa" que no sea la nueva.
    try {
      const finalActives = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      const stragglers = finalActives.filter(s => s.temporada !== config.newSeasonName);
      if (stragglers.length > 0) {
        for (const s of stragglers) {
          try {
            await withRetry(() => base44.asServiceRole.entities.SeasonConfig.update(s.id, { activa: false }));
          } catch (e) {
            console.error(`Error desactivando rezagada ${s.temporada}:`, e.message);
          }
        }
        log.push(`✅ Garantía final: ${stragglers.length} temporada(s) rezagada(s) desactivada(s)`);
      }
    } catch (e) {
      console.error('Error en garantía final de temporada única:', e.message);
    }

    // 12. Registrar en historial
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    await base44.asServiceRole.entities.ResetHistory.create({
      fecha_reset: new Date().toISOString(),
      temporada_anterior: previousSeasonName,
      temporada_nueva: config.newSeasonName,
      realizado_por: user.email,
      acciones: JSON.stringify({ ...config, log, duracion_segundos: elapsedSec })
    });

    return Response.json({ 
      success: true, 
      log,
      previousSeason: previousSeasonName,
      newSeason: config.newSeasonName,
      durationSec: elapsedSec
    });

  } catch (error) {
    console.error('Error in season reset:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});