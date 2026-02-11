import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { globalThrottler, retryWithBackoff } from "../utils/requestThrottler";

/**
 * Hook unificado para TODAS las notificaciones y badges
 * - 100% real-time con subscriptions
 * - Centralizado - una única fuente de verdad
 * - Actualización instantánea
 */
export function useUnifiedNotifications(user, options = {}) {
  // Activar para TODOS los usuarios para que vean notificaciones
  const shouldBeActive = !!user;
  
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  
  const [notifications, setNotifications] = useState({
    // CHATS (mantenidos para compatibilidad visual; la fuente real vendrá de ChatCounter en UI)
    unreadCoordinatorMessages: 0,
    unreadCoachMessages: 0,
    unreadStaffMessages: 0,
    unreadAdminMessages: 0,
    unreadPrivateMessages: 0,
    unreadFamilyMessages: 0,
    
    // CONVOCATORIAS
    pendingCallups: 0,
    pendingCallupResponses: 0,
    
    // PAGOS
    pendingPayments: 0,
    paymentsInReview: 0,
    overduePayments: 0,
    
    // FIRMAS
    pendingSignatures: 0,
    
    // ANUNCIOS
    unreadAnnouncements: 0,
    
    // ADMIN
    unresolvedAdminChats: 0,
    playersNeedingReview: 0,
    pendingInvitations: 0,
    pendingClothingOrders: 0,
    pendingLotteryOrders: 0,
    pendingMemberRequests: 0,
    pendingDeletionRequests: 0,
    
    // ENTRENADORES
    pendingMatchObservations: 0,
    
    // OTROS
    hasActiveAdminConversation: false,
    unreadSystemMessages: 0,
  });

  const [rawData, setRawData] = useState({
    coordinatorConversations: [],
    coachConversations: [],
    chatMessages: [],
    staffMessages: [],
    adminConversations: [],
    privateConversations: [],
    convocatorias: [],
    payments: [],
    players: [],
    announcements: [],
    invitations: [],
    secondParentInvitations: [],
    clothingOrders: [],
    lotteryOrders: [],
    clubMembers: [],
    matchObservations: [],
    appNotifications: [],
    accountDeletionRequests: [],
  });
  const [isPrimaryInstance, setIsPrimaryInstance] = useState(false);

  // Throttled + retried executor to avoid rate limits
  const run = (fn) => globalThrottler.execute(() => retryWithBackoff(fn));

  // FORZAR RECARGA al volver a la app después de mucho tiempo
  useEffect(() => {
  if (!user) return;

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      const lastRefresh = Number(localStorage.getItem('lastNotifRefresh') || 0);
      const minutesSince = (Date.now() - lastRefresh) / (1000 * 60);

      // Si hace más de 30 minutos que no se actualiza, forzar recarga completa
      if (minutesSince > 30 || lastRefresh === 0) {
        console.log('🔄 [Notificaciones] Forzando recarga completa - hace', minutesSince.toFixed(1), 'minutos');
        setForceRefreshKey(prev => prev + 1);
        localStorage.setItem('lastNotifRefresh', String(Date.now()));
      }
    }
  };

    // Marcar timestamp inicial
    if (!localStorage.getItem('lastNotifRefresh')) {
      localStorage.setItem('lastNotifRefresh', String(Date.now()));
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Global listener to receive updates from the primary notifications instance
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const globalState = window.__BASE44_UNIFIED_NOTIFICATIONS_STATE;
      if (globalState) setNotifications(globalState);
    } catch {}
    const handler = (e) => {
      if (e?.detail) setNotifications(e.detail);
    };
    window.addEventListener('b44_unified_notifications_updated', handler);
    return () => window.removeEventListener('b44_unified_notifications_updated', handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // DESACTIVAR para usuarios normales (padres sin roles especiales)
    if (!shouldBeActive) {
      console.log('🔕 [useUnifiedNotifications] DESACTIVADO para usuario normal - reducir rate limiting');
      return;
    }

    // Prevent duplicate initialization across mounts (mark primary/secondary)
    if (options?.forceInstance && typeof window !== 'undefined') {
      setIsPrimaryInstance(true);
      window.__BASE44_UNIFIED_NOTIFICATIONS_ACTIVE = true;
    } else {
      let primary = true;
      if (!options?.forceInstance && typeof window !== 'undefined') {
        if (window.__BASE44_UNIFIED_NOTIFICATIONS_ACTIVE) {
          primary = false;
        } else {
          window.__BASE44_UNIFIED_NOTIFICATIONS_ACTIVE = true;
        }
      }
      setIsPrimaryInstance(primary);
      if (!primary) {
        // Secondary instances only listen to global bus; no subscriptions
        return;
      }
    }

    // Pause heavy real-time if maintenance window active or tab hidden
    const until = Number(localStorage.getItem('maintenanceModeUntil') || 0);
    const paused = until && Date.now() < until;
    const hidden = typeof document !== 'undefined' && document.hidden;
    const pausedGlobal = typeof window !== 'undefined' && window.__BASE44_PAUSE_REALTIME__ === true;
    if ((paused || pausedGlobal) || hidden) {
      if (!options?.ignorePause) return;
    }

    const unsubscribers = [];

    // ===== CHATS - DESACTIVADO (se reimplementará con nuevo sistema) =====

    // App Notifications (para fallback de badges, incluido Staff)
    const loadAppNotifs = async () => {
      const notifs = await run(() => base44.entities.AppNotification.filter({ usuario_email: user.email, vista: false }));
      setRawData(prev => ({ ...prev, appNotifications: notifs }));
    };
    setTimeout(() => run(loadAppNotifs), 5500);
    let lastAppNotifUpdate = 0;
    const unsubAppNotif = base44.entities.AppNotification.subscribe((event) => {
      const now = Date.now();
      if (now - lastAppNotifUpdate < 1000) return;
      lastAppNotifUpdate = now;
      // Solo notificaciones del usuario actual
      if (event.data?.usuario_email !== user.email) return;
      setRawData(prev => {
        let updated = [...(prev.appNotifications || [])];
        if (event.type === 'create') updated = [event.data, ...updated];
        else if (event.type === 'update') updated = updated.map(n => n.id === event.id ? event.data : n);
        else if (event.type === 'delete') updated = updated.filter(n => n.id !== event.id);
        return { ...prev, appNotifications: updated };
      });
    });
    unsubscribers.push(unsubAppNotif);

    // Private Conversations - DESACTIVADO (se reimplementará con nuevo sistema)

    // ===== CONVOCATORIAS =====
    const loadConvocatorias = async () => {
      const convs = await run(() => base44.entities.Convocatoria.list('-created_date', 30));
      setRawData(prev => ({ ...prev, convocatorias: convs }));
    };
    if (forceRefreshKey > 0) {
      run(loadConvocatorias);
    } else {
      setTimeout(() => run(loadConvocatorias), 7500);
    }
    let lastCallupsUpdate = 0;
    const unsubConvocatorias = base44.entities.Convocatoria.subscribe((event) => {
        const now = Date.now();
        if (now - lastCallupsUpdate < 1000) return;
        lastCallupsUpdate = now;
        setRawData(prev => {
          let updated = [...prev.convocatorias];
          if (event.type === 'create') updated = [event.data, ...updated];
          else if (event.type === 'update') updated = updated.map(c => c.id === event.id ? event.data : c);
          else if (event.type === 'delete') updated = updated.filter(c => c.id !== event.id);
          return { ...prev, convocatorias: updated };
        });
    });
    unsubscribers.push(unsubConvocatorias);

    // ===== PAGOS ===== (solo para admin/tesorero, para reducir carga)
    if (user.role === 'admin' || user.es_tesorero) {
      const loadPayments = async () => {
        const pays = await run(() => base44.entities.Payment.list('-created_date', 30));
        setRawData(prev => ({ ...prev, payments: pays }));
      };
      if (forceRefreshKey > 0) {
        run(loadPayments);
      } else {
        setTimeout(() => run(loadPayments), 8500);
      }
      let lastPaymentsUpdate = 0;
      const unsubPayments = base44.entities.Payment.subscribe((event) => {
          const now = Date.now();
          if (now - lastPaymentsUpdate < 1000) return;
          lastPaymentsUpdate = now;
          setRawData(prev => {
            let updated = [...prev.payments];
            if (event.type === 'create') updated = [event.data, ...updated];
            else if (event.type === 'update') updated = updated.map(p => p.id === event.id ? event.data : p);
            else if (event.type === 'delete') updated = updated.filter(p => p.id !== event.id);
            return { ...prev, payments: updated };
          });
      });
      unsubscribers.push(unsubPayments);
    }

    // ===== JUGADORES =====
    const loadPlayers = async () => {
      let pls = [];
      if (options?.testModeLoadAll) {
        pls = await run(() => base44.entities.Player.list('-updated_date', 80));
      } else if (user?.role === 'admin') {
        pls = await run(() => base44.entities.Player.filter({ categoria_requiere_revision: true }, '-updated_date', 120));
      } else {
        pls = await run(() => base44.entities.Player.filter({ $or: [ { email_padre: user?.email }, { email_tutor_2: user?.email }, { email_jugador: user?.email } ] }, '-updated_date', 100));
      }
      setRawData(prev => ({ ...prev, players: pls }));
    };
    if (forceRefreshKey > 0) {
      run(loadPlayers);
    } else {
      setTimeout(() => run(loadPlayers), 9500);
    }
    if (user.role !== 'admin' && !user.es_entrenador && !user.es_coordinador && !user.es_tesorero) {
      let lastPlayersUpdate = 0;
      const unsubPlayers = base44.entities.Player.subscribe((event) => {
          const now = Date.now();
          if (now - lastPlayersUpdate < 1500) return;
          lastPlayersUpdate = now;
          setRawData(prev => {
            let updated = [...prev.players];
            if (event.type === 'create') updated = [event.data, ...updated];
            else if (event.type === 'update') updated = updated.map(p => p.id === event.id ? event.data : p);
            else if (event.type === 'delete') updated = updated.filter(p => p.id !== event.id);
            return { ...prev, players: updated };
          });
      });
      unsubscribers.push(unsubPlayers);
    }

    // ===== ANUNCIOS =====
    const loadAnnouncements = async () => {
      const anns = await run(() => base44.entities.Announcement.filter({ publicado: true }, '-fecha_publicacion', 20));
      setRawData(prev => ({ ...prev, announcements: anns }));
    };
    if (forceRefreshKey > 0) {
      run(loadAnnouncements);
    } else {
      setTimeout(() => run(loadAnnouncements), 10500);
    }
    let lastAnnouncementsUpdate = 0;
    const unsubAnnouncements = base44.entities.Announcement.subscribe((event) => {
        const now = Date.now();
        if (now - lastAnnouncementsUpdate < 1000) return;
        lastAnnouncementsUpdate = now;
        setRawData(prev => {
          let updated = [...prev.announcements];
          if (event.type === 'create') updated = [event.data, ...updated];
          else if (event.type === 'update') updated = updated.map(a => a.id === event.id ? event.data : a);
          else if (event.type === 'delete') updated = updated.filter(a => a.id !== event.id);
          return { ...prev, announcements: updated };
        });
    });
    unsubscribers.push(unsubAnnouncements);

    // ===== ADMIN ONLY =====
    if (user.role === 'admin') {
      const loadInvitations = async () => {
        const [inv, secInv, clothing, lottery, members, delReqSolicitada, delReqRevision] = await Promise.all([
          base44.entities.InvitationRequest.filter({ estado: "Pendiente" }),
          base44.entities.SecondParentInvitation.filter({ estado: "pendiente" }),
          base44.entities.ClothingOrder.list('-updated_date', 80),
          base44.entities.LotteryOrder.filter({ estado: "Solicitado", pagado: false }),
          base44.entities.ClubMember.filter({ estado_pago: "Pendiente" }),
          base44.entities.AccountDeletionRequest.filter({ status: "solicitada" }),
          base44.entities.AccountDeletionRequest.filter({ status: "en_revision" })
        ]);
        setRawData(prev => ({ 
          ...prev, 
          invitations: inv, 
          secondParentInvitations: secInv,
          clothingOrders: clothing,
          lotteryOrders: lottery,
          clubMembers: members,
          accountDeletionRequests: [...(delReqSolicitada || []), ...(delReqRevision || [])]
        }));
      };
      if (forceRefreshKey > 0) {
        run(loadInvitations);
      } else {
        setTimeout(() => run(loadInvitations), 11500);
      }
      
      const unsubInv = base44.entities.InvitationRequest.subscribe(() => {
                    globalThrottler.execute(() => {
                      base44.entities.InvitationRequest.filter({ estado: "Pendiente" }).then(inv => {
                        setRawData(prev => ({ ...prev, invitations: inv }));
                      });
                    });
                  });
      const unsubSecInv = base44.entities.SecondParentInvitation.subscribe(() => {
                    globalThrottler.execute(() => {
                      base44.entities.SecondParentInvitation.filter({ estado: "pendiente" }).then(sec => {
                        setRawData(prev => ({ ...prev, secondParentInvitations: sec }));
                      });
                    });
                  });
      const unsubClothing = base44.entities.ClothingOrder.subscribe((event) => {
                    globalThrottler.execute(() => {
                      setRawData(prev => {
                        let updated = [...prev.clothingOrders];
                        if (event.type === 'create') updated = [event.data, ...updated];
                        else if (event.type === 'update') updated = updated.map(o => o.id === event.id ? event.data : o);
                        else if (event.type === 'delete') updated = updated.filter(o => o.id !== event.id);
                        return { ...prev, clothingOrders: updated };
                      });
                    });
                  });
      const unsubLottery = base44.entities.LotteryOrder.subscribe(() => {
                    globalThrottler.execute(() => {
                      base44.entities.LotteryOrder.filter({ estado: "Solicitado", pagado: false }).then(orders => {
                        setRawData(prev => ({ ...prev, lotteryOrders: orders }));
                      });
                    });
                  });
      const unsubMembers = base44.entities.ClubMember.subscribe(() => {
                    globalThrottler.execute(() => {
                      base44.entities.ClubMember.filter({ estado_pago: "Pendiente" }).then(members => {
                        setRawData(prev => ({ ...prev, clubMembers: members }));
                      });
                    });
                  });
      const unsubDeletionReq = base44.entities.AccountDeletionRequest.subscribe(() => {
                    globalThrottler.execute(async () => {
                      const [sol, rev] = await Promise.all([
                        base44.entities.AccountDeletionRequest.filter({ status: "solicitada" }),
                        base44.entities.AccountDeletionRequest.filter({ status: "en_revision" })
                      ]);
                      setRawData(prev => ({ ...prev, accountDeletionRequests: [...(sol || []), ...(rev || [])] }));
                    });
                  });

                  unsubscribers.push(unsubInv, unsubSecInv, unsubClothing, unsubLottery, unsubMembers, unsubDeletionReq);
    }

    // ===== ENTRENADORES/COORDINADORES =====
     if (user.es_entrenador === true || user.es_coordinador === true) {
      const loadObservations = async () => {
        const obs = await run(() => base44.entities.MatchObservation.list('-updated_date', 40));
        setRawData(prev => ({ ...prev, matchObservations: obs }));
      };
      if (forceRefreshKey > 0) {
        run(loadObservations);
      } else {
        setTimeout(() => run(loadObservations), 12500);
      }
      let lastObsUpdate = 0;
      const unsubObs = base44.entities.MatchObservation.subscribe((event) => {
        const now = Date.now();
        if (now - lastObsUpdate < 1000) return;
        lastObsUpdate = now;
        setRawData(prev => {
          let updated = [...prev.matchObservations];
          if (event.type === 'create') updated = [event.data, ...updated];
          else if (event.type === 'update') updated = updated.map(o => o.id === event.id ? event.data : o);
          else if (event.type === 'delete') updated = updated.filter(o => o.id !== event.id);
          return { ...prev, matchObservations: updated };
        });
      });
      unsubscribers.push(unsubObs);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (!options?.forceInstance && typeof window !== 'undefined' && isPrimaryInstance) {
        window.__BASE44_UNIFIED_NOTIFICATIONS_ACTIVE = false;
        }
        };
        }, [user, shouldBeActive, forceRefreshKey]);

  // Limpieza automática de notificaciones huérfanas/antiguas (no vistas)
  useEffect(() => {
    if (!user) return;
    const cleanup = async () => {
      try {
        const now = Date.now();
        const stale = (rawData.appNotifications || []).filter(n => {
          if (!n || n.vista) return false;
          const created = n.created_date ? new Date(n.created_date).getTime() : 0;
          const ageHours = created ? (now - created) / 36e5 : 0;
          // Regla: notifs de eventos >48h o cualquier notif >30 días
          if ((n.tipo && /event/i.test(n.tipo) && ageHours > 48)) return true;
          if (ageHours > 24 * 30) return true;
          return false;
        });
        for (const notif of stale) {
          await run(() => base44.entities.AppNotification.update(notif.id, {
            vista: true,
            fecha_vista: new Date().toISOString()
          }));
        }
      } catch {}
    };
    cleanup();
  }, [user, rawData.appNotifications]);

  // CALCULAR NOTIFICACIONES a partir de rawData
  useEffect(() => {
    if (!user) return;

    const myPlayerIds = (rawData.players || [])
      .filter(p => p.email_padre === user.email || p.email_tutor_2 === user.email || p.email_jugador === user.email)
      .map(p => p.id);
    
    const myCategories = [...new Set((rawData.players || [])
      .filter(p => myPlayerIds.includes(p.id))
      .map(p => p.categoria_principal || p.deporte))];

    const coachCategories = user.categorias_entrena || [];

    // === CHATS - DESACTIVADO (se reimplementará con nuevo sistema) ===
    const unreadCoordinatorForParent = 0;
    const unreadCoordinatorForStaff = 0;
    const unreadCoachForParent = 0;
    const unreadCoachForStaff = 0;
    const unreadStaff = 0;
    const unreadAdmin = 0;
    const unreadPrivate = 0;
    const unreadSystemMessages = 0;
    const breakdown = {};

    // CONVOCATORIAS
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    let pendingCallups = 0;
    let pendingCallupResponses = 0;

    (rawData.convocatorias || []).forEach(callup => {
      if (!callup.publicada || callup.cerrada) return;
      if (callup.fecha_partido < todayStr) return;

      // Para padres
      callup.jugadores_convocados?.forEach(j => {
        if (myPlayerIds.includes(j.jugador_id) && j.confirmacion === 'pendiente') {
          pendingCallups++;
        }
      });

      // Para entrenadores (respuestas sin confirmar)
        if ((user.es_entrenador === true || user.es_coordinador === true) && callup.entrenador_email === user.email) {
        const pendingCount = callup.jugadores_convocados?.filter(j => j.confirmacion === 'pendiente').length || 0;
        pendingCallupResponses += pendingCount;
      }
    });

    // PAGOS
    const myPayments = (rawData.payments || []).filter(p => myPlayerIds.includes(p.jugador_id) && p.is_deleted !== true);
    const pendingPayments = myPayments.filter(p => p.estado === 'Pendiente').length;
    const paymentsInReview = myPayments.filter(p => p.estado === 'En revisión').length;
    
    // Vencidos (fecha límite superada)
    let overduePayments = 0;
    myPayments.forEach(p => {
      if (p.estado !== 'Pendiente') return;
      const limits = { 'Junio': '2026-06-30', 'Septiembre': '2026-09-30', 'Diciembre': '2026-12-31' };
      const limit = limits[p.mes];
      if (limit && new Date() > new Date(limit)) overduePayments++;
    });

    // FIRMAS
    const myActivePlayers = (rawData.players || []).filter(p => myPlayerIds.includes(p.id) && p.activo === true);
    const pendingSignatures = myActivePlayers.filter(p => 
      (p.enlace_firma_jugador && !p.firma_jugador_completada) ||
      (p.enlace_firma_tutor && !p.firma_tutor_completada)
    ).length;

    // ANUNCIOS
    const now = new Date();
    const unreadAnnouncements = (rawData.announcements || []).filter(ann => {
      if (!ann.publicado) return false;
      if (ann.tipo_caducidad === "horas" && ann.fecha_caducidad_calculada) {
        if (now > new Date(ann.fecha_caducidad_calculada)) return false;
      } else if (ann.fecha_expiracion && now > new Date(ann.fecha_expiracion)) {
        return false;
      }
      const alreadyRead = ann.leido_por?.some(l => l.email === user.email);
      if (alreadyRead) return false;
      if (ann.destinatarios_tipo === "Todos") return true;
      return myCategories.includes(ann.destinatarios_tipo);
    }).length;

    // ADMIN
    let unresolvedAdminChats = 0;
    let playersNeedingReview = 0;
    let pendingInvitations = 0;
    let pendingClothingOrders = 0;
    let pendingLotteryOrders = 0;
    let pendingMemberRequests = 0;
    let pendingDeletionRequests = 0;

    if (user.role === 'admin') {
      unresolvedAdminChats = (rawData.adminConversations || []).filter(c => c.resuelta === false).length;
      playersNeedingReview = (rawData.players || []).filter(p => p.categoria_requiere_revision === true).length;
      pendingInvitations = (rawData.invitations || []).length + (rawData.secondParentInvitations || []).length;
      pendingClothingOrders = (rawData.clothingOrders || []).filter(o => o.estado === 'Pendiente' || o.estado === 'En revisión').length;
      pendingLotteryOrders = (rawData.lotteryOrders || []).length;
      pendingMemberRequests = (rawData.clubMembers || []).length;
      pendingDeletionRequests = (rawData.accountDeletionRequests || []).length;
    }

    // OBSERVACIONES DE PARTIDOS
     let pendingMatchObservations = 0;
     if (user.es_entrenador === true || user.es_coordinador === true) {
      const myCallups = (rawData.convocatorias || []).filter(c => c.entrenador_email === user.email && c.publicada);
      const now = new Date();
      
      myCallups.forEach(callup => {
        const matchDate = new Date(callup.fecha_partido);
        if (matchDate > now) return;
        
        let matchEnded = false;
        if (callup.hora_partido) {
          const [h, m] = callup.hora_partido.split(':').map(Number);
          const start = new Date(matchDate);
          start.setHours(h, m, 0, 0);
          const end = new Date(start.getTime() + 135 * 60000);
          matchEnded = now >= end;
        } else {
          const nextDay = new Date(matchDate);
          nextDay.setDate(nextDay.getDate() + 1);
          matchEnded = now >= nextDay;
        }

        if (!matchEnded) return;

        const hasObservation = (rawData.matchObservations || []).some(obs =>
          obs.categoria === callup.categoria &&
          obs.rival === callup.rival &&
          obs.fecha_partido === callup.fecha_partido &&
          obs.entrenador_email === user.email
        );
        
        if (!hasObservation) pendingMatchObservations++;
      });
    }

    // CONVERSACIÓN ACTIVA CON ADMIN
    const hasActiveAdminConversation = (rawData.adminConversations || []).some(c => 
      c.padre_email === user.email && c.resuelta === false
    );

    // APP NOTIFICATIONS (fallback/visual - mensajes que llegan al notificador)
    const appNotificationsCount = (rawData.appNotifications || []).filter(n => !n.vista).length;

    // Contar AppNotifications específicas por enlace
    const appNotifsByLink = {};
    (rawData.appNotifications || []).forEach(notif => {
      if (!notif.vista) {
        appNotifsByLink[notif.enlace] = (appNotifsByLink[notif.enlace] || 0) + 1;
      }
    });

    // ACTUALIZAR ESTADO (y publicar en global para otros consumidores)
    const next = {
      // CHATS - separados por rol y tipo
      unreadCoordinatorMessages: Math.max(unreadCoordinatorForParent, appNotifsByLink['ParentCoordinatorChat'] || 0), // Para familias
      unreadCoachMessages: Math.max(unreadCoachForParent, appNotifsByLink['ParentCoachChat'] || 0), // Para familias - considerar AppNotification
      unreadStaffMessages: Math.max(unreadStaff, appNotifsByLink['StaffChat'] || 0),                      // Staff interno
      unreadAdminMessages: unreadAdmin,
      unreadPrivateMessages: Math.max(unreadPrivate, appNotifsByLink['ParentSystemMessages'] || 0),
      unreadSystemMessages: Math.max(unreadSystemMessages, appNotifsByLink['ParentSystemMessages'] || 0), // System messages for parents
      unreadFamilyMessages: unreadCoordinatorForStaff + unreadCoachForStaff, // Total de mensajes de familias para staff
      unreadCoordinatorForStaff,  // Para coordinadores: mensajes de familias
      unreadCoachForStaff,         // Para entrenadores: mensajes de familias
      pendingCallups,
      pendingCallupResponses,
      pendingPayments,
      paymentsInReview,
      overduePayments,
      pendingSignatures,
      unreadAnnouncements,
      unresolvedAdminChats,
      playersNeedingReview,
      pendingInvitations,
      pendingClothingOrders,
      pendingLotteryOrders,
      pendingMemberRequests,
      pendingDeletionRequests,
      pendingMatchObservations,
      hasActiveAdminConversation,
      appNotificationsCount,
      breakdown,
    };
    setNotifications(next);
    try {
      if (typeof window !== 'undefined') {
        window.__BASE44_UNIFIED_NOTIFICATIONS_STATE = next;
        window.dispatchEvent(new CustomEvent('b44_unified_notifications_updated', { detail: next }));
      }
    } catch {}
  }, [user, rawData]);

  return { notifications, rawData };
}