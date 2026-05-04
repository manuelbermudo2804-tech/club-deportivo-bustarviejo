import React from "react";

// Renderiza emojis grandes SOLO si el contenido es únicamente emojis (1-3 caracteres)
// O renderiza reacciones de usuarios a un mensaje
export default function EmojiScaler({ content, reactions }) {
  // Modo 1: Reacciones a mensajes
  if (reactions) {
    if (!reactions || reactions.length === 0) return null;

    const getEmojiSize = (count) => {
      if (count === 1) return "text-4xl";
      if (count === 2) return "text-3xl";
      if (count === 3) return "text-2xl";
      return "text-base";
    };

    const emojiSize = getEmojiSize(reactions.length);

    return (
      <div className={`flex gap-1 mt-2 flex-wrap ${emojiSize}`}>
        {reactions.map((r, idx) => (
          <span key={idx} title={r.user_nombre || r.nombre || r.usuario_nombre || r.email || ""}>
            {r.emoji}
          </span>
        ))}
      </div>
    );
  }

  // Modo 2: Contenido de mensaje (escalar solo si es emoji puro)
  if (!content) return null;
  
  const trimmed = content.trim();
  // Solo escalar si SON únicamente emojis (sin letras, números ni puntuación de ningún idioma)
  const hasLetterNumberOrPunct = /[\p{Letter}\p{Number}\p{Punctuation}]/u.test(trimmed);
  const isOnlyEmoji = trimmed.length > 0 &&
    trimmed.length <= 8 &&
    !hasLetterNumberOrPunct &&
    /\p{Extended_Pictographic}/u.test(trimmed);
  
  if (isOnlyEmoji) {
    return <span style={{ fontSize: '3rem' }}>{content}</span>;
  }
  
  return <>{content}</>;
}