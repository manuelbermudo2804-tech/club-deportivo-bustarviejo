// Menciones @Nombre en los chats (solo visual, sin notificaciones)
export const MENTION_REGEX = /(@[\p{L}][\p{L}.]+(?: [\p{Lu}][\p{L}]+){0,3})/u;

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// ¿La mención "@Laura Garcia" se refiere al usuario actual?
export function isMentionOf(mention, userName) {
  const m = norm(mention.replace(/^@/, ""));
  const u = norm(userName);
  return !!m && !!u && (u === m || u.startsWith(m + " "));
}

export function messageMentionsUser(text, userName) {
  if (!text || !userName) return false;
  return String(text).split(new RegExp(MENTION_REGEX, "gu")).some(p => p.startsWith("@") && isMentionOf(p, userName));
}

// Personas mencionables: quien ha escrito en el chat (menos yo)
// extraNames: miembros del grupo aunque nunca hayan escrito
export function mentionCandidates(messages, myName, extraNames = []) {
  const names = [...(messages || []).map(m => m.remitente_nombre || m.autor_nombre), ...extraNames].filter(Boolean).map(n => String(n).trim());
  return [...new Set(names)].filter(n => n !== myName).sort();
}