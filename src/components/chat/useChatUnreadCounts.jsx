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
        // If we recently did an optimistic increment, don't let the backend overwrite it to 0
        // The backend might not yet reflect the new message if user is actively in that chat
        if (suppressFetchUntilRef.current > Date.now()) {
          // Merge: keep local optimistic values that are HIGHER than backend
          setCounts(prev => {
            const merged = { ...data };
            merged.team_chats = { ...data.team_chats };
            // Keep any local team_chat counts that are higher
            for (const key of Object.keys(prev.team_chats || {})) {
              if ((prev.team_chats[key] || 0) > (merged.team_chats[key] || 0)) {
                merged.team_chats[key] = prev.team_chats[key];
              }
            }
            // Keep local counts that are higher for other chat types
            for (const k of ['coordinator', 'admin', 'staff', 'system']) {
              if ((prev[k] || 0) > (merged[k] || 0)) {
                merged[k] = prev[k];
              }
            }
            // Recalculate total
            const teamTotal = Object.values(merged.team_chats).reduce((s, v) => s + v, 0);
            merged.total = teamTotal + merged.coordinator + merged.admin + merged.staff + merged.system;
            return merged;
          });
        } else {
          setCounts(data);
        }
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
      debounceTimer = setTimeout(() => fetchCounts(), 5000);
    };

    // Determine chat type from entity event and optimistically increment
    const makeHandler = (entityType) => (event) => {
      if (event.type !== 'create') {
        // For updates/deletes, only re-fetch if suppress period is over
        // (markRead triggers entity updates which would otherwise cause flicker)
        if (suppressFetchUntilRef.current <= Date.now()) {
          debouncedFetch();
        }
        return;
      }

      // Optimistic +1: only if the message is NOT from the current user
      const d = event.data;
      const myEmail = userEmailRef.current;
      let isFromMe = false;
      // Check if user is currently viewing this chat (skip +1 if so)
      const active = activeChatRef.current;

      if (entityType === 'ChatMessage') {
        isFromMe = d?.remitente_email === myEmail;
        const cat = d?.deporte || d?.grupo_id;
        const gid = d?.grupo_id;
        // Compare using normalized grupo_id since active.id is stored as normalized grupo_id
        const isViewingThis = active?.type === 'team' && (active.id === cat || active.id === gid);
        if (!isFromMe && d?.grupo_id && !isViewingThis) {
          suppressFetchUntilRef.current = Date.now() + 3000;
          setCounts(prev => {
            const newTeam = { ...prev.team_chats };
            newTeam[cat] = (newTeam[cat] || 0) + 1;
            return { ...prev, team_chats: newTeam, total: (prev.total || 0) + 1 };
          });
        }
      } else if (entityType === 'CoordinatorMessage') {
        isFromMe = d?.autor_email === myEmail;
        const isViewingThis = active?.type === 'coordinator';
        if (!isFromMe && !isViewingThis) {
          suppressFetchUntilRef.current = Date.now() + 3000;
          setCounts(prev => ({ ...prev, coordinator: (prev.coordinator || 0) + 1, total: (prev.total || 0) + 1 }));
        }
      } else if (entityType === 'AdminMessage') {
        isFromMe = d?.autor_email === myEmail;
        const isViewingThis = active?.type === 'admin';
        if (!isFromMe && !isViewingThis) {
          suppressFetchUntilRef.current = Date.now() + 3000;
          setCounts(prev => ({ ...prev, admin: (prev.admin || 0) + 1, total: (prev.total || 0) + 1 }));
        }
      } else if (entityType === 'StaffMessage') {
        isFromMe = d?.autor_email === myEmail;
        const isViewingThis = active?.type === 'staff';
        if (!isFromMe && !isViewingThis) {
          suppressFetchUntilRef.current = Date.now() + 3000;
          setCounts(prev => ({ ...prev, staff: (prev.staff || 0) + 1, total: (prev.total || 0) + 1 }));
        }
      } else if (entityType === 'PrivateMessage') {
        isFromMe = d?.remitente_email === myEmail;
        const isViewingThis = active?.type === 'system';
        if (!isFromMe && !isViewingThis) {
          suppressFetchUntilRef.current = Date.now() + 3000;
          setCounts(prev => ({ ...prev, system: (prev.system || 0) + 1, total: (prev.total || 0) + 1 }));
        }
      }

      // Confirm with backend after a delay (corrects any optimistic drift)
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
    // Record which chat user is currently viewing
    activeChatRef.current = { type: chatType, id: chatId };

    // Optimistic: zero out the relevant counter immediately
    setCounts(prev => {
      const next = { ...prev };
      if (chatType === 'team' && chatId) {
        const newTeam = { ...prev.team_chats };
        // Try exact match first, then look for key containing chatId
        let oldVal = 0;
        for (const key of Object.keys(newTeam)) {
          if (key === chatId) { oldVal = newTeam[key] || 0; newTeam[key] = 0; break; }
        }
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

    // Suppress backend overwrite for a generous window
    suppressFetchUntilRef.current = Date.now() + 10000;

    // Confirm with backend
    try {
      await base44.functions.invoke('chatMarkRead', { chatType, chatId });
      // Don't re-fetch immediately; let suppressFetchUntil expire first
    } catch (e) {
      console.error('[useChatUnreadCounts] markRead error:', e);
    }
  }, [fetchCounts]);

  // Allow clearing the active chat (e.g. when navigating away)
  const clearActiveChat = useCallback(() => {
    activeChatRef.current = null;
  }, []);

  return { counts, refresh: fetchCounts, markRead, clearActiveChat };
}