import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const now = new Date();
  const findings = [];
  const stats = {};

  // Helper
  const addFinding = (severity, module, title, description, affected = [], action = '') => {
    findings.push({ severity, module, title, description, affected, action, count: affected.length || 1 });
  };

  const daysSince = (dateStr) => {
    if (!dateStr) return 999;
    return Math.floor((now - new Date(dateStr)) / (1000 * 60 * 60 * 24));
  };

  const calcAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  console.log('🔬 [Diagnostic] Starting full diagnostic...');

  // ========== FETCH ALL DATA ==========
  const [
    users, players, payments, accessCodes, accessAttempts,
    members, convocatorias, categoryConfigs, seasonConfigs,
    uploadDiags, announcements, surveys, surveyResponses,
    events
  ] = await Promise.all([
    base44.asServiceRole.entities.User.list().catch(() => []),
    base44.asServiceRole.entities.Player.list().catch(() => []),
    base44.asServiceRole.entities.Payment.list().catch(() => []),
    base44.asServiceRole.entities.AccessCode.list().catch(() => []),
    base44.asServiceRole.entities.AccessCodeAttempt.list().catch(() => []),
    base44.asServiceRole.entities.ClubMember.list().catch(() => []),
    base44.asServiceRole.entities.Convocatoria.list().catch(() => []),
    base44.asServiceRole.entities.CategoryConfig.list().catch(() => []),
    base44.asServiceRole.entities.SeasonConfig.list().catch(() => []),
    base44.asServiceRole.entities.UploadDiagnostic.list().catch(() => []),
    base44.asServiceRole.entities.Announcement.list().catch(() => []),
    base44.asServiceRole.entities.Survey.list().catch(() => []),
    base44.asServiceRole.entities.SurveyResponse.list().catch(() => []),
    base44.asServiceRole.entities.Event.list().catch(() => []),
  ]);

  const activeSeason = (seasonConfigs || []).find(s => s.activa);
  const currentTemporada = activeSeason?.temporada || '';
  const activePlayers = (players || []).filter(p => p.activo);
  const activeCategories = (categoryConfigs || []).filter(c => c.activa);
  const activeCatNames = new Set(activeCategories.map(c => c.nombre));
  const playerIds = new Set(players.map(p => p.id));
  const userEmails = new Set((users || []).map(u => u.email?.toLowerCase()).filter(Boolean));
  const nonAdminUsers = (users || []).filter(u => u.role !== 'admin' && u.role !== 'tablet');

  console.log(`🔬 [Diagnostic] Data loaded: ${users.length} users, ${players.length} players, ${payments.length} payments, ${accessCodes.length} codes, ${members.length} members`);

  // ========== 1. ACCESOS Y ONBOARDING (CRÍTICO) ==========
  {
    // Users registered >48h without validated access code
    const stuckUsers = nonAdminUsers.filter(u =>
      !u.codigo_acceso_validado &&
      !u.es_entrenador && !u.es_coordinador && !u.es_tesorero &&
      daysSince(u.created_date) > 2
    );
    if (stuckUsers.length > 0) {
      addFinding('critical', 'accesos', `${stuckUsers.length} usuario(s) atascados sin validar código`,
        'Usuarios registrados hace más de 48h que NO han validado su código de acceso. Pueden estar confundidos con el proceso de entrada.',
        stuckUsers.map(u => ({ email: u.email, nombre: u.full_name, dias: daysSince(u.created_date) })),
        'Reenviar código de acceso o contactar directamente');
    }

    // Access codes sent but expired unused
    const expiredUnused = (accessCodes || []).filter(c =>
      c.estado === 'expirado' || (c.estado === 'pendiente' && c.fecha_expiracion && new Date(c.fecha_expiracion) < now)
    );
    if (expiredUnused.length > 0) {
      addFinding('high', 'accesos', `${expiredUnused.length} código(s) de acceso expirados sin usar`,
        'Códigos enviados que nunca se usaron. Posibles causas: email no llegó, usuario no entiende el proceso, o perdió el código.',
        expiredUnused.map(c => ({ email: c.email, tipo: c.tipo, nombre: c.nombre_destino, enviado: c.fecha_envio })),
        'Reenviar invitaciones a estos contactos');
    }

    // Second parents invited but never entered
    const secondParentCodes = (accessCodes || []).filter(c => c.tipo === 'segundo_progenitor');
    const secondParentUsed = secondParentCodes.filter(c => c.estado === 'usado');
    const secondParentPending = secondParentCodes.filter(c => c.estado === 'pendiente' || c.estado === 'expirado');
    if (secondParentCodes.length > 0) {
      const conversionRate = secondParentCodes.length > 0 ? Math.round((secondParentUsed.length / secondParentCodes.length) * 100) : 0;
      stats.secondParentConversion = conversionRate;
      if (conversionRate < 50 && secondParentPending.length > 0) {
        addFinding('high', 'accesos', `Solo ${conversionRate}% de segundos progenitores han entrado (${secondParentPending.length} pendientes)`,
          'La mayoría de segundos progenitores invitados no completan el acceso. Esto significa que un padre se queda sin acceso a convocatorias, pagos, etc.',
          secondParentPending.map(c => ({ email: c.email, jugador: c.jugador_nombre, enviado: c.fecha_envio })),
          'Reenviar invitaciones y considerar simplificar el proceso');
      }
    }

    // Users with empty/incoherent tipo_panel
    const usersNoPanel = nonAdminUsers.filter(u =>
      u.codigo_acceso_validado && !u.tipo_panel && !u.es_entrenador && !u.es_coordinador && !u.es_tesorero
    );
    if (usersNoPanel.length > 0) {
      addFinding('high', 'accesos', `${usersNoPanel.length} usuario(s) con código validado pero sin tipo de panel`,
        'Usuarios que validaron su código pero no tienen tipo_panel asignado. Ven una pantalla vacía o con errores.',
        usersNoPanel.map(u => ({ email: u.email, nombre: u.full_name })),
        'Asignar tipo_panel manualmente desde Gestión de Usuarios');
    }

    // +18 players that should be jugador_adulto but are familia
    const adultPlayersMismatch = nonAdminUsers.filter(u => {
      if (u.tipo_panel !== 'familia' || !u.es_jugador) return false;
      return true;
    });
    // Also check players with es_mayor_edad that don't have panel
    const adultPlayersWithoutPanel = activePlayers.filter(p => {
      if (!p.es_mayor_edad && calcAge(p.fecha_nacimiento) < 18) return false;
      const userForPlayer = (users || []).find(u => u.email?.toLowerCase() === p.email_jugador?.toLowerCase() || u.email?.toLowerCase() === p.email_padre?.toLowerCase());
      return userForPlayer && userForPlayer.tipo_panel !== 'jugador_adulto' && !userForPlayer.es_jugador;
    });
    if (adultPlayersWithoutPanel.length > 0) {
      addFinding('medium', 'accesos', `${adultPlayersWithoutPanel.length} jugador(es) +18 sin panel de jugador`,
        'Jugadores mayores de edad que deberían tener tipo_panel="jugador_adulto" pero no lo tienen.',
        adultPlayersWithoutPanel.map(p => ({ nombre: p.nombre, email: p.email_jugador || p.email_padre })),
        'Actualizar tipo_panel a jugador_adulto en Gestión de Usuarios');
    }

    // Suspicious access attempts
    const failedAttempts = (accessAttempts || []).filter(a => !a.exitoso);
    const attemptsByUser = {};
    failedAttempts.forEach(a => {
      const key = a.user_email;
      attemptsByUser[key] = (attemptsByUser[key] || 0) + 1;
    });
    const suspiciousUsers = Object.entries(attemptsByUser).filter(([_, count]) => count >= 5);
    if (suspiciousUsers.length > 0) {
      addFinding('high', 'accesos', `${suspiciousUsers.length} usuario(s) con 5+ intentos fallidos de código`,
        'Posible confusión con el código, o intentos de fuerza bruta.',
        suspiciousUsers.map(([email, count]) => ({ email, intentos: count })),
        'Verificar si son usuarios legítimos y reenviar código correcto');
    }

    stats.accesos = {
      totalUsers: nonAdminUsers.length,
      codigoValidado: nonAdminUsers.filter(u => u.codigo_acceso_validado).length,
      sinValidar: nonAdminUsers.filter(u => !u.codigo_acceso_validado).length,
      atascados48h: stuckUsers.length,
      codigosExpirados: expiredUnused.length,
      tasaConversionSegundoPadre: stats.secondParentConversion || 0,
      intentosFallidos: failedAttempts.length,
    };
  }

  // ========== 2. SUBIDAS Y DISPOSITIVOS ==========
  {
    const uploadErrors = (uploadDiags || []).filter(d => d.event_type === 'upload_error' || d.event_type === 'validation_reject');
    const uploadSuccesses = (uploadDiags || []).filter(d => d.event_type === 'upload_success');
    const totalUploads = uploadErrors.length + uploadSuccesses.length;
    const failRate = totalUploads > 0 ? Math.round((uploadErrors.length / totalUploads) * 100) : 0;

    if (failRate > 20 && uploadErrors.length > 3) {
      addFinding('high', 'subidas', `Tasa de fallo de subidas: ${failRate}% (${uploadErrors.length} errores de ${totalUploads})`,
        'Muchos usuarios tienen problemas subiendo archivos (fotos, DNIs). Esto bloquea la inscripción.',
        [],
        'Revisar diagnósticos de subida y optimizar compresión de imágenes');
    }

    // Group by device
    const errorsByDevice = {};
    uploadErrors.forEach(d => {
      const key = d.device || 'desconocido';
      if (!errorsByDevice[key]) errorsByDevice[key] = 0;
      errorsByDevice[key]++;
    });
    const problematicDevices = Object.entries(errorsByDevice).filter(([_, count]) => count >= 3).sort((a, b) => b[1] - a[1]);
    if (problematicDevices.length > 0) {
      addFinding('high', 'subidas', `Dispositivos con más fallos de subida`,
        `Los siguientes dispositivos concentran la mayoría de errores de subida de archivos.`,
        problematicDevices.map(([device, count]) => ({ dispositivo: device, errores: count })),
        'Investigar compatibilidad con estos dispositivos/navegadores');
    }

    // Players without photo
    const playersNoPhoto = activePlayers.filter(p => !p.foto_url);
    if (playersNoPhoto.length > 0) {
      addFinding(playersNoPhoto.length > 5 ? 'high' : 'medium', 'subidas', `${playersNoPhoto.length} jugador(es) activo(s) sin foto`,
        'La foto es obligatoria para la ficha. Estos jugadores tienen inscripción incompleta.',
        playersNoPhoto.slice(0, 15).map(p => ({ nombre: p.nombre, email_padre: p.email_padre })),
        'Contactar a los padres para que suban la foto desde la app');
    }

    stats.subidas = {
      totalSubidas: totalUploads,
      exitosas: uploadSuccesses.length,
      errores: uploadErrors.length,
      tasaFallo: failRate,
      dispositivosProblematicos: problematicDevices.length,
      jugadoresSinFoto: playersNoPhoto.length,
    };
  }

  // ========== 3. PAGOS E INTEGRIDAD FINANCIERA ==========
  {
    const activePayments = (payments || []).filter(p => !p.is_deleted);
    const pendingPayments = activePayments.filter(p => p.estado === 'Pendiente');
    const reviewPayments = activePayments.filter(p => p.estado === 'En revisión');

    // Payments referencing non-existent players
    const orphanPayments = activePayments.filter(p => p.jugador_id && !playerIds.has(p.jugador_id));
    if (orphanPayments.length > 0) {
      addFinding('high', 'pagos', `${orphanPayments.length} pago(s) referenciando jugadores que no existen`,
        'Pagos huérfanos: el jugador fue eliminado pero los pagos persisten. Posible inconsistencia de datos.',
        orphanPayments.slice(0, 10).map(p => ({ jugador: p.jugador_nombre, jugador_id: p.jugador_id, cantidad: p.cantidad, estado: p.estado })),
        'Revisar y eliminar/reasignar estos pagos manualmente');
    }

    // Active players without any payment for current season
    const playersWithPayments = new Set(activePayments.filter(p => p.temporada === currentTemporada).map(p => p.jugador_id));
    const playersNoPay = activePlayers.filter(p => !playersWithPayments.has(p.id));
    if (playersNoPay.length > 0) {
      addFinding('high', 'pagos', `${playersNoPay.length} jugador(es) activo(s) sin cuotas generadas esta temporada`,
        'Jugadores activos que no tienen ningún pago registrado para la temporada actual. Pueden haber sido dados de alta sin pasar por el flujo de pago.',
        playersNoPay.slice(0, 15).map(p => ({ nombre: p.nombre, categoria: p.categoria_principal || p.deporte, email: p.email_padre })),
        'Generar cuotas manualmente desde el panel de Pagos');
    }

    // Payments in review >7 days
    const staleReview = reviewPayments.filter(p => daysSince(p.created_date) > 7);
    if (staleReview.length > 0) {
      addFinding('medium', 'pagos', `${staleReview.length} pago(s) en revisión desde hace más de 7 días`,
        'Pagos con justificante subido que llevan tiempo sin ser aprobados/rechazados.',
        staleReview.slice(0, 10).map(p => ({ jugador: p.jugador_nombre, cantidad: p.cantidad, dias: daysSince(p.created_date) })),
        'Aprobar o rechazar estos pagos desde el panel de Pagos');
    }

    // Duplicate payments (same player, same month, same season)
    const paymentKeys = {};
    const duplicates = [];
    activePayments.forEach(p => {
      const key = `${p.jugador_id}-${p.mes}-${p.temporada}`;
      if (paymentKeys[key]) {
        duplicates.push({ key, payment1: paymentKeys[key], payment2: p });
      } else {
        paymentKeys[key] = p;
      }
    });
    if (duplicates.length > 0) {
      addFinding('high', 'pagos', `${duplicates.length} posible(s) pago(s) duplicado(s)`,
        'Pagos duplicados detectados: mismo jugador, mismo mes y misma temporada.',
        duplicates.slice(0, 10).map(d => ({ jugador: d.payment2.jugador_nombre, mes: d.payment2.mes, temporada: d.payment2.temporada })),
        'Revisar y eliminar duplicados desde el panel de Pagos');
    }

    const totalPendiente = pendingPayments.reduce((sum, p) => sum + (Number(p.cantidad) || 0), 0);
    stats.pagos = {
      totalPagos: activePayments.length,
      pendientes: pendingPayments.length,
      enRevision: reviewPayments.length,
      enRevision7dias: staleReview.length,
      huerfanos: orphanPayments.length,
      sinCuotas: playersNoPay.length,
      duplicados: duplicates.length,
      importePendiente: totalPendiente,
    };
  }

  // ========== 4. JUGADORES E INTEGRIDAD DE FICHAS ==========
  {
    // Players with no email_padre matching any User
    const playersOrphanEmail = activePlayers.filter(p => p.email_padre && !userEmails.has(p.email_padre.toLowerCase()));
    if (playersOrphanEmail.length > 0) {
      addFinding('medium', 'jugadores', `${playersOrphanEmail.length} jugador(es) con email_padre que no corresponde a ningún usuario`,
        'El email del padre/tutor no tiene cuenta de usuario. No pueden acceder a la app.',
        playersOrphanEmail.slice(0, 10).map(p => ({ nombre: p.nombre, email_padre: p.email_padre })),
        'Invitar a estos padres a registrarse en la app');
    }

    // Players with categories that don't exist in CategoryConfig
    const playersWrongCat = activePlayers.filter(p => {
      const cat = p.categoria_principal || p.deporte;
      return cat && !activeCatNames.has(cat);
    });
    if (playersWrongCat.length > 0) {
      addFinding('medium', 'jugadores', `${playersWrongCat.length} jugador(es) con categoría desactivada o inexistente`,
        'Jugadores asignados a categorías que ya no están activas en la configuración.',
        playersWrongCat.slice(0, 10).map(p => ({ nombre: p.nombre, categoria: p.categoria_principal || p.deporte })),
        'Reasignar categoría desde el panel de Jugadores');
    }

    // DNI missing for >14 years old
    const playersNoDNI = activePlayers.filter(p => {
      const age = calcAge(p.fecha_nacimiento);
      return age !== null && age >= 14 && !p.dni_jugador;
    });
    if (playersNoDNI.length > 0) {
      addFinding('medium', 'jugadores', `${playersNoDNI.length} jugador(es) mayor(es) de 14 sin DNI`,
        'Los mayores de 14 necesitan DNI para federarse.',
        playersNoDNI.slice(0, 10).map(p => ({ nombre: p.nombre, edad: calcAge(p.fecha_nacimiento) })),
        'Solicitar DNI a las familias');
    }

    // Category vs age mismatch (category_requiere_revision)
    const needsReview = activePlayers.filter(p => p.categoria_requiere_revision && !p.categoria_revisada_por);
    if (needsReview.length > 0) {
      addFinding('medium', 'jugadores', `${needsReview.length} jugador(es) con categoría pendiente de revisión`,
        'La categoría seleccionada no coincide con la edad del jugador.',
        needsReview.map(p => ({ nombre: p.nombre, categoria: p.deporte, motivo: p.motivo_revision_categoria })),
        'Revisar y aprobar/corregir la categoría');
    }

    // Completeness score
    const fichaCompleta = activePlayers.filter(p =>
      p.foto_url && p.fecha_nacimiento && p.email_padre &&
      (p.dni_jugador || calcAge(p.fecha_nacimiento) < 14) &&
      p.acepta_politica_privacidad && p.autorizacion_fotografia
    );
    stats.jugadores = {
      totalActivos: activePlayers.length,
      fichasCompletas: fichaCompleta.length,
      porcentajeCompletitud: activePlayers.length > 0 ? Math.round((fichaCompleta.length / activePlayers.length) * 100) : 100,
      sinFoto: activePlayers.filter(p => !p.foto_url).length,
      sinDNI14plus: playersNoDNI.length,
      emailPadreHuerfano: playersOrphanEmail.length,
      categoriaInexistente: playersWrongCat.length,
      pendientesRevision: needsReview.length,
    };
  }

  // ========== 5. SOCIOS (CLUB MEMBERS) ==========
  {
    const currentMembers = (members || []).filter(m => m.temporada === currentTemporada);
    const parentEmails = new Set(activePlayers.map(p => p.email_padre?.toLowerCase()).filter(Boolean));

    // Members without origen_pago
    const noOrigin = currentMembers.filter(m => !m.origen_pago && m.estado_pago === 'Pagado');
    const noOriginNotParent = noOrigin.filter(m => !parentEmails.has(m.email?.toLowerCase()));
    if (noOriginNotParent.length > 0) {
      addFinding('low', 'socios', `${noOriginNotParent.length} socio(s) pagados sin origen de pago identificado`,
        'Socios marcados como pagados pero sin saber cómo pagaron. Dificulta la reconciliación.',
        noOriginNotParent.slice(0, 10).map(m => ({ nombre: m.nombre_completo, email: m.email })),
        'Revisar y asignar origen_pago manualmente');
    }

    // Padre-members without jugadores_hijos
    const parentMembersNoKids = currentMembers.filter(m =>
      (m.es_socio_padre || m.origen_pago === 'socio_padre_auto') &&
      (!m.jugadores_hijos || m.jugadores_hijos.length === 0)
    );
    if (parentMembersNoKids.length > 0) {
      addFinding('medium', 'socios', `${parentMembersNoKids.length} socio(s)-padre sin jugadores vinculados`,
        'Son socios automáticos por inscripción de hijo, pero no tienen jugadores_hijos registrado.',
        parentMembersNoKids.slice(0, 10).map(m => ({ nombre: m.nombre_completo, email: m.email })),
        'Vincular jugadores al socio-padre');
    }

    // Expired but still active
    const expiredActive = currentMembers.filter(m =>
      m.activo && m.fecha_vencimiento && new Date(m.fecha_vencimiento) < now
    );
    if (expiredActive.length > 0) {
      addFinding('medium', 'socios', `${expiredActive.length} socio(s) vencidos pero marcados como activos`,
        'La fecha de vencimiento ya pasó pero el socio sigue marcado como activo.',
        expiredActive.slice(0, 10).map(m => ({ nombre: m.nombre_completo, vencimiento: m.fecha_vencimiento })),
        'Desactivar socios vencidos o renovar su membresía');
    }

    // Duplicate by email
    const memberEmails = {};
    currentMembers.forEach(m => {
      const e = m.email?.toLowerCase();
      if (e) memberEmails[e] = (memberEmails[e] || 0) + 1;
    });
    const dupMembers = Object.entries(memberEmails).filter(([_, c]) => c > 1);
    if (dupMembers.length > 0) {
      addFinding('medium', 'socios', `${dupMembers.length} email(s) duplicados en socios`,
        'Hay socios con el mismo email, posiblemente registros duplicados.',
        dupMembers.map(([email, count]) => ({ email, registros: count })),
        'Fusionar o eliminar registros duplicados');
    }

    stats.socios = {
      totalTemporada: currentMembers.length,
      pagados: currentMembers.filter(m => m.estado_pago === 'Pagado').length,
      pendientes: currentMembers.filter(m => m.estado_pago === 'Pendiente').length,
      sinOrigen: noOrigin.length,
      padresSinHijos: parentMembersNoKids.length,
      vencidosActivos: expiredActive.length,
      duplicados: dupMembers.length,
    };
  }

  // ========== 6. CONVOCATORIAS ==========
  {
    // Past callups not closed
    const pastOpen = (convocatorias || []).filter(c =>
      !c.cerrada && c.fecha_partido && new Date(c.fecha_partido) < now && daysSince(c.fecha_partido) > 1
    );
    if (pastOpen.length > 0) {
      addFinding('low', 'convocatorias', `${pastOpen.length} convocatoria(s) pasadas sin cerrar`,
        'Partidos que ya se jugaron pero la convocatoria no se ha cerrado.',
        pastOpen.slice(0, 10).map(c => ({ titulo: c.titulo, fecha: c.fecha_partido, categoria: c.categoria })),
        'Cerrar convocatorias pasadas para mantener el historial limpio');
    }

    // Callups with 0 responses
    const noResponses = (convocatorias || []).filter(c => {
      if (c.cerrada || !c.publicada) return false;
      const confirmados = (c.jugadores_convocados || []).filter(j => j.confirmacion && j.confirmacion !== 'pendiente');
      return confirmados.length === 0 && (c.jugadores_convocados || []).length > 0;
    });
    if (noResponses.length > 0) {
      addFinding('medium', 'convocatorias', `${noResponses.length} convocatoria(s) publicadas sin respuestas`,
        'Convocatorias enviadas pero ningún padre/jugador ha confirmado asistencia.',
        noResponses.slice(0, 5).map(c => ({ titulo: c.titulo, fecha: c.fecha_partido, convocados: (c.jugadores_convocados || []).length })),
        'Reenviar notificación o contactar familias directamente');
    }

    stats.convocatorias = {
      total: (convocatorias || []).length,
      abiertas: (convocatorias || []).filter(c => !c.cerrada).length,
      pasadasSinCerrar: pastOpen.length,
      sinRespuestas: noResponses.length,
    };
  }

  // ========== 7. COMUNICACIÓN ==========
  {
    // Announcements sent recently with no read tracking (just count)
    const recentAnnouncements = (announcements || []).filter(a => daysSince(a.created_date) < 14 && a.publicado !== false);

    // Surveys with low participation
    const activeSurveys = (surveys || []).filter(s => s.activa !== false);
    const lowParticipation = activeSurveys.filter(s => {
      const responses = (surveyResponses || []).filter(r => r.survey_id === s.id);
      return responses.length < Math.max(3, nonAdminUsers.length * 0.1);
    });
    if (lowParticipation.length > 0) {
      addFinding('low', 'comunicacion', `${lowParticipation.length} encuesta(s) con baja participación`,
        'Encuestas activas con menos del 10% de respuestas respecto a usuarios activos.',
        lowParticipation.map(s => ({ titulo: s.titulo || s.nombre })),
        'Reenviar recordatorio de encuesta o cerrarla');
    }

    // Events requiring RSVP with low confirmation
    const rsvpEvents = (events || []).filter(e =>
      e.requiere_confirmacion && !e.recordatorio_enviado &&
      e.fecha && new Date(e.fecha) > now && daysSince(e.created_date) > 3
    );
    const lowRSVP = rsvpEvents.filter(e => {
      const confirmed = (e.confirmaciones || []).filter(c => c.confirmacion === 'asistire');
      return confirmed.length < 3;
    });
    if (lowRSVP.length > 0) {
      addFinding('low', 'comunicacion', `${lowRSVP.length} evento(s) con pocas confirmaciones`,
        'Eventos que requieren RSVP pero tienen pocas respuestas.',
        lowRSVP.map(e => ({ titulo: e.titulo, fecha: e.fecha })),
        'Enviar recordatorio del evento');
    }

    stats.comunicacion = {
      anunciosRecientes: recentAnnouncements.length,
      encuestasBajas: lowParticipation.length,
      eventosRSVPbajos: lowRSVP.length,
    };
  }

  // ========== 8. INTEGRIDAD GENERAL ==========
  {
    // Categories with 0 active players
    const catsWithPlayers = new Set(activePlayers.map(p => p.categoria_principal || p.deporte).filter(Boolean));
    const emptyCats = activeCategories.filter(c => !catsWithPlayers.has(c.nombre) && !c.es_actividad_complementaria);
    if (emptyCats.length > 0) {
      addFinding('low', 'integridad', `${emptyCats.length} categoría(s) activa(s) sin jugadores`,
        'Categorías configuradas como activas pero sin ningún jugador inscrito.',
        emptyCats.map(c => ({ nombre: c.nombre })),
        'Desactivar si no se van a usar esta temporada');
    }

    // Inactive players with pending payments
    const inactivePlayers = (players || []).filter(p => !p.activo);
    const inactiveWithPending = inactivePlayers.filter(p => {
      const pendingPay = (payments || []).filter(pay => pay.jugador_id === p.id && pay.estado === 'Pendiente' && !pay.is_deleted);
      return pendingPay.length > 0;
    });
    if (inactiveWithPending.length > 0) {
      addFinding('medium', 'integridad', `${inactiveWithPending.length} jugador(es) inactivo(s) con pagos pendientes`,
        'Jugadores dados de baja pero que aún tienen cuotas pendientes de cobrar.',
        inactiveWithPending.slice(0, 10).map(p => ({ nombre: p.nombre, email: p.email_padre })),
        'Anular o cobrar los pagos pendientes');
    }

    stats.integridad = {
      categoriasVacias: emptyCats.length,
      inactivosConPagos: inactiveWithPending.length,
    };
  }

  // ========== GENERATE SUMMARY ==========
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;

  // Sort: critical first, then high, then medium, then low
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Health score (100 = perfect, 0 = disaster)
  let healthScore = 100;
  healthScore -= criticalCount * 15;
  healthScore -= highCount * 8;
  healthScore -= mediumCount * 3;
  healthScore -= lowCount * 1;
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Generate AI summary
  let aiSummary = '';
  try {
    const findingsForAI = findings.slice(0, 20).map(f => `[${f.severity.toUpperCase()}] ${f.module}: ${f.title} — ${f.description}`).join('\n');
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Eres el motor de diagnóstico del CD Bustarviejo, un club deportivo que gestiona jugadores, pagos, socios y comunicación a través de una app.

Analiza estos hallazgos del diagnóstico y genera un resumen ejecutivo EN ESPAÑOL de 3-5 párrafos cortos. 
Sé directo y práctico. Usa lenguaje de gestión, no técnico. Destaca lo más urgente primero.
Termina con las 3 acciones prioritarias que debería hacer el administrador HOY.

DATOS:
- Puntuación de salud: ${healthScore}/100
- Hallazgos críticos: ${criticalCount}, altos: ${highCount}, medios: ${mediumCount}, bajos: ${lowCount}
- Usuarios totales: ${nonAdminUsers.length}, Jugadores activos: ${activePlayers.length}
- Temporada activa: ${currentTemporada}

HALLAZGOS:
${findingsForAI || 'No se detectaron hallazgos significativos. El sistema está en buen estado.'}`,
    });
    aiSummary = response;
  } catch (e) {
    console.error('LLM summary error:', e);
    aiSummary = `Diagnóstico completado. Se detectaron ${findings.length} hallazgos: ${criticalCount} críticos, ${highCount} altos, ${mediumCount} medios, ${lowCount} informativos.`;
  }

  console.log(`🔬 [Diagnostic] Complete: ${findings.length} findings, health score: ${healthScore}`);

  return Response.json({
    timestamp: now.toISOString(),
    healthScore,
    summary: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount, total: findings.length },
    aiSummary,
    findings,
    stats,
    temporada: currentTemporada,
  });
});