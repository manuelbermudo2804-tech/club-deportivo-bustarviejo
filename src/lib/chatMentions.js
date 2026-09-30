// Menciones @Nombre en los chats (solo visual, sin notificaciones)
export const MENTION_REGEX = /(@[\p{Lu}][\p{L}]+(?: [\p{Lu}][\p{L}]+){0,3})/u;

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
export function mentionCandidates(messages, myName) {
  const names = (messages || []).map(m => m.remitente_nombre || m.autor_nombre).filter(Boolean);
  return [...new Set(names)].filter(n => n !== myName).sort();
}