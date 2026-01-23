import React from 'react';

/**
 * Renderiza emojis con scaling exacto tipo WhatsApp
 * - 1 emoji: ~32px
 * - 2 emojis: ~28px
 * - 3 emojis: ~24px
 * - 4+ emojis: texto normal
 */
export default function EmojiScaler({ content }) {
  // Detectar si es solo emojis
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;
  
  if (!emojiRegex.test(content)) {
    // No es solo emojis, retornar contenido normal
    return <span>{content}</span>;
  }
  
  // Contar emojis
  const emojiArray = Array.from(content);
  const emojiCount = emojiArray.length;
  
  // Determinar tamaño
  let fontSize;
  switch (emojiCount) {
    case 1:
      fontSize = '32px';
      break;
    case 2:
      fontSize = '28px';
      break;
    case 3:
      fontSize = '24px';
      break;
    default:
      // 4+ emojis: tamaño normal
      return <span>{content}</span>;
  }
  
  return (
    <span style={{ fontSize, lineHeight: '1.4', display: 'inline-block' }}>
      {content}
    </span>
  );
}