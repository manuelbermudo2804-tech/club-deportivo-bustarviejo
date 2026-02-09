import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UnifiedChatNotificationStore } from './UnifiedChatNotificationStore';

/**
 * SINCRONIZADOR DE NOTIFICACIONES EN TIEMPO REAL
 * 
 * Escucha TODOS los mensajes en tiempo real y actualiza los contadores
 * Se monta UNA SOLA VEZ en el Layout
 * 
 * Principios:
 * - Incrementa contadores cuando llega un mensaje NUEVO
 * - No borra contadores - solo los chats abiertos lo hacen
 * - Diferencia entre tipos de chat (staff, coordinator, coach, etc.)
 */
export function ChatNotificationSync({ user }) {
  useEffect(() => {
    if (!user?.email) return;

    if (typeof window !== 'undefined') {
      if (window.__B44_CHAT_SYNC_ACTIVE) {
        console.log('⚠️ [ChatNotificationSync] Ya está activo - ignorando duplicado');
        return;
      }
      window.__B44_CHAT_SYNC_ACTIVE = true;
      console.log('✅ [ChatNotificationSync] Activado para', user.email);
    }

    const unsubscribers = [];
    const processedEvents = new Set(); // Anti-duplicados

    // ===== CARGA INICIAL DESDE BD (CRÍTICO PARA PERSISTENCIA) =====
    const loadInitialCounts = async () => {
      console.log('📊 [ChatNotificationSync] Cargando contadores iniciales desde BD...');
      
      try {
        // 1. Staff chat
        if (user.es_coordinador || user.es_entrenador || user.role === 'admin') {
          const staffConvs = await base44.entities.StaffConversation.filter({});
          const staffUnread = staffConvs.reduce((sum, conv) => {
            const reads = conv.last_read_by || [];
            const myRead = reads.find(r => r.email === user.email);
            if (!myRead || !conv.ultimo_mensaje_fecha) return sum;
            const lastReadTime = new Date(myRead.fecha).getTime();
            const lastMsgTime = new Date(conv.ultimo_mensaje_fecha).getTime();
            return sum + (lastMsgTime > lastReadTime ? 1 : 0);
          }, 0);
          UnifiedChatNotificationStore.updateCount(user.email, 'staff', staffUnread);
        }

        // 2. Coordinador - familias
        if (user.es_coordinador) {
          const coordConvs = await base44.entities.CoordinatorConversation.filter({});
          const coordUnread = coordConvs.reduce((sum, c) => sum + (c.no_leidos_coordinador || 0), 0);
          UnifiedChatNotificationStore.updateCount(user.email, 'coordinator', coordUnread);
        }

        // 3. Familia - coordinador
        if (!user.es_entrenador && !user.es_coordinador && user.role !== 'admin') {
          const coordConvs = await base44.entities.CoordinatorConversation.filter({ padre_email: user.email });
          const coordUnread = coordConvs.reduce((sum, c) => sum + (c.no_leidos_padre || 0), 0);
          UnifiedChatNotificationStore.updateCount(user.email, 'coordinatorForFamily', coordUnread);

          // 4. Mensajes del club
          const privateConvs = await base44.entities.PrivateConversation.filter({ participante_familia_email: user.email });
          const privateUnread = privateConvs.reduce((sum, c) => sum + (c.no_leidos_familia || 0), 0);
          UnifiedChatNotificationStore.updateCount(user.email, 'systemMessages', privateUnread);

          // 5. Entrenador - familias (ChatMessage grupo)
          const myPlayers = await base44.entities.Player.filter({
            $or: [
              { email_padre: user.email },
              { email_tutor_2: user.email },
              { email_jugador: user.email }
            ],
            activo: true
          });

          const myCategories = myPlayers.map(p => p.categoria_principal || p.deporte).filter(Boolean);
          let coachUnread = 0;

          for (const cat of myCategories) {
            const normalizeId = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(.*?\)/g,'').trim().replace(/\s+/g,'_');
            const groupId = normalizeId(cat);
            
            const messages = await base44.entities.ChatMessage.filter({ grupo_id: groupId }, '-created_date', 50);
            const unreadInGroup = messages.filter(msg => 
              (msg.tipo === 'entrenador_a_grupo' || msg.tipo === 'padre_a_grupo') &&
              msg.remitente_email !== user.email &&
              (!msg.leido_por || !msg.leido_por.some(r => r.email === user.email))
            ).length;
            
            coachUnread += unreadInGroup;
          }

          UnifiedChatNotificationStore.updateCount(user.email, 'coachForFamily', coachUnread);
        }

        console.log('✅ [ChatNotificationSync] Contadores iniciales cargados');
      } catch (e) {
        console.error('❌ [ChatNotificationSync] Error cargando contadores iniciales:', e);
      }
    };

    loadInitialCounts();

    // ===== 1. STAFF CHAT (interno) =====
    if (user.es_coordinador || user.es_entrenador || user.role === 'admin') {
      const unsubStaff = base44.entities.StaffMessage.subscribe((event) => {
        if (event.type === 'create' && event.data?.autor_email !== user.email) {
          const eventKey = `staff_${event.data.id}`;
          if (processedEvents.has(eventKey)) return;
          processedEvents.add(eventKey);

          const destinatarios = event.data?.staff_destinatarios;
          let autorizado = !destinatarios || destinatarios.length === 0;
          
          if (destinatarios && destinatarios.length > 0) {
            autorizado = (
              (user.es_coordinador && destinatarios.includes('coordinator')) ||
              (user.es_entrenador && destinatarios.includes('coach')) ||
              (user.role === 'admin' && destinatarios.includes('admin'))
            );
          }
          
          if (autorizado) {
            console.log('✅ [ChatNotificationSync] Incrementando staff para', user.email);
            UnifiedChatNotificationStore.increment(user.email, 'staff');
          }
        }
      });
      unsubscribers.push(unsubStaff);
    }

    // ===== 2. COORDINADOR - FAMILIAS (1-a-1) =====
    // Para coordinadores: SOLO escuchar updates de CoordinatorConversation (fuente única)
    if (user.es_coordinador) {
      const unsubCoordConv = base44.entities.CoordinatorConversation.subscribe((event) => {
        if (event.type === 'update' && event.data) {
          const eventKey = `coord_staff_${event.data.id}_${event.data.updated_date}`;
          if (processedEvents.has(eventKey)) return;
          processedEvents.add(eventKey);

          const oldCount = event.old_data?.no_leidos_coordinador || 0;
          const newCount = event.data.no_leidos_coordinador || 0;
          
          console.log('📬 [ChatNotificationSync] CoordinatorConv update (COORDINADOR):', {
            conversationId: event.data.id,
            oldCount,
            newCount,
            delta: newCount - oldCount
          });

          if (newCount > oldCount) {
            const delta = newCount - oldCount;
            for (let i = 0; i < delta; i++) {
              UnifiedChatNotificationStore.increment(user.email, 'coordinator');
            }
            console.log(`✅ [ChatNotificationSync] coordinator incrementado x${delta}`);
          }
        }
      });
      unsubscribers.push(unsubCoordConv);
    }

    // Para familias: mensajes DEL coordinador - escuchar updates de CoordinatorConversation
    if (!user.es_entrenador && !user.es_coordinador && user.role !== 'admin') {
      const unsubCoordForFamily = base44.entities.CoordinatorConversation.subscribe((event) => {
        if (event.type === 'update' && event.data?.padre_email === user.email) {
          const eventKey = `coord_family_${event.data.id}_${event.data.updated_date}`;
          if (processedEvents.has(eventKey)) return;
          processedEvents.add(eventKey);

          const oldCount = event.old_data?.no_leidos_padre || 0;
          const newCount = event.data.no_leidos_padre || 0;
          
          console.log('📬 [ChatNotificationSync] CoordinatorConv update (FAMILIA):', {
            conversationId: event.data.id,
            oldCount,
            newCount,
            delta: newCount - oldCount
          });

          if (newCount > oldCount) {
            const delta = newCount - oldCount;
            for (let i = 0; i < delta; i++) {
              UnifiedChatNotificationStore.increment(user.email, 'coordinatorForFamily');
            }
            console.log(`✅ [ChatNotificationSync] coordinatorForFamily incrementado x${delta}`);
          }
        }
      });
      unsubscribers.push(unsubCoordForFamily);
    }

    // ===== 3. ENTRENADOR - FAMILIAS (grupo ChatMessage) =====
    // CRÍTICO: Necesitamos cargar jugadores del usuario para validar categorías
    let userPlayers = [];
    (async () => {
      if (!user.es_entrenador && !user.es_coordinador && user.role !== 'admin') {
        try {
          userPlayers = await base44.entities.Player.filter({
            $or: [
              { email_padre: user.email },
              { email_tutor_2: user.email },
              { email_jugador: user.email }
            ],
            activo: true
          });
          console.log('✅ [ChatNotificationSync] Jugadores cargados:', userPlayers.length);
        } catch (e) {
          console.error('[ChatNotificationSync] Error cargando jugadores:', e);
        }
      }
    })();

    // Escuchar ChatMessage para todos los roles relevantes (entrenador, coordinador, admin)
    const unsubChatMsg = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        const msg = event.data;
        const eventKey = `chatmsg_${msg.id}`;
        if (processedEvents.has(eventKey)) return;
        processedEvents.add(eventKey);
        
        // Para staff (entrenadores, coordinadores, admin): mensajes de padres en categorías
        if ((user.es_entrenador || user.es_coordinador || user.role === 'admin') && msg.tipo === 'padre_a_grupo') {
          const coachCats = ((user.categorias_entrena || user.categorias_coordina || [])).map(c => ({
            raw: c,
            id: (c || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(.*?\)/g,'').trim().replace(/\s+/g,'_')
          }));
          const msgId = (msg.grupo_id || '').toString();
          const msgNorm = (msg.deporte || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(.*?\)/g,'').trim();
          const isMyCategory = coachCats.some(c => c.id === msgId || c.raw === msg.deporte || msgNorm.startsWith(c.raw?.toLowerCase()) );
          
          if (isMyCategory && msg.remitente_email !== user.email) {
            console.log('✅ [ChatNotificationSync] Incrementando coach para', user.email);
            UnifiedChatNotificationStore.increment(user.email, 'coach');
          }
        }
        
        // Para familias: mensajes del entrenador O de otros padres SOLO en MIS categorías
        if (!user.es_entrenador && !user.es_coordinador && user.role !== 'admin') {
          if (msg.tipo === 'entrenador_a_grupo' || msg.tipo === 'padre_a_grupo') {
            if (msg.remitente_email !== user.email) {
              // VALIDAR que el mensaje sea de UNA categoría donde tengo jugadores
              const myCategories = userPlayers.map(p => p.categoria_principal || p.deporte).filter(Boolean);
              const normalizeCategory = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(.*?\)/g,'').trim();
              const msgCategory = normalizeCategory(msg.deporte || '');
              const isMyCategory = myCategories.some(cat => {
                const catNorm = normalizeCategory(cat);
                return msgCategory === catNorm || msgCategory.startsWith(catNorm) || catNorm.startsWith(msgCategory);
              });

              if (isMyCategory) {
                console.log('✅ [ChatNotificationSync] Incrementando coachForFamily para', user.email, 'categoría:', msg.deporte);
                UnifiedChatNotificationStore.increment(user.email, 'coachForFamily');
              } else {
                console.log('⚠️ [ChatNotificationSync] Mensaje ignorado - no es mi categoría:', msg.deporte);
              }
            }
          }
        }
      }
    });
    unsubscribers.push(unsubChatMsg);

    // ===== 3B. ENTRENADOR - FAMILIAS (CoachConversation 1-a-1) - CORRECCIÓN #1 =====
    // Para entrenadores: escuchar cambios en no_leidos_entrenador
    if (user.es_entrenador) {
      const unsubCoachConv = base44.entities.CoachConversation.subscribe((event) => {
        if (event.type === 'update' && event.data) {
          if (event.data.entrenador_email === user.email) {
            const eventKey = `coach_conv_${event.data.id}_${event.data.updated_date}`;
            if (processedEvents.has(eventKey)) return;
            processedEvents.add(eventKey);

            const oldCount = event.old_data?.no_leidos_entrenador || 0;
            const newCount = event.data.no_leidos_entrenador || 0;
            
            console.log('📬 [ChatNotificationSync] CoachConv update (ENTRENADOR):', {
              conversationId: event.data.id,
              oldCount,
              newCount,
              delta: newCount - oldCount
            });

            if (newCount > oldCount) {
              const delta = newCount - oldCount;
              for (let i = 0; i < delta; i++) {
                UnifiedChatNotificationStore.increment(user.email, 'coach');
              }
              console.log(`✅ [ChatNotificationSync] coach incrementado x${delta}`);
            }
          }
        }
      });
      unsubscribers.push(unsubCoachConv);
    }

    // ===== 4. MENSAJES PRIVADOS DEL CLUB - DIRECTO Y CONFIABLE =====
    // Solo escuchar updates de PrivateConversation.no_leidos_familia (FUENTE ÚNICA DE VERDAD)
    const unsubPrivateConv = base44.entities.PrivateConversation.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        if (event.data.participante_familia_email === user.email) {
          const eventKey = `private_${event.data.id}_${event.data.updated_date}`;
          if (processedEvents.has(eventKey)) {
            console.log(`⚠️ [ChatNotificationSync] Evento duplicado ignorado: ${eventKey}`);
            return;
          }
          processedEvents.add(eventKey);

          const oldCount = event.old_data?.no_leidos_familia || 0;
          const newCount = event.data.no_leidos_familia || 0;

          console.log(`📬 [ChatNotificationSync] PrivateConversation update para ${user.email}:`, {
            conversationId: event.data.id,
            eventKey,
            oldCount,
            newCount,
            delta: newCount - oldCount
          });

          if (newCount > oldCount) {
            const delta = newCount - oldCount;
            for (let i = 0; i < delta; i++) {
              UnifiedChatNotificationStore.increment(user.email, 'systemMessages');
            }
            console.log(`✅ [ChatNotificationSync] systemMessages incrementado x${delta}`);
          }
        }
      }
    });
    unsubscribers.push(unsubPrivateConv);

    // Nota: eliminamos el fallback de PrivateMessage para evitar doble conteo.
    // Nos apoyamos exclusivamente en PrivateConversation.update (fuente de verdad).

    return () => {
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (e) {}
      });
      if (typeof window !== 'undefined') {
        window.__B44_CHAT_SYNC_ACTIVE = false;
      }
    };
  }, [user?.email, user?.es_coordinador, user?.es_entrenador, user?.role]);

  return null; // No renderiza nada - solo sincroniza
}