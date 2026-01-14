import { base44 } from '@/api/base44Client';

/**
 * Funciones centralizadas para marcar notificaciones como leídas
 * Con invalidación instantánea de todas las queries relacionadas
 */

// Invalidar TODAS las queries de notificaciones
const invalidateAll = (queryClient) => {
  if (!queryClient) return;
  
  queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
  queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
  queryClient.invalidateQueries({ queryKey: ['adminConversations'] });
  queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
  queryClient.invalidateQueries({ queryKey: ['privateConversations'] });
  queryClient.invalidateQueries({ queryKey: ['convocatorias'] });
  queryClient.invalidateQueries({ queryKey: ['announcements'] });
  queryClient.invalidateQueries({ queryKey: ['appNotifications'] });
  queryClient.invalidateQueries({ queryKey: ['messages'] });
};

/**
 * Marcar mensaje de chat como leído (ChatMessage)
 */
export async function markChatMessageAsRead(messageId, userEmail, userName, queryClient) {
  try {
    const message = await base44.entities.ChatMessage.get(messageId);
    const leidoPor = message.leido_por || [];
    
    if (!leidoPor.some(l => l.email === userEmail)) {
      await base44.entities.ChatMessage.update(messageId, {
        leido_por: [...leidoPor, { 
          email: userEmail, 
          nombre: userName, 
          fecha: new Date().toISOString() 
        }]
      });
    }
    
    invalidateAll(queryClient);
  } catch (error) {
    console.error('Error marking chat message as read:', error);
  }
}

/**
 * Marcar conversación de coordinador como leída
 */
export async function markCoordinatorConversationAsRead(conversationId, userEmail, queryClient) {
  try {
    const conv = await base44.entities.CoordinatorConversation.get(conversationId);
    
    if (conv.participante_familia_email === userEmail) {
      await base44.entities.CoordinatorConversation.update(conversationId, {
        no_leidos_familia: 0,
        ultimo_leido_familia: new Date().toISOString()
      });
    } else if (conv.participante_coordinador_email === userEmail) {
      await base44.entities.CoordinatorConversation.update(conversationId, {
        no_leidos_coordinador: 0,
        ultimo_leido_coordinador: new Date().toISOString()
      });
    }
    
    invalidateAll(queryClient);
  } catch (error) {
    console.error('Error marking coordinator conversation as read:', error);
  }
}

/**
 * Marcar mensajes de admin como leídos en conversación
 */
export async function markAdminMessagesAsRead(conversationId, queryClient) {
  try {
    const conv = await base44.entities.AdminConversation.get(conversationId);
    const mensajes = conv.mensajes || [];
    
    const updated = mensajes.map(msg => {
      if (msg.remitente_tipo === 'admin' && !msg.leido_familia) {
        return { ...msg, leido_familia: true, fecha_lectura_familia: new Date().toISOString() };
      }
      return msg;
    });
    
    await base44.entities.AdminConversation.update(conversationId, {
      mensajes: updated,
      no_leidos_familia: 0
    });
    
    invalidateAll(queryClient);
  } catch (error) {
    console.error('Error marking admin messages as read:', error);
  }
}

/**
 * Marcar mensaje de staff como leído
 */
export async function markStaffMessageAsRead(messageId, userEmail, userName, queryClient) {
  try {
    const message = await base44.entities.StaffMessage.get(messageId);
    const leidoPor = message.leido_por || [];
    
    if (!leidoPor.some(l => l.email === userEmail)) {
      await base44.entities.StaffMessage.update(messageId, {
        leido_por: [...leidoPor, { 
          email: userEmail, 
          nombre: userName, 
          fecha: new Date().toISOString() 
        }]
      });
    }
    
    invalidateAll(queryClient);
  } catch (error) {
    console.error('Error marking staff message as read:', error);
  }
}

/**
 * Marcar conversación privada como leída
 */
export async function markPrivateConversationAsRead(conversationId, userEmail, queryClient) {
  try {
    const conv = await base44.entities.PrivateConversation.get(conversationId);
    
    if (conv.participante_familia_email === userEmail) {
      await base44.entities.PrivateConversation.update(conversationId, {
        no_leidos_familia: 0
      });
    } else if (conv.participante_staff_email === userEmail) {
      await base44.entities.PrivateConversation.update(conversationId, {
        no_leidos_staff: 0
      });
    }
    
    invalidateAll(queryClient);
  } catch (error) {
    console.error('Error marking private conversation as read:', error);
  }
}

/**
 * Marcar anuncio como leído
 */
export async function markAnnouncementAsRead(announcementId, userEmail, userName, queryClient) {
  try {
    const announcement = await base44.entities.Announcement.get(announcementId);
    const leidoPor = announcement.leido_por || [];
    
    if (!leidoPor.some(l => l.email === userEmail)) {
      await base44.entities.Announcement.update(announcementId, {
        leido_por: [...leidoPor, { 
          email: userEmail, 
          nombre: userName, 
          fecha: new Date().toISOString() 
        }]
      });
    }
    
    invalidateAll(queryClient);
  } catch (error) {
    console.error('Error marking announcement as read:', error);
  }
}

/**
 * Marcar TODOS los mensajes de un chat como leídos
 */
export async function markAllChatMessagesAsRead(categoria, userEmail, userName, queryClient) {
  try {
    const messages = await base44.entities.ChatMessage.filter({ grupo_id: categoria });
    
    for (const msg of messages) {
      const leidoPor = msg.leido_por || [];
      if (!leidoPor.some(l => l.email === userEmail)) {
        await base44.entities.ChatMessage.update(msg.id, {
          leido_por: [...leidoPor, { 
            email: userEmail, 
            nombre: userName, 
            fecha: new Date().toISOString() 
          }]
        });
      }
    }
    
    invalidateAll(queryClient);
  } catch (error) {
    console.error('Error marking all chat messages as read:', error);
  }
}