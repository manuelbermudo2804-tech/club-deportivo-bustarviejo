import { useRef, useEffect } from "react";

export default function useChatSound() {
  const lastMessageCountRef = useRef(0);
  
  // Sonido de notificación sutil (no intrusivo)
  const playNotificationSound = () => {
    try {
      // Usar Web Audio API para sonido más confiable
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurar sonido agradable (tipo WhatsApp)
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      
      // Volumen bajo y fade out
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log("No se pudo reproducir sonido:", error);
    }
  };

  // Función para detectar mensajes nuevos y reproducir sonido
  const checkNewMessages = (messages = [], userEmail = "") => {
    if (!messages || messages.length === 0) return;
    
    const currentCount = messages.length;
    
    // Solo reproducir si aumentó el contador Y el último mensaje NO es del usuario actual
    if (lastMessageCountRef.current > 0 && currentCount > lastMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      
      // Solo sonido si el mensaje es de otra persona
      if (lastMessage && lastMessage.remitente_email !== userEmail) {
        playNotificationSound();
      }
    }
    
    lastMessageCountRef.current = currentCount;
  };

  return { playNotificationSound, checkNewMessages };
}