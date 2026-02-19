import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";

const normalize = (s = "") =>
  s.toString()
    .replace(/\(.*?\)/g, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const toGroupId = (s = "") => normalize(s).replace(/\s+/g, "_");

const normalizeType = (t) => {
  if (!t) return t;
  if (["team","staff","system","coordinator","admin"].includes(t)) return t;
  if (String(t).startsWith("coordinator")) return "coordinator";
  if (String(t).startsWith("admin")) return "admin";
  return t;
};

const EMPTY_RAW = { team_chats: {}, coordinator: 0, admin: 0, staff: 0, system: 0 };

const STORAGE_KEY = "chat_unread_counts";

const loadCachedCounts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.team_chats) return parsed;
    }
  } catch {}
  return null;
};

const saveCachedCounts = (counts) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(counts)); } catch {}
};

// Derive total as a pure function — never stored
const deriveTotal = (raw) => {
  const teamTotal = Object.values(raw.team_chats || {}).reduce((s, v) => s + (v || 0), 0);
  return teamTotal + (raw.coordinator || 0) + (raw.admin || 0) + (raw.staff || 0) + (raw.system || 0);
};

const withTotal = (raw) => ({ ...raw, total: deriveTotal(raw) });

const ChatUnreadContext = createContext({
  counts: withTotal(EMPTY_RAW),
  refresh: () => {},
  markRead: () => {},
  clearActiveChat: () => {},
});

export function ChatUnreadProvider({ user, children }) {
  // Raw state never contains 'total' — it's always derived on read
  // Initialize from localStorage cache to survive refreshes
  const [rawCounts, setRawCounts] = useState(() => loadCachedCounts() || EMPTY_RAW);
  // Memoize to prevent infinite re-render loop (ChatCountsBridge → Layout → Provider)
  const counts = useMemo(() => withTotal(rawCounts), [rawCounts]);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const refetchPendingRef = useRef(false);
  const latestRequestIdRef = useRef(0);
  const inFlightRef = useRef(new Set());

  const fetchCounts = useCallback(async (force = false) => {
    if (!user) return;
    if (fetchingRef.current && !force) { refetchPendingRef.current = true; return; }
    let setFlag = false;
    if (!fetchingRef.current) { fetchingRef.current = true; setFlag = true; }
    const requestId = ++latestRequestIdRef.current;
    try {
      const { data } = await base44.functions.invoke("chatGetUnreadCounts", {});
      if (mountedRef.current && data && !data.error) {
        const normalized = { team_chats: {}, coordinator: data.coordinator || 0, admin: data.admin || 0, staff: data.staff || 0, system: data.system || 0 };
        for (const k of Object.keys(data.team_chats || {})) {
          const nk = toGroupId(k);
          normalized.team_chats[nk] = (normalized.team_chats[nk] || 0) + (data.team_chats[k] || 0);
        }
        if (requestId !== latestRequestIdRef.current) return;
        setRawCounts(normalized);
        saveCachedCounts(normalized);
      }
    } catch (e) {
      console.error("❌ [ChatUnreadProvider] fetch error:", e);
    } finally {
      if (setFlag) fetchingRef.current = false;
      if (setFlag && refetchPendingRef.current) {
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
  }, [user?.email, fetchCounts]);

  // Re-fetch on visibility change
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && user) fetchCounts();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [user?.email, fetchCounts]);

  // Subscribe to real-time events — debounced to avoid rate-limit storms
  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    let debounceTimer = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchCounts(), 3000);
    };
    const subscribe = (entity) => {
      try {
        const unsub = base44.entities[entity].subscribe(() => { debouncedFetch(); });
        unsubs.push(unsub);
      } catch {}
    };
    // Only subscribe to the most critical entities to reduce noise
    ["ChatMessage","CoordinatorMessage","StaffMessage","PrivateMessage"].forEach(subscribe);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubs.forEach(fn => { try { fn(); } catch {} });
    };
  }, [user?.email, fetchCounts]);

  const markRead = useCallback(async (chatType, chatId) => {
    const type = normalizeType(chatType);
    const key = `${type}::${chatId || "global"}`;
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);

    // Optimistic local clear — total is always derived, never set directly
    setRawCounts(prev => {
      const next = { ...prev, team_chats: { ...(prev.team_chats || {}) } };
      if (type === "team" && chatId) {
        next.team_chats[toGroupId(chatId)] = 0;
      } else if (type === "coordinator") {
        next.coordinator = 0;
      } else if (type === "admin") {
        next.admin = 0;
      } else if (type === "staff") {
        next.staff = 0;
      } else if (type === "system") {
        next.system = 0;
      }
      saveCachedCounts(next);
      return next;
    });

    // Persist to backend — do NOT immediately fetchCounts afterwards.
    // The optimistic update is already applied. A full fetchCounts right after
    // the write causes a race condition: the backend may return stale data
    // (before the write propagates), which overwrites the optimistic state
    // of OTHER chat categories, making their badges disappear.
    // Instead, schedule a delayed refresh to eventually reconcile.
    try {
      await base44.functions.invoke("chatMarkRead", { chatType, chatId });
    } catch (e) {
      console.error("[ChatUnreadProvider] markRead error:", e);
    } finally {
      inFlightRef.current.delete(key);
      // Delayed reconciliation — gives the DB time to propagate the write
      setTimeout(() => fetchCounts(), 5000);
    }
  }, [fetchCounts]);

  const clearActiveChat = useCallback(() => {}, []);

  return (
    <ChatUnreadContext.Provider value={{ counts, refresh: fetchCounts, markRead, clearActiveChat }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

/**
 * Consumer hook — drop-in replacement for useChatUnreadCounts.
 * Ignores the `user` param since the Provider already has it.
 */
export function useChatUnread() {
  return useContext(ChatUnreadContext);
}