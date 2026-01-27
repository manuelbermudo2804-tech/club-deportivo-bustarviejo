import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Send, X, Play, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Botón de audio EXACTO a WhatsApp:
 * - Mantener presionado para grabar
 * - Soltar para enviar
 * - Deslizar izquierda para cancelar
 * - Deslizar arriba para bloquear (hands-free)
 */
export default function WhatsAppAudioButton({ onAudioSent, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [slideX, setSlideX] = useState(0);
  const [slideY, setSlideY] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const audioPreviewRef = useRef(null);
  const buttonRef = useRef(null);

  const CANCEL_THRESHOLD = -120; // px a la izquierda para cancelar
  const LOCK_THRESHOLD = -80; // px arriba para bloquear

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const pickMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ];
    if (typeof window !== 'undefined' && window.MediaRecorder) {
      for (const mt of candidates) {
        if (MediaRecorder.isTypeSupported?.(mt)) return mt;
      }
    }
    return null;
  };

  const isRecorderSupported = () => {
    return !!(navigator?.mediaDevices?.getUserMedia && window?.MediaRecorder);
  };

  const [fallbackMode, setFallbackMode] = React.useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const mime = pickMimeType();
      if (!mime) {
        // No hay soporte para MediaRecorder utilizable
        setFallbackMode(true);
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      const mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();
      setDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Usar el faltimo mime usado por MediaRecorder si existe
        const lastType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: lastType });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Timer de duración
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        if (elapsed >= 60 && mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 100);

    } catch (error) {
      if (error.name === 'NotAllowedError') {
        toast.error('Debes permitir acceso al micrófono');
      } else {
        toast.error('Error al acceder al micrófono');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setDuration(0);
    setIsLocked(false);
    setSlideX(0);
    setSlideY(0);
  };

  const sendAudio = async () => {
    if (!audioBlob) return;

    setIsSending(true);
    try {
      await onAudioSent(audioBlob, duration);
      setAudioBlob(null);
      setDuration(0);
      setIsLocked(false);
    } catch (error) {
      toast.error('Error al enviar audio');
    } finally {
      setIsSending(false);
    }
  };

  const togglePlayPreview = () => {
    if (!audioBlob || !audioPreviewRef.current) return;

    if (isPlaying) {
      audioPreviewRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPreviewRef.current.src = URL.createObjectURL(audioBlob);
      audioPreviewRef.current.play();
      setIsPlaying(true);
    }
  };

  // Touch handlers - COMO WHATSAPP
  const handleTouchStart = (e) => {
    if (disabled || audioBlob) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    startRecording();
  };

  const handleTouchMove = (e) => {
    if (!isRecording || isLocked) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;

    setSlideX(deltaX);
    setSlideY(deltaY);

    // Cancelar si desliza mucho a la izquierda
    if (deltaX < CANCEL_THRESHOLD) {
      cancelRecording();
      toast.error('🚫 Grabación cancelada');
    }

    // Bloquear si desliza arriba
    if (deltaY < LOCK_THRESHOLD) {
      setIsLocked(true);
      setSlideX(0);
      setSlideY(0);
      toast.success('🔒 Grabación bloqueada - manos libres', { duration: 1500 });
    }
  };

  const handleTouchEnd = () => {
    if (!isRecording) return;

    setSlideX(0);
    setSlideY(0);

    if (!isLocked) {
      // Soltar = enviar automáticamente
      stopRecording();
      // El audio se enviará cuando audioBlob se actualice
    }
  };

  // Mouse handlers para desktop
  const handleMouseDown = () => {
    if (disabled || audioBlob) return;
    startRecording();
  };

  const handleMouseUp = () => {
    if (!isRecording || isLocked) return;
    stopRecording();
  };

  // Auto-enviar cuando se suelta el botón (solo si no está bloqueado)
  useEffect(() => {
    if (audioBlob && !isLocked && !isSending) {
      sendAudio();
    }
  }, [audioBlob, isLocked]);

  // Si hay audio grabado y bloqueado - mostrar controles
  if (audioBlob || (isRecording && isLocked)) {
    return (
      <div className="fixed bottom-0 left-0 right-0 lg:static lg:w-full bg-white border-t-2 border-green-500 p-3 z-50 shadow-2xl">
        <audio 
          ref={audioPreviewRef} 
          onEnded={() => setIsPlaying(false)}
        />
        
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {/* Botón cancelar */}
          <Button
            size="icon"
            variant="ghost"
            onClick={cancelRecording}
            disabled={isSending}
            className="h-11 w-11 text-red-600 hover:bg-red-50 flex-shrink-0"
          >
            <Trash2 className="w-5 h-5" />
          </Button>

          {/* Waveform / Duración */}
          <div className="flex-1 bg-green-50 rounded-full px-4 py-3 flex items-center gap-3">
            {isRecording ? (
              <>
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-red-700">Grabando...</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 text-green-700" />
                <span className="text-sm font-semibold text-green-800">Audio de voz</span>
              </>
            )}
            <span className="ml-auto text-sm font-mono text-green-700">
              {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Reproducir (solo si no está grabando) */}
          {!isRecording && audioBlob && (
            <Button
              size="icon"
              variant="ghost"
              onClick={togglePlayPreview}
              disabled={isSending}
              className="h-11 w-11 text-green-700 hover:bg-green-50 flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
          )}

          {/* Enviar (solo si no está grabando) */}
          {!isRecording && audioBlob && (
            <Button
              size="icon"
              onClick={sendAudio}
              disabled={isSending}
              className="h-12 w-12 bg-green-600 hover:bg-green-700 rounded-full flex-shrink-0"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          )}

          {/* Parar (solo si está grabando bloqueado) */}
          {isRecording && (
            <Button
              size="icon"
              onClick={stopRecording}
              className="h-12 w-12 bg-red-600 hover:bg-red-700 rounded-full flex-shrink-0"
            >
              <Pause className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Fallback: subida de archivo de audio
  if (fallbackMode && !audioBlob) {
    return (
      <label className="px-3 py-2 rounded-full bg-green-600 text-white text-sm cursor-pointer">
        Subir audio
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setAudioBlob(f);
              setDuration(0);
            }
          }}
        />
      </label>
    );
  }

  // Botón normal - PRESS & HOLD
  return (
    <Button
      ref={buttonRef}
      size="icon"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      disabled={disabled}
      className="h-11 w-11 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-full flex-shrink-0 relative overflow-visible touch-none select-none"
      style={{
        transform: isRecording && !isLocked ? `translate(${slideX}px, ${slideY}px)` : 'none',
        transition: isRecording && !isLocked ? 'none' : 'transform 0.2s ease-out'
      }}
    >
      <Mic className="w-5 h-5 text-white" />
      
      {/* Indicador de deslizar */}
      {isRecording && !isLocked && (
        <>
          {/* Flecha arriba - bloquear */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-3 py-2 rounded-xl text-xs whitespace-nowrap animate-bounce">
            ⬆️ Desliza arriba para bloquear
          </div>
          
          {/* Flecha izquierda - cancelar */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-32 bg-red-500 text-white px-3 py-2 rounded-xl text-xs whitespace-nowrap flex items-center gap-2">
            ⬅️ Desliza para cancelar
            {slideX < -50 && <X className="w-4 h-4" />}
          </div>
        </>
      )}
    </Button>
  );
}