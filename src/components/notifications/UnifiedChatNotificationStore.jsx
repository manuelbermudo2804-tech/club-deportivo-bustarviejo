/**
 * SISTEMA UNIFICADO DE NOTIFICACIONES DE CHATS
 * 
 * Principios:
 * - Una única fuente de verdad por usuario
 * - Burbujas y menú lateral usan EXACTAMENTE el mismo estado
 * - Entrar en un chat SOLO borra notificaciones de ese chat
 * - Se marcan como leídos SOLO cuando el chat está abierto
 */

// Estado global compartido - FUENTE ÚNICA DE VERDAD
let GLOBAL_CHAT_STATE = {};

export const UnifiedChatNotificationStore = {
  /**
   * Inicializar contadores para un usuario
   * Cada tipo de chat tiene su propio contador INDEPENDIENTE
   */
  initUser(userEmail) {
    if (!GLOBAL_CHAT_STATE[userEmail]) {
      GLOBAL_CHAT_STATE[userEmail] = {
        staff: 0,
        coordinator: 0,        // Para coordinadores: mensajes de familias
        coach: 0,              // Para entrenadores: mensajes de familias
        coordinatorForFamily: 0, // Para familias: mensajes del coordinador
        coachForFamily: 0,      // Para familias: mensajes del entrenador (grupo)
        systemMessages: 0,      // Para familias: mensajes privados del club
        admin: 0,              // Para familias: mensajes del admin
      };
    }
  },

  /**
   * Actualizar contador de un tipo de chat ESPECÍFICO
   * Importante: solo afecta a ese tipo, no a los demás
   */
  updateCount(userEmail, chatType, count) {
    this.initUser(userEmail);
    GLOBAL_CHAT_STATE[userEmail][chatType] = Math.max(0, count);
    this.broadcastUpdate(userEmail);
  },

  /**
   * Incrementar contador (nuevo mensaje)
   */
  increment(userEmail, chatType) {
    this.initUser(userEmail);
    GLOBAL_CHAT_STATE[userEmail][chatType]++;
    this.broadcastUpdate(userEmail);
  },

  /**
   * Decrementar contador
   */
  decrement(userEmail, chatType, amount = 1) {
    this.initUser(userEmail);
    GLOBAL_CHAT_STATE[userEmail][chatType] = Math.max(0, GLOBAL_CHAT_STATE[userEmail][chatType] - amount);
    this.broadcastUpdate(userEmail);
  },

  /**
   * CRITICÓ: Limpiar SOLO el contador de UN chat
   * Nunca limpiar todos, nunca afectar a otros chats
   */
  clearChatOnly(userEmail, chatType) {
    this.initUser(userEmail);
    GLOBAL_CHAT_STATE[userEmail][chatType] = 0;
    this.broadcastUpdate(userEmail);
  },

  /**
   * Obtener todos los contadores del usuario
   */
  getAll(userEmail) {
    this.initUser(userEmail);
    return { ...GLOBAL_CHAT_STATE[userEmail] };
  },

  /**
   * Obtener contador de un tipo específico
   */
  getCount(userEmail, chatType) {
    this.initUser(userEmail);
    return GLOBAL_CHAT_STATE[userEmail][chatType] || 0;
  },

  /**
   * Obtener TOTAL de notificaciones (para burbujas)
   * No es una suma - es el máximo de cualquier chat con notificaciones
   */
  getHasAnyUnread(userEmail) {
    const state = this.getAll(userEmail);
    return Object.values(state).some(count => count > 0);
  },

  /**
   * Broadcast - notificar a todos los listeners
   * Los listeners son: burbujas, menú lateral, NotificationCenter
   */
  broadcastUpdate(userEmail) {
    if (typeof window !== 'undefined') {
      const state = this.getAll(userEmail);
      window.__BASE44_CHAT_NOTIFICATIONS = state;

      console.log(`📢 [UnifiedChatNotificationStore] Broadcasting para ${userEmail}:`, state);

      const event = new CustomEvent('chat_notifications_updated', {
        detail: { userEmail, state }
      });
      window.dispatchEvent(event);
    }
  },

  /**
   * Suscribirse a cambios
   */
  subscribe(userEmail, callback) {
    const handler = (e) => {
      if (e.detail?.userEmail === userEmail) {
        callback(e.detail.state);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('chat_notifications_updated', handler);
      // CRÍTICO: Enviar estado inicial INMEDIATAMENTE
      const initialState = this.getAll(userEmail);
      console.log(`📡 [UnifiedChatNotificationStore] Subscriber inicial para ${userEmail}:`, initialState);
      callback(initialState);

      // Retornar unsubscribe
      return () => {
        window.removeEventListener('chat_notifications_updated', handler);
      };
    }
    return () => {};
  },

  /**
   * RESET COMPLETO (solo para testing/logout)
   */
  reset() {
    GLOBAL_CHAT_STATE = {};
  }
};