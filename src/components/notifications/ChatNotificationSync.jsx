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
    if (user.es_coordinador || user.role === 'admin') {
      const unsubCoordMsg = base44.entities.CoordinatorMessage.subscribe((event) => {
        if (event.type === 'create' && event.data?.autor === 'padre') {
          UnifiedChatNotificationStore.increment(user.email, 'coordinator');
        }
      });
      unsubscribers.push(unsubCoordMsg);

      // Backup: escuchar updates de CoordinatorConversation.no_leidos_coordinador (más confiable)
      const unsubCoordConv = base44.entities.CoordinatorConversation.subscribe((event) => {
        if (event.type === 'update' && event.data) {
          const oldCount = event.old_data?.no_leidos_coordinador || 0;
          const newCount = event.data.no_leidos_coordinador || 0;
          if (newCount > oldCount) {
            const delta = newCount - oldCount;
            for (let i = 0; i < delta; i++) {
              UnifiedChatNotificationStore.increment(user.email, 'coordinator');
            }
          }
        }
      });
      unsubscribers.push(unsubCoordConv);
    }

    // Para familias: mensajes DEL coordinador - escuchar updates de CoordinatorConversation
    if (!user.es_entrenador && !user.es_coordinador && user.role !== 'admin') {
      const unsubCoordForFamily = base44.entities.CoordinatorConversation.subscribe((event) => {
        if (event.type === 'update' && event.data?.padre_email === user.email) {
          const oldCount = event.old_data?.no_leidos_familia || 0;
          const newCount = event.data.no_leidos_familia || 0;
          if (newCount > oldCount) {
            const delta = newCount - oldCount;
            for (let i = 0; i < delta; i++) {
              UnifiedChatNotificationStore.increment(user.email, 'coordinatorForFamily');
            }
          }
        }
      });
      unsubscribers.push(unsubCoordForFamily);
    }

    // ===== 3. ENTRENADOR - FAMILIAS (grupo ChatMessage) =====
    // Escuchar ChatMessage para todos los roles relevantes (entrenador, coordinador, admin)
    const unsubChatMsg = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        const msg = event.data;
        
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
            UnifiedChatNotificationStore.increment(user.email, 'coach');
          }
        }
        
        // Para familias: mensajes del entrenador O de otros padres en MIS categorías
        if (!user.es_entrenador && !user.es_coordinador && user.role !== 'admin') {
          if (msg.tipo === 'entrenador_a_grupo' || msg.tipo === 'padre_a_grupo') {
            // IMPORTANTE: no hacer query por cada mensaje - validar contra cache local
            if (msg.remitente_email !== user.email) {
              UnifiedChatNotificationStore.increment(user.email, 'coachForFamily');
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
            const oldCount = event.old_data?.no_leidos_entrenador || 0;
            const newCount = event.data.no_leidos_entrenador || 0;
            if (newCount > oldCount) {
              const delta = newCount - oldCount;
              for (let i = 0; i < delta; i++) {
                UnifiedChatNotificationStore.increment(user.email, 'coach');
              }
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
          const oldCount = event.old_data?.no_leidos_familia || 0;
          const newCount = event.data.no_leidos_familia || 0;

          console.log(`📬 [ChatNotificationSync] PrivateConversation update para ${user.email}:`, {
            oldCount,
            newCount,
            delta: newCount - oldCount
          });

          if (newCount > oldCount) {
            const delta = newCount - oldCount;
            // Incrementar por CADA nuevo mensaje no leído
            for (let i = 0; i < delta; i++) {
              UnifiedChatNotificationStore.increment(user.email, 'systemMessages');
            }
            console.log(`✅ [ChatNotificationSync] systemMessages incrementado x${delta}`);
          }
        }
      }
    });
    unsubscribers.push(unsubPrivateConv);

    // FALLBACK INSTANTÁNEO: si llega un PrivateMessage del club, incrementa sin esperar al update de la conversación
    const unsubPrivateMsg = base44.entities.PrivateMessage.subscribe((event) => {
      if (event.type === 'create' && event.data?.remitente_tipo === 'staff') {
        const convId = event.data.conversacion_id;
        if (convId) {
          base44.entities.PrivateConversation.filter({ id: convId }).then((res) => {
            const conv = res?.[0];
            if (conv?.participante_familia_email === user.email) {
              UnifiedChatNotificationStore.increment(user.email, 'systemMessages');
            }
          }).catch(() => {});
        }
      }
    });
    unsubscribers.push(unsubPrivateMsg);

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