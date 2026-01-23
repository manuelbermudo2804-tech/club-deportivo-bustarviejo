/**
 * Utility para agrupar mensajes consecutivos del mismo usuario
 * Retorna array con {messages, isGroupStart, isGroupEnd, senderInfo}
 */
export function groupConsecutiveMessages(messages) {
  if (!messages || messages.length === 0) return [];
  
  return messages.map((msg, idx) => {
    const prevMsg = idx > 0 ? messages[idx - 1] : null;
    const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
    
    const sameSenderAsPrev = prevMsg && prevMsg.remitente_email === msg.remitente_email;
    const sameSenderAsNext = nextMsg && nextMsg.remitente_email === msg.remitente_email;
    
    return {
      ...msg,
      isGroupStart: !sameSenderAsPrev,
      isGroupEnd: !sameSenderAsNext,
      marginTop: sameSenderAsPrev ? '2px' : '12px'
    };
  });
}