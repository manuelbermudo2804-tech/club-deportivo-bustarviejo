import { useRef, useCallback } from "react";

// Hook para reproducir sonido de notificación en el chat
export default function useChatSound() {
  const audioRef = useRef(null);
  const lastPlayedRef = useRef(0);

  const playNotificationSound = useCallback(() => {
    // Evitar spam de sonidos (mínimo 2 segundos entre sonidos)
    const now = Date.now();
    if (now - lastPlayedRef.current < 2000) return;
    lastPlayedRef.current = now;

    try {
      // Crear AudioContext si es necesario (mejor soporte móvil)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      
      // Crear un sonido de notificación simple y agradable
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Sonido tipo "pop" agradable
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.type = "sine";
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      
    } catch (error) {
      // Silenciar errores de audio (puede fallar en algunos navegadores)
      console.log("Audio notification not supported");
    }
  }, []);

  return { playNotificationSound };
}