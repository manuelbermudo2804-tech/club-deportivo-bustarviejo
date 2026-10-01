import { base44 } from "@/api/base44Client";

// Cola local de mensajes de chat para cuando no hay cobertura.
// Cada mensaje lleva un client_id único: al reintentar se comprueba si ya
// llegó al servidor, así nunca se duplica.
const KEY = "chat_pending_queue";
const EVENT = "chat-queue-changed";

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
const write = (q) => {
  localStorage.setItem(KEY, JSON.stringify(q));
  window.dispatchEvent(new Event(EVENT));
};

export const CHAT_QUEUE_EVENT = EVENT;
export const newClientId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
export const pendingChatCount = (grupo_id) =>
  read().filter((m) => !grupo_id || m.grupo_id === grupo_id).length;

// Error de conexión (sin respuesta del servidor), no un error de permisos o datos
export const isNetworkError = (err) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const status = err?.response?.status || err?.status;
  return !status;
};

export const queueChatMessage = (payload) => {
  const q = read().filter((m) => m.client_id !== payload.client_id);
  q.push(payload);
  write(q);
};

const sendOne = async (payload) => {
  const existing = await base44.entities.ChatMessage.filter({ client_id: payload.client_id });
  if (!existing[0]) await base44.entities.ChatMessage.create(payload);
  write(read().filter((m) => m.client_id !== payload.client_id));
};

let flushing = false;
export const flushChatQueue = async () => {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  for (const item of read()) {
    try { await sendOne(item); sent++; } catch { break; }
  }
  flushing = false;
  return sent;
};