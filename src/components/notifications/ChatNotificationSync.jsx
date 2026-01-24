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

    const unsubscribers = [];

    // ===== 1. STAFF CHAT (interno) =====
    if (user.es_coordinador || user.es_entrenador || user.role === 'admin') {
      const unsubStaff = base44.entities.StaffMessage.subscribe((event) => {
        if (event.type === 'create' && event.data?.autor_email !== user.email) {
          // Verificar si soy destinatario
          const destinatarios = event.data?.staff_destinatarios;
          let autorizado = !destinatarios || destinatarios.length === 0; // sin filtro = todos
          
          if (destinatarios && destinatarios.length > 0) {
            autorizado = (
              (user.es_coordinador && destinatarios.includes('coordinator')) ||
              (user.es_entrenador && destinatarios.includes('coach')) ||
              (user.role === 'admin' && destinatarios.includes('admin'))
            );
          }
          
          if (autorizado) {
            UnifiedChatNotificationStore.increment(user.email, 'staff');
          }
        }
      });
      unsubscribers.push(unsubStaff);
    }

    // ===== 2. COORDINADOR - FAMILIAS (1-a-1) =====
    // Para coordinadores: mensajes DE familias
    if (user.es_coordinador) {
      const unsubCoordMsg = base44.entities.CoordinatorMessage.subscribe((event) => {
        if (event.type === 'create' && event.data?.autor === 'padre') {
          UnifiedChatNotificationStore.increment(user.email, 'coordinator');
        }
      });
      unsubscribers.push(unsubCoordMsg);
    }

    // Para familias: mensajes DEL coordinador
    if (!user.es_entrenador && !user.es_coordinador && user.role !== 'admin') {
      const unsubCoordForFamily = base44.entities.CoordinatorMessage.subscribe((event) => {
        if (event.type === 'create' && event.data?.autor === 'coordinador') {
          // Verificar que el mensaje sea para MÍ
          const unsubCheck = async () => {
            const convs = await base44.entities.CoordinatorConversation.filter({ 
              id: event.data.conversacion_id,
              padre_email: user.email 
            });
            if (convs.length > 0) {
              UnifiedChatNotificationStore.increment(user.email, 'coordinatorForFamily');
            }
          };
          unsubCheck();
        }
      });
      unsubscribers.push(unsubCoordForFamily);
    }

    // ===== 3. ENTRENADOR - FAMILIAS (grupo) =====
    // Usar CoachConversation para mensajes directos
    const unsubCoachConv = base44.entities.CoachConversation.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        // Para entrenadores: incrementar cuando aumenta no_leidos_entrenador
        if (user.es_entrenador && event.data.entrenador_email === user.email) {
          const oldCount = event.old_data?.no_leidos_entrenador || 0;
          const newCount = event.data.no_leidos_entrenador || 0;
          if (newCount > oldCount) {
            UnifiedChatNotificationStore.updateCount(user.email, 'coach', newCount);
          }
        }
        
        // Para familias: incrementar cuando aumenta no_leidos_padre
        if (!user.es_entrenador && event.data.padre_email === user.email) {
          const oldCount = event.old_data?.no_leidos_padre || 0;
          const newCount = event.data.no_leidos_padre || 0;
          if (newCount > oldCount) {
            UnifiedChatNotificationStore.updateCount(user.email, 'coachForFamily', newCount);
          }
        }
      }
    });
    unsubscribers.push(unsubCoachConv);

    // Para mensajes de grupo ChatMessage (padre_a_grupo / entrenador_a_grupo)
    const unsubChatMsg = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        const msg = event.data;
        
        // Para entrenadores: mensajes de padres en SUS categorías
        if (user.es_entrenador && msg.tipo === 'padre_a_grupo') {
          const coachCats = user.categorias_entrena || [];
          const isMyCategory = coachCats.includes(msg.deporte) || coachCats.includes(msg.grupo_id);
          
          if (isMyCategory && msg.remitente_email !== user.email) {
            UnifiedChatNotificationStore.increment(user.email, 'coach');
          }
        }
        
        // Para familias: mensajes del entrenador O de otros padres en MIS categorías
        if (!user.es_entrenador && !user.es_coordinador && user.role !== 'admin') {
          if (msg.tipo === 'entrenador_a_grupo' || msg.tipo === 'padre_a_grupo') {
            // Obtener mis categorías
            const checkMyCategory = async () => {
              const myPlayers = await base44.entities.Player.filter({
                $or: [
                  { email_padre: user.email },
                  { email_tutor_2: user.email },
                  { email_jugador: user.email }
                ]
              });
              
              const myCategories = [...new Set(myPlayers.map(p => p.deporte))];
              const isMyCategory = myCategories.includes(msg.deporte) || myCategories.some(cat => {
                const grupo_id = cat.toLowerCase().replace(/\s+/g, '_');
                return msg.grupo_id === grupo_id;
              });
              
              if (isMyCategory && msg.remitente_email !== user.email) {
                UnifiedChatNotificationStore.increment(user.email, 'coachForFamily');
              }
            };
            checkMyCategory();
          }
        }
      }
    });
    unsubscribers.push(unsubChatMsg);

    // ===== 4. MENSAJES PRIVADOS DEL CLUB (solo lectura) =====
    const unsubPrivate = base44.entities.PrivateConversation.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        // Para familias: mensajes del club
        if (event.data.participante_familia_email === user.email) {
          const oldCount = event.old_data?.no_leidos_familia || 0;
          const newCount = event.data.no_leidos_familia || 0;
          if (newCount > oldCount) {
            UnifiedChatNotificationStore.updateCount(user.email, 'systemMessages', newCount);
          }
        }
      }
    });
    unsubscribers.push(unsubPrivate);

    return () => {
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (e) {}
      });
    };
  }, [user?.email, user?.es_coordinador, user?.es_entrenador, user?.role]);

  return null; // No renderiza nada - solo sincroniza
}