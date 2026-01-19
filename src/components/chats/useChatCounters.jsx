import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useChatCounters(chatType, { refetchOnFocus = true } = {}) {
  const [data, setData] = useState({ total: 0, byConversation: [] });

  const load = useCallback(async () => {
    const res = await base44.functions.invoke('chatGetCounters', {});
    const payload = res?.data || {};
    const slice = payload?.[chatType] || { total: 0, byConversation: [] };
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