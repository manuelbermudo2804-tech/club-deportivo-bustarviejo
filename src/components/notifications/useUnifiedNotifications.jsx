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

    // Safe subscribe helper - guards against missing .subscribe, non-function returns, or old browsers
    const safeSubscribe = (entityName, handler) => {
      try {
        const entity = base44.entities[entityName];
        if (!entity?.subscribe) return;
        const unsub = entity.subscribe(handler);
        if (typeof unsub === 'function') unsubscribers.push(unsub);
      } catch (e) {
        console.warn(`[useUnifiedNotifications] subscribe ${entityName} failed:`, e?.message);
      }
    };

    // ===== CHATS - DESACTIVADO (se reimplementará con nuevo sistema) =====

    // App Notifications (para fallback de badges, incluido Staff)
    const loadAppNotifs = async () => {
      const notifs = await run(() => base44.entities.AppNotification.filter({ usuario_email: user.email, vista: false }));
      setRawData(prev => ({ ...prev, appNotifications: notifs }));
    };
    setTimeout(() => run(loadAppNotifs), 5500);
    let lastAppNotifUpdate = 0;
    safeSubscribe('AppNotification', (event) => {
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
    safeSubscribe('Convocatoria', (event) => {
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
      safeSubscribe('Payment', (event) => {
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
    }

    // ===== JUGADORES =====
    const loadPlayers = async () => {
      let pls = [];
      if (options?.testModeLoadAll) {
        pls = await run(() => base44.entities.Player.list('-updated_date', 80));
      } else if (user?.role === 'admin') {
        pls = await run(() => base44.entities.Player.filter({ categoria_requiere_revision: true }, '-updated_date', 120));
      } else {
        // 2 consultas paralelas: padres/tutores (la más común) + jugador adulto
        // Consolidado de 3 a 2 llamadas agrupando padre+tutor2 en una sola
        const [plsByPadre, plsByTutor2, plsByJugador] = await Promise.all([
          run(() => base44.entities.Player.filter({ email_padre: user?.email }, '-updated_date', 100)).catch(() => []),
          run(() => base44.entities.Player.filter({ email_tutor_2: user?.email }, '-updated_date', 100)).catch(() => []),
          user?.es_jugador ? run(() => base44.entities.Player.filter({ email_jugador: user?.email }, '-updated_date', 10)).catch(() => []) : Promise.resolve([]),
        ]);
        const plsMap = new Map();
        [...plsByPadre, ...plsByTutor2, ...plsByJugador].forEach(p => plsMap.set(p.id, p));
        pls = Array.from(plsMap.values());
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
      safeSubscribe('Player', (event) => {
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
    safeSubscribe('Announcement', (event) => {
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

    // ===== ADMIN ONLY =====
    if (user.role === 'admin' || user.es_tesorero) {
      const loadInvitations = async () => {
        // Tesorero solo necesita clothing+members; admin necesita todo
        const isFullAdmin = user.role === 'admin';
        const [inv, secInv, clothing, lottery, members, delReqSolicitada, delReqRevision] = await Promise.all([
          isFullAdmin ? base44.entities.InvitationRequest.filter({ estado: "Pendiente" }) : Promise.resolve([]),
          isFullAdmin ? base44.entities.SecondParentInvitation.filter({ estado: "pendiente" }) : Promise.resolve([]),
          base44.entities.ClothingOrder.list('-updated_date', 80),
          isFullAdmin ? base44.entities.LotteryOrder.filter({ estado: "Solicitado", pagado: false }) : Promise.resolve([]),
          base44.entities.ClubMember.filter({ estado_pago: "Pendiente" }),
          isFullAdmin ? base44.entities.AccountDeletionRequest.filter({ status: "solicitada" }) : Promise.resolve([]),
          isFullAdmin ? base44.entities.AccountDeletionRequest.filter({ status: "en_revision" }) : Promise.resolve([]),
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
      
      safeSubscribe('InvitationRequest', () => {
        globalThrottler.execute(() => {
          base44.entities.InvitationRequest.filter({ estado: "Pendiente" }).then(inv => {
            setRawData(prev => ({ ...prev, invitations: inv }));
          }).catch(() => {});
        });
      });
      safeSubscribe('SecondParentInvitation', () => {
        globalThrottler.execute(() => {
          base44.entities.SecondParentInvitation.filter({ estado: "pendiente" }).then(sec => {
            setRawData(prev => ({ ...prev, secondParentInvitations: sec }));
          }).catch(() => {});
        });
      });
      safeSubscribe('ClothingOrder', (event) => {
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
      safeSubscribe('LotteryOrder', () => {
        globalThrottler.execute(() => {
          base44.entities.LotteryOrder.filter({ estado: "Solicitado", pagado: false }).then(orders => {
            setRawData(prev => ({ ...prev, lotteryOrders: orders }));
          }).catch(() => {});
        });
      });
      safeSubscribe('ClubMember', () => {
        globalThrottler.execute(() => {
          base44.entities.ClubMember.filter({ estado_pago: "Pendiente" }).then(members => {
            setRawData(prev => ({ ...prev, clubMembers: members }));
          }).catch(() => {});
        });
      });
      safeSubscribe('AccountDeletionRequest', () => {
        globalThrottler.execute(async () => {
          try {
            const [sol, rev] = await Promise.all([
              base44.entities.AccountDeletionRequest.filter({ status: "solicitada" }),
              base44.entities.AccountDeletionRequest.filter({ status: "en_revision" })
            ]);
            setRawData(prev => ({ ...prev, accountDeletionRequests: [...(sol || []), ...(rev || [])] }));
          } catch {}
        });
      });
    }

    // ===== ENTRENADORES/COORDINADORES - matchObservations ELIMINADO =====

    return () => {
      unsubscribers.forEach(unsub => { try { unsub(); } catch {} });
      if (!options?.forceInstance && typeof window !== 'undefined' && isPrimaryInstance) {
        window.__BASE44_UNIFIED_NOTIFICATIONS_ACTIVE = false;
      }
    };
  }, [user, shouldBeActive, forceRefreshKey]);

  // Limpieza automática de notificaciones huérfanas/antiguas (no vistas)
  // Limitada a max 5 por ciclo para no saturar móviles lentos
  useEffect(() => {
    if (!user) return;
    const cleanup = async () => {
      try {
        const now = Date.now();
        const stale = (rawData.appNotifications || []).filter(n => {
          if (!n || n.vista) return false;
          const created = n.created_date ? new Date(n.created_date).getTime() : 0;
          const ageHours = created ? (now - created) / 36e5 : 0;
          if ((n.tipo && /event/i.test(n.tipo) && ageHours > 48)) return true;
          if (ageHours > 24 * 30) return true;
          return false;
        }).slice(0, 5); // Max 5 por ciclo
        for (const notif of stale) {
          await run(() => base44.entities.AppNotification.update(notif.id, {
            vista: true,
            fecha_vista: new Date().toISOString()
          })).catch(() => {});
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
    
    // Vencidos (fecha límite superada) - cálculo dinámico basado en temporada
    let overduePayments = 0;
    const nowDate = new Date();
    myPayments.forEach(p => {
      if (p.estado !== 'Pendiente') return;
      // Calcular año de inicio de temporada desde el campo temporada del pago
      const getStartYear = (temp) => {
        if (!temp || typeof temp !== 'string') return nowDate.getFullYear();
        const match = temp.match(/(\d{4})[\/-]/);
        return match ? parseInt(match[1], 10) : nowDate.getFullYear();
      };
      const startYear = getStartYear(p.temporada);
      const limits = {
        'Junio': new Date(startYear + 1, 5, 30),       // 30 junio del año siguiente
        'Septiembre': new Date(startYear, 8, 30),       // 30 septiembre del año inicio
        'Diciembre': new Date(startYear, 11, 31)        // 31 diciembre del año inicio
      };
      const limit = limits[p.mes];
      if (limit && nowDate > limit) overduePayments++;
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
      // unresolvedAdminChats desactivado - se reimplementará
      playersNeedingReview = (rawData.players || []).filter(p => p.categoria_requiere_revision === true).length;
      pendingInvitations = (rawData.invitations || []).length + (rawData.secondParentInvitations || []).length;
      pendingClothingOrders = (rawData.clothingOrders || []).filter(o => o.estado === 'Pendiente' || o.estado === 'En revisión').length;
      pendingLotteryOrders = (rawData.lotteryOrders || []).length;
      pendingMemberRequests = (rawData.clubMembers || []).length;
      pendingDeletionRequests = (rawData.accountDeletionRequests || []).length;
    }

    // OBSERVACIONES DE PARTIDOS - ELIMINADO (registro post-partido desactivado)
    const pendingMatchObservations = 0;

    // CONVERSACIÓN ACTIVA CON ADMIN - desactivado
    const hasActiveAdminConversation = false;

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
        window.__BASE44_UNIFIED_NOTIFICATIONS_RAW = rawData;
        window.dispatchEvent(new CustomEvent('b44_unified_notifications_updated', { detail: next }));
      }
    } catch {}
  }, [user, rawData]);

  return { notifications, rawData };
}