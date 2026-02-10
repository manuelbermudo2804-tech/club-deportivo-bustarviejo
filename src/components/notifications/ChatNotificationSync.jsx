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

    // Nota: La carga inicial ya se hace en el Layout para ser inmediata

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
    // Para coordinadores: escuchar CREACIÓN de CoordinatorMessage cuando viene de familias
    if (user.es_coordinador) {
      const unsubCoordMsg = base44.entities.CoordinatorMessage.subscribe((event) => {
        if (event.type === 'create' && event.data && event.data.autor === 'padre' && event.data.autor_email !== user.email) {
          const eventKey = `coord_msg_${event.data.id}`;
          if (processedEvents.has(eventKey)) return;
          processedEvents.add(eventKey);

          console.log('📬 [ChatNotificationSync] Nuevo mensaje de FAMILIA al coordinador:', {
            messageId: event.data.id,
            conversationId: event.data.conversacion_id,
            autor: event.data.autor_nombre
          });

          UnifiedChatNotificationStore.increment(user.email, 'coordinator');
          console.log(`✅ [ChatNotificationSync] coordinator incrementado por mensaje nuevo`);
        }
      });
      unsubscribers.push(unsubCoordMsg);
    }

    // Para familias: mensajes DEL coordinador - escuchar CREACIÓN de CoordinatorMessage
    if (!user.es_entrenador && !user.es_coordinador && user.role !== 'admin') {
      const unsubCoordMsgFamily = base44.entities.CoordinatorMessage.subscribe((event) => {
        if (event.type === 'create' && event.data) {
          // Buscar conversación para verificar si es mi familia
          (async () => {
            try {
              const convs = await base44.entities.CoordinatorConversation.filter({ 
                id: event.data.conversacion_id,
                padre_email: user.email 
              });
              
              if (convs.length > 0 && event.data.autor === 'coordinador' && event.data.autor_email !== user.email) {
                const eventKey = `coord_msg_family_${event.data.id}`;
                if (processedEvents.has(eventKey)) return;
                processedEvents.add(eventKey);

                console.log('📬 [ChatNotificationSync] Nuevo mensaje del COORDINADOR a mi familia:', {
                  messageId: event.data.id,
                  conversationId: event.data.conversacion_id
                });

                UnifiedChatNotificationStore.increment(user.email, 'coordinatorForFamily');
                console.log(`✅ [ChatNotificationSync] coordinatorForFamily incrementado`);
              }
            } catch (e) {
              console.error('Error verificando conversación coordinador-familia:', e);
            }
          })();
        }
      });
      unsubscribers.push(unsubCoordMsgFamily);
    }

    // ===== 3. ENTRENADOR - FAMILIAS (grupo ChatMessage) =====
    // CRÍTICO: Cargar jugadores ANTES de suscribirse (evitar race condition)
    let userPlayers = [];
    
    // Cargar jugadores SINCRÓNICAMENTE para familias
    if (!user.es_entrenador && !user.es_coordinador && user.role !== 'admin') {
      (async () => {
        try {
          userPlayers = await base44.entities.Player.filter({
            $or: [
              { email_padre: user.email },
              { email_tutor_2: user.email },
              { email_jugador: user.email }
            ],
            activo: true
          });
          console.log('✅ [ChatNotificationSync] Jugadores cargados ANTES de suscribir:', userPlayers.length);
          
          // Montar subscripción DESPUÉS de cargar jugadores
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
        } catch (e) {
          console.error('[ChatNotificationSync] Error cargando jugadores:', e);
        }
      })();
    } else {
      // Para staff: suscribir inmediatamente (no necesitan jugadores)
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
    }

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

    // ===== 5. ADMIN CHAT - MENSAJES ESCALADOS =====
    if (user.role === 'admin') {
      const unsubAdminMsg = base44.entities.AdminMessage.subscribe((event) => {
        if (event.type === 'create' && event.data && event.data.autor === 'padre' && event.data.autor_email !== user.email) {
          const eventKey = `admin_msg_${event.data.id}`;
          if (processedEvents.has(eventKey)) return;
          processedEvents.add(eventKey);

          console.log('📬 [ChatNotificationSync] Nuevo mensaje de FAMILIA a Admin:', {
            messageId: event.data.id,
            conversationId: event.data.conversacion_id
          });

          UnifiedChatNotificationStore.increment(user.email, 'admin');
        }
      });
      unsubscribers.push(unsubAdminMsg);
    }

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