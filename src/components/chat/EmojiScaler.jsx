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

  return <Linkify text={content} />;
}

// Convierte URLs (http/https/www) y emails dentro del texto en enlaces clicables,
// preservando el resto del texto y los saltos de línea.
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s]+|[^\s@]+@[^\s@]+\.[^\s@]+)/gi;

function Linkify({ text }) {
  if (!text) return null;
  const parts = String(text).split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        const isUrl = /^(https?:\/\/|www\.)/i.test(part);
        const isEmail = !isUrl && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part);
        if (isUrl) {
          // Separar posible puntuación final (., , ) ! ?) para no incluirla en el enlace
          const m = part.match(/^(.*?)([.,!?)\]]*)$/);
          const url = m ? m[1] : part;
          const trailing = m ? m[2] : "";
          const href = url.startsWith("www.") ? `https://${url}` : url;
          return (
            <React.Fragment key={i}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {url}
              </a>
              {trailing}
            </React.Fragment>
          );
        }
        if (isEmail) {
          return (
            <a
              key={i}
              href={`mailto:${part}`}
              className="text-blue-600 underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}