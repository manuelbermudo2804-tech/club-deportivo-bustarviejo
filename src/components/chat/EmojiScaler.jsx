import React from "react";

export default function EmojiScaler({ reactions }) {
  if (!reactions || reactions.length === 0) return null;

  // Calcular tamaño según cantidad de emojis
  const getEmojiSize = (count) => {
    if (count === 1) return "text-4xl"; // ~32px
    if (count === 2) return "text-3xl"; // ~28px
    if (count === 3) return "text-2xl"; // ~24px
    return "text-base"; // 4+ = tamaño normal
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