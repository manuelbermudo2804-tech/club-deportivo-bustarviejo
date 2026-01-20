import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useChatCounters(chatType, { refetchOnFocus = true } = {}) {
  const [data, setData] = useState({ total: 0, byConversation: [] });

  const load = useCallback(async () => {
    const res = await base44.functions.invoke('chatGetCounters', {});
    const payload = res?.data || {};
    let slice = payload?.[chatType] || { total: 0, byConversation: [] };
    // Fallback: si hay estado global unificado, úsalo para STAFF
    try {
      if (typeof window !== 'undefined' && chatType === 'staff') {
        const unified = window.__BASE44_UNIFIED_NOTIFICATIONS_STATE;
        if (unified && typeof unified.unreadStaffMessages === 'number') {
          slice = { ...slice, total: unified.unreadStaffMessages };
        }
      }
    } catch {}
    setData(slice);
  }, [chatType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!refetchOnFocus) return;
    const onFocus = () => { load(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load, refetchOnFocus]);

  useEffect(() => {
    // Suscripción directa a ChatCounter (solo este tipo)
    const unsub = base44.entities.ChatCounter.subscribe((evt) => {
      if (evt?.data?.chat_type === chatType) {
        load();
      }
    });
    return unsub;
  }, [chatType, load]);

  // StaffMessage directo: dispara recálculo inmediato de la burbuja (con throttle ligero)
  useEffect(() => {
    if (chatType !== 'staff') return;
    let last = 0;
    const unsub = base44.entities.StaffMessage.subscribe(() => {
      const now = Date.now();
      if (now - last < 500) return;
      last = now;
      load();
    });
    return unsub;
  }, [chatType, load]);

  // Mensajes directos para otros tipos (coach/coordinator/family/private/admin)
  useEffect(() => {
    let last = 0;
    const subs = [];
    const subscribe = (entity) => {
      if (!entity || !entity.subscribe) return () => {};
      const un = entity.subscribe(() => {
        const now = Date.now();
        if (now - last < 500) return;
        last = now;
        load();
      });
      subs.push(un);
      return un;
    };

    if (chatType === 'coach') {
      subscribe(base44.entities.CoachMessage);
      subscribe(base44.entities.ChatMessage);
    } else if (chatType === 'coordinator') {
      subscribe(base44.entities.CoordinatorMessage);
      subscribe(base44.entities.ChatMessage);
    } else if (chatType === 'family') {
      // Familias reciben de ChatMessage (entrenador/coordinador a grupo)
      subscribe(base44.entities.ChatMessage);
    } else if (chatType === 'private') {
      subscribe(base44.entities.PrivateMessage);
    } else if (chatType === 'admin') {
      subscribe(base44.entities.AdminMessage);
    }

    return () => subs.forEach((u) => { try { u && u(); } catch {} });
  }, [chatType, load]);

  // Escucha el bus global unificado para STAFF y actualiza la burbuja al instante (evita relistar y rate limit)
  useEffect(() => {
    if (chatType !== 'staff') return;
    const handler = (e) => {
      try {
        const detail = e?.detail;
        if (!detail || typeof detail.unreadStaffMessages !== 'number') return;
        setData((prev) => ({ ...prev, total: detail.unreadStaffMessages }));
      } catch {}
    };
    // Sincronización inicial desde estado global si existe
    try {
      if (typeof window !== 'undefined' && window.__BASE44_UNIFIED_NOTIFICATIONS_STATE) {
        const s = window.__BASE44_UNIFIED_NOTIFICATIONS_STATE;
        if (typeof s.unreadStaffMessages === 'number') {
          setData((prev) => ({ ...prev, total: s.unreadStaffMessages }));
        }
      }
    } catch {}
    window.addEventListener('b44_unified_notifications_updated', handler);
    return () => window.removeEventListener('b44_unified_notifications_updated', handler);
  }, [chatType]);

  const markRead = useCallback(async (conversationId) => {
    await base44.functions.invoke('chatMarkRead', { chatType, conversationId });
    await load();
  }, [chatType, load]);

  return { total: data.total, byConversation: data.byConversation, markRead, reload: load };
}

export const useStaffCounters = (opts) => useChatCounters('staff', opts);
export const useCoachCounters = (opts) => useChatCounters('coach', opts);
export const useCoordinatorCounters = (opts) => useChatCounters('coordinator', opts);
export const useFamilyCounters = (opts) => useChatCounters('family', opts);
export const usePrivateCounters = (opts) => useChatCounters('private', opts);
export const useAdminCounters = (opts) => useChatCounters('admin', opts);