import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Normalization helpers to align keys
const normalize = (s = "") =>
  s.toString()
    .replace(/\(.*?\)/g, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const toGroupId = (s = "") => normalize(s).replace(/\s+/g, "_");

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


  // Map chat types to canonical keys used internally
  const normalizeType = (t) => {
    if (!t) return t;
    if (t === 'team' || t === 'staff' || t === 'system' || t === 'coordinator' || t === 'admin') return t;
    if (String(t).startsWith('coordinator')) return 'coordinator';
    if (String(t).startsWith('admin')) return 'admin';
    return t;
  };

  // Keep user email in ref for realtime handlers
  useEffect(() => { userEmailRef.current = user?.email; }, [user?.email]);

  const refetchPendingRef = useRef(false);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    if (fetchingRef.current) { refetchPendingRef.current = true; return; }
    fetchingRef.current = true;
    try {
      const { data } = await base44.functions.invoke('chatGetUnreadCounts', {});
      if (mountedRef.current && data && !data.error) {
        const normalized = { ...data, team_chats: {} };
        for (const k of Object.keys(data.team_chats || {})) {
          const nk = toGroupId(k);
          normalized.team_chats[nk] = (normalized.team_chats[nk] || 0) + (data.team_chats[k] || 0);
        }
        setCounts(normalized);
      }
    } catch (e) {
      console.error('[useChatUnreadCounts] fetch error:', e);
    } finally {
      fetchingRef.current = false;
      if (refetchPendingRef.current) {
        refetchPendingRef.current = false;
        fetchCounts();
      }
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

    const subscribe = (entity) => {
      try {
        const unsub = base44.entities[entity].subscribe(() => {
          fetchCounts(); // Server truth only
        });
        unsubs.push(unsub);
      } catch {}
    };

    ['ChatMessage','CoordinatorMessage','StaffMessage','PrivateMessage','AdminMessage','CoordinatorConversation','AdminConversation','PrivateConversation','StaffConversation'].forEach(subscribe);

    return () => {
      unsubs.forEach(fn => { try { fn(); } catch {} });
    };
  }, [user?.email, fetchCounts]);

  // Limpieza inmediata visual SOLO del chat abierto y sincronización posterior
  const markRead = useCallback(async (chatType, chatId) => {
    const type = normalizeType(chatType);

    // 1) Limpieza local inmediata (sin suppress/debounce/otros optimismos)
    setCounts(prev => {
      const next = { ...prev };
      if (type === 'team' && chatId) {
        const gid = toGroupId(chatId);
        const curr = (next.team_chats?.[gid] || 0);
        if (curr > 0) {
          next.total = Math.max(0, (next.total || 0) - curr);
          next.team_chats = { ...(next.team_chats || {}), [gid]: 0 };
        }
      } else if (type === 'coordinator') {
        if (next.coordinator > 0) {
          next.total = Math.max(0, (next.total || 0) - next.coordinator);
          next.coordinator = 0;
        }
      } else if (type === 'admin') {
        if (next.admin > 0) {
          next.total = Math.max(0, (next.total || 0) - next.admin);
          next.admin = 0;
        }
      } else if (type === 'staff') {
        if (next.staff > 0) {
          next.total = Math.max(0, (next.total || 0) - next.staff);
          next.staff = 0;
        }
      } else if (type === 'system') {
        if (next.system > 0) {
          next.total = Math.max(0, (next.total || 0) - next.system);
          next.system = 0;
        }
      }
      return next;
    });

    // 2) Persistir en backend y 3) Sincronizar con server truth
    try {
      await base44.functions.invoke('chatMarkRead', { chatType, chatId });
    } catch (e) {
      console.error('[useChatUnreadCounts] markRead error:', e);
    } finally {
      await fetchCounts();
    }
  }, [fetchCounts]);

  // Allow clearing the active chat (e.g. when navigating away)
  const clearActiveChat = useCallback(() => {}, []);

  return { counts, refresh: fetchCounts, markRead, clearActiveChat };
}