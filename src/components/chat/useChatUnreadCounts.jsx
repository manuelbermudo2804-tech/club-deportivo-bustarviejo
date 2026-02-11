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
  const userEmailRef = useRef(null);
  // Track which chat the user is currently viewing so we suppress fetch overwrite
  const activeChatRef = useRef(null); // e.g. { type: 'team', id: 'futbol_alevin' }
  const suppressFetchUntilRef = useRef(0); // timestamp until which fetch results are ignored for active chat

  // Keep user email in ref for realtime handlers
  useEffect(() => { userEmailRef.current = user?.email; }, [user?.email]);

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

  // Subscribe to real-time events on message entities
  // Optimistic +1 for new messages from other users, then confirm with backend
  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    let debounceTimer = null;

    const debouncedFetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchCounts(), 300);
    };

    // Determine chat type from entity event and optimistically increment
    const makeHandler = (entityType) => (event) => {
      if (event.type !== 'create') {
        // For updates/deletes just re-fetch
        debouncedFetch();
        return;
      }

      // Optimistic +1: only if the message is NOT from the current user
      const d = event.data;
      const myEmail = userEmailRef.current;
      let isFromMe = false;

      if (entityType === 'ChatMessage') {
        isFromMe = d?.remitente_email === myEmail;
        if (!isFromMe && d?.grupo_id) {
          setCounts(prev => {
            const newTeam = { ...prev.team_chats };
            const cat = d.deporte || d.grupo_id;
            newTeam[cat] = (newTeam[cat] || 0) + 1;
            return { ...prev, team_chats: newTeam, total: (prev.total || 0) + 1 };
          });
        }
      } else if (entityType === 'CoordinatorMessage') {
        isFromMe = d?.autor_email === myEmail;
        if (!isFromMe) {
          setCounts(prev => ({ ...prev, coordinator: (prev.coordinator || 0) + 1, total: (prev.total || 0) + 1 }));
        }
      } else if (entityType === 'AdminMessage') {
        isFromMe = d?.autor_email === myEmail;
        if (!isFromMe) {
          setCounts(prev => ({ ...prev, admin: (prev.admin || 0) + 1, total: (prev.total || 0) + 1 }));
        }
      } else if (entityType === 'StaffMessage') {
        isFromMe = d?.autor_email === myEmail;
        if (!isFromMe) {
          setCounts(prev => ({ ...prev, staff: (prev.staff || 0) + 1, total: (prev.total || 0) + 1 }));
        }
      } else if (entityType === 'PrivateMessage') {
        isFromMe = d?.remitente_email === myEmail;
        if (!isFromMe) {
          setCounts(prev => ({ ...prev, system: (prev.system || 0) + 1, total: (prev.total || 0) + 1 }));
        }
      }

      // Confirm with backend (corrects any optimistic drift)
      debouncedFetch();
    };

    try { unsubs.push(base44.entities.ChatMessage.subscribe(makeHandler('ChatMessage'))); } catch {}
    try { unsubs.push(base44.entities.CoordinatorMessage.subscribe(makeHandler('CoordinatorMessage'))); } catch {}
    try { unsubs.push(base44.entities.StaffMessage.subscribe(makeHandler('StaffMessage'))); } catch {}
    try { unsubs.push(base44.entities.PrivateMessage.subscribe(makeHandler('PrivateMessage'))); } catch {}
    try { unsubs.push(base44.entities.AdminMessage.subscribe(makeHandler('AdminMessage'))); } catch {}

    return () => {
      clearTimeout(debounceTimer);
      unsubs.forEach(fn => { try { fn(); } catch {} });
    };
  }, [user?.email, fetchCounts]);

  // Optimistic markRead: set counter to 0 immediately, then confirm with backend
  const markRead = useCallback(async (chatType, chatId) => {
    // Optimistic: zero out the relevant counter immediately
    setCounts(prev => {
      const next = { ...prev };
      if (chatType === 'team' && chatId) {
        const newTeam = { ...prev.team_chats };
        const oldVal = newTeam[chatId] || 0;
        newTeam[chatId] = 0;
        next.team_chats = newTeam;
        next.total = Math.max(0, (prev.total || 0) - oldVal);
      } else if (chatType === 'coordinator') {
        next.total = Math.max(0, (prev.total || 0) - (prev.coordinator || 0));
        next.coordinator = 0;
      } else if (chatType === 'admin') {
        next.total = Math.max(0, (prev.total || 0) - (prev.admin || 0));
        next.admin = 0;
      } else if (chatType === 'staff') {
        next.total = Math.max(0, (prev.total || 0) - (prev.staff || 0));
        next.staff = 0;
      } else if (chatType === 'system') {
        next.total = Math.max(0, (prev.total || 0) - (prev.system || 0));
        next.system = 0;
      }
      return next;
    });

    // Confirm with backend
    try {
      await base44.functions.invoke('chatMarkRead', { chatType, chatId });
      fetchCounts();
    } catch (e) {
      console.error('[useChatUnreadCounts] markRead error:', e);
    }
  }, [fetchCounts]);

  return { counts, refresh: fetchCounts, markRead };
}