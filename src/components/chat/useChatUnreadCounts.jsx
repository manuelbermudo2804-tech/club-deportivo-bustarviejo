import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook that fetches chat unread counts from backend.
 * Returns { counts, refresh, markRead }
 * 
 * counts = { team_chats: { cat: N }, coordinator: N, admin: N, staff: N, system: N, total: N }
 */
export function useChatUnreadCounts(user) {
  const [counts, setCounts] = useState({
    team_chats: {},
    coordinator: 0,
    admin: 0,
    staff: 0,
    system: 0,
    total: 0
  });
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchCounts = useCallback(async () => {
    if (!user || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data } = await base44.functions.invoke('chatGetUnreadCounts', {});
      if (mountedRef.current && data && !data.error) {
        setCounts(data);
      }
    } catch (e) {
      console.error('[useChatUnreadCounts] fetch error:', e);
    } finally {
      fetchingRef.current = false;
    }
  }, [user?.email]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    if (user) fetchCounts();
    return () => { mountedRef.current = false; };
  }, [user?.email]);

  // Re-fetch on visibility change (user returns to app)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && user) fetchCounts();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [user?.email, fetchCounts]);

  // Subscribe to real-time events on message entities to trigger re-fetch
  useEffect(() => {
    if (!user) return;
    const unsubs = [];

    const handler = () => {
      // Debounce: wait 1s before re-fetching to batch rapid events
      clearTimeout(handler._timer);
      handler._timer = setTimeout(() => fetchCounts(), 1000);
    };

    try { unsubs.push(base44.entities.ChatMessage.subscribe(handler)); } catch {}
    try { unsubs.push(base44.entities.CoordinatorMessage.subscribe(handler)); } catch {}
    try { unsubs.push(base44.entities.StaffMessage.subscribe(handler)); } catch {}
    try { unsubs.push(base44.entities.PrivateMessage.subscribe(handler)); } catch {}
    try { unsubs.push(base44.entities.AdminMessage.subscribe(handler)); } catch {}

    return () => {
      clearTimeout(handler._timer);
      unsubs.forEach(fn => { try { fn(); } catch {} });
    };
  }, [user?.email, fetchCounts]);

  const markRead = useCallback(async (chatType, chatId) => {
    try {
      await base44.functions.invoke('chatMarkRead', { chatType, chatId });
      // Re-fetch counts after marking read
      setTimeout(() => fetchCounts(), 300);
    } catch (e) {
      console.error('[useChatUnreadCounts] markRead error:', e);
    }
  }, [fetchCounts]);

  return { counts, refresh: fetchCounts, markRead };
}