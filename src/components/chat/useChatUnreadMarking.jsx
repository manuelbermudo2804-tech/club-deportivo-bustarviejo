import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook UNIVERSAL para marcar mensajes como leídos en cualquier tipo de chat
 * Soporta: CoordinatorConversation, AdminConversation, PrivateConversation, ChatMessage
 */
export function useChatUnreadMarking({
  conversationId,
  entityName, // "CoordinatorConversation" | "AdminConversation" | "PrivateConversation"
  userRole, // "coordinador" | "padre" | "admin" | "staff" | "coach"
  userEmail,
  messages = [],
  queryClient,
}) {
  const markedRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !userEmail || markedRef.current) return;

    const isNearBottom = () => {
      try {
        const dist = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
        return dist < 200; // solo si los últimos mensajes están realmente en pantalla
      } catch {
        return false;
      }
    };

    const markIfVisible = async () => {
      if (markedRef.current) return;
      if (document.visibilityState !== 'visible') return;
      if (!Array.isArray(messages) || messages.length === 0) return;

      const last = messages[messages.length - 1];
      const lastFromOther = last?.remitente_email && last.remitente_email !== userEmail;
      if (!lastFromOther) return;
      if (!isNearBottom()) return; // no marcar si el usuario no está viendo el final del chat

      try {
        const noLeidosField = getUnreadField(entityName, userRole);
        if (!noLeidosField) return;

        markedRef.current = true;
        await base44.entities[entityName].update(conversationId, { [noLeidosField]: 0 });

        // Refrescar listas relacionadas
        queryClient?.invalidateQueries({ queryKey: [entityName.toLowerCase(), 'list'] });
        if (entityName === 'CoordinatorConversation') {
          queryClient?.invalidateQueries({ queryKey: ['coordinatorMessages'] });
        }
      } catch (error) {
        console.log(`Error marking as read in ${entityName}:`, error);
        markedRef.current = false;
      }
    };

    const onScroll = () => { markIfVisible(); };
    const onVis = () => { markIfVisible(); };

    // Intento inmediato al abrir el chat
    const t = setTimeout(markIfVisible, 100);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [conversationId, userEmail, entityName, userRole, messages]);
}

/**
 * Obtiene el nombre del campo no_leidos según el tipo de entidad y rol
 */
export function getUnreadField(entityName, userRole) {
  const fieldMap = {
    CoordinatorConversation: {
      coordinador: 'no_leidos_coordinador',
      padre: 'no_leidos_padre',
    },
    AdminConversation: {
      admin: 'no_leidos_admin',
      padre: 'no_leidos_padre',
    },
    PrivateConversation: {
      staff: 'no_leidos_staff',
      coach: 'no_leidos_staff',
      familia: 'no_leidos_familia',
      padre: 'no_leidos_familia',
    },
  };

  return fieldMap[entityName]?.[userRole] || null;
}

/**
 * Incrementa el contador no_leidos cuando alguien envía un mensaje
 */
export async function incrementUnreadCount(
  conversationId,
  entityName,
  userRole, // rol de quien ENVÍA el mensaje
  currentCount = 0
) {
  const recipientRole = getRecipientRole(userRole);
  const noLeidosField = getUnreadField(entityName, recipientRole);

  if (!noLeidosField || !conversationId) return;

  try {
    await base44.entities[entityName].update(conversationId, {
      [noLeidosField]: (currentCount || 0) + 1,
    });
  } catch (error) {
    console.log(`Error incrementing unread in ${entityName}:`, error);
  }
}

/**
 * Obtiene el rol del destinatario basado en el remitente
 */
function getRecipientRole(senderRole) {
  const roleMap = {
    coordinador: 'padre',
    padre: 'coordinador',
    admin: 'padre',
    staff: 'familia',
    coach: 'familia',
    familia: 'staff',
  };
  return roleMap[senderRole] || 'padre';
}