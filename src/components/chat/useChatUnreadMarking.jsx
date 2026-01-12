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

    markedRef.current = true;

    const markAsRead = async () => {
      try {
        const noLeidosField = getUnreadField(entityName, userRole);
        
        if (!noLeidosField) return;

        // Actualizar el contador de la conversación
        await base44.entities[entityName].update(conversationId, {
          [noLeidosField]: 0,
        });

        // Invalida queries para que se refresquen
        queryClient?.invalidateQueries({ 
          queryKey: [entityName.toLowerCase(), 'list'] 
        });
        
        if (entityName === 'CoordinatorConversation') {
          queryClient?.invalidateQueries({ 
            queryKey: ['coordinatorMessages'] 
          });
        }
      } catch (error) {
        console.log(`Error marking as read in ${entityName}:`, error);
        markedRef.current = false;
      }
    };

    markAsRead();
  }, [conversationId, userEmail, entityName, userRole]);
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