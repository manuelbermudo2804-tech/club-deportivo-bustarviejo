import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, X, Send, Play, Pause, Lock } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

/**
 * Sistema de grabación de audio tipo WhatsApp
 * - Mantener presionado para grabar
 * - Deslizar arriba para bloquear
 * - Deslizar izquierda para cancelar
 * - Soltar para enviar automáticamente
 */
export default function WhatsAppAudioRecorder({ onAudioSent, disabled }) {
  const [recordingState, setRecordingState] = useState("idle"); // idle | recording | locked | preview
  const [audioBlob, setAudioBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [slideOffset, setSlideOffset] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const isPressingRef = useRef(false);

  const getClientPoint = (e) => {
    const t = e.touches?.[0] || e.changedTouches?.[0] || e;
    return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 };
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopAllTracks();
      clearInterval(durationIntervalRef.current);
    };
  }, []);

  const stopAllTracks = () => {
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(durationIntervalRef.current);
    stopAllTracks();
    
    setRecordingState("idle");
    setAudioBlob(null);
    setDuration(0);
    setSlideOffset({ x: 0, y: 0 });
  };

  const sendAudio = async () => {
    if (!audioBlob) return;

    setIsSending(true);
    try {
      const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await onAudioSent({
        audio_url: file_url,
        audio_duracion: duration
      });

      // Reset completo
      setRecordingState("idle");
      setAudioBlob(null);
      setDuration(0);
    } catch (error) {
      toast.error("Error al enviar audio");
    } finally {
      setIsSending(false);
    }
  };

  // INICIAR GRABACIÓN (onPointerDown)
  const handlePointerDown = async (e) => {
    if (disabled || recordingState !== "idle") return;
    
    e.preventDefault();
    isPressingRef.current = true;
    pointerStartRef.current = getClientPoint(e);
    setSlideOffset({ x: 0, y: 0 });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Si el usuario soltó el botón antes de que el stream estuviera listo
      if (!isPressingRef.current) {
        stream.getTracks().forEach(track => track.stop());
        toast.info("Mantén pulsado para grabar", { duration: 1500 });
        return;
      }

      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorderRef.current.stream = stream;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stopAllTracks();
      };

      mediaRecorder.start();
      setRecordingState("recording");
      setDuration(0);

      // Contador de tiempo
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 100);

    } catch (error) {
      if (error.name === 'NotAllowedError') {
        toast.error('Debes permitir el acceso al micrófono');
      } else {
        console.error("Mic error:", error);
        toast.error('Error al acceder al micrófono');
      }
      isPressingRef.current = false;
    }
  };

  // MOVER DEDO (onPointerMove)
  const handlePointerMove = (e) => {
    if (recordingState !== "recording") return;

    const pt = getClientPoint(e);
    const deltaX = pt.x - pointerStartRef.current.x;
    const deltaY = pt.y - pointerStartRef.current.y;

    setSlideOffset({ x: deltaX, y: deltaY });

    // BLOQUEAR: deslizar arriba más de 80px
    if (deltaY < -80) {
      lockRecording();
    }

    // CANCELAR: deslizar izquierda más de 120px
    if (deltaX < -120) {
      cancelRecording();
    }
  };

  // SOLTAR DEDO (onPointerUp)
  const handlePointerUp = () => {
    isPressingRef.current = false;
    if (recordingState === "recording") {
      // Soltar sin bloquear = ENVIAR AUTOMÁTICAMENTE
      stopAndSend();
    } else if (recordingState === "idle") {
      toast.info("Mantén pulsado para grabar", { duration: 1200 });
    }
  };

  // BLOQUEAR GRABACIÓN
  const lockRecording = () => {
    setRecordingState("locked");
    setSlideOffset({ x: 0, y: 0 });
    toast.success("🔒 Grabación bloqueada", { duration: 1000 });
  };

  // DETENER Y ENVIAR
  const stopAndSend = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(durationIntervalRef.current);
    setRecordingState("preview");
    setSlideOffset({ x: 0, y: 0 });
  };

  // DETENER GRABACIÓN BLOQUEADA (muestra preview)
  const stopLocked = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(durationIntervalRef.current);
    setRecordingState("preview");
  };

  // REPRODUCIR PREVIEW
  const togglePreview = async () => {
    if (!audioBlob || !audioPreviewRef.current) return;

    try {
      if (isPlaying) {
        audioPreviewRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPreviewRef.current.src = URL.createObjectURL(audioBlob);
        await audioPreviewRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      toast.error("Error al reproducir audio");
      setIsPlaying(false);
    }
  };

  // ========== RENDERIZADO ==========

  // ESTADO: GRABANDO (no bloqueado)
  if (recordingState === "recording") {
    const cancelZoneActive = slideOffset.x < -80;
    const lockZoneActive = slideOffset.y < -60;

    return (
      <div className="fixed inset-0 z-[100] bg-black/40 flex items-end justify-center">
        <div 
          className="w-full bg-white pb-6 pt-4 px-4 rounded-t-3xl shadow-2xl"
          style={{
            transform: `translateY(${Math.max(slideOffset.y, 0)}px)`
          }}
        >
          {/* Indicador de bloqueo arriba */}
          {lockZoneActive && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
              <Lock className="w-4 h-4 inline mr-1" />
              Suelta para bloquear
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Cancelar (zona izquierda) */}
            <div className={`transition-all ${cancelZoneActive ? 'scale-125' : 'scale-100'}`}>
              <Button
                size="icon"
                variant="ghost"
                className={`h-12 w-12 rounded-full ${cancelZoneActive ? 'bg-red-500 text-white' : 'text-red-500'}`}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Ondas de audio animadas */}
            <div className="flex-1 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-500 rounded-full animate-pulse"
                    style={{
                      height: `${12 + Math.random() * 24}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.6s'
                    }}
                  />
                ))}
              </div>
              <span className="text-red-600 font-bold text-lg ml-2">{formatTime(duration)}</span>
            </div>

            {/* Botón micrófono (mantener presionado) */}
            <div 
              ref={buttonRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={cancelRecording}
              className="touch-none"
              style={{
                transform: `translateX(${slideOffset.x}px) translateY(${slideOffset.y}px)`
              }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <Button
                  size="icon"
                  className="h-16 w-16 bg-red-500 hover:bg-red-600 rounded-full relative z-10"
                >
                  <Mic className="w-7 h-7" />
                </Button>
              </div>
            </div>
          </div>

          {/* Indicador visual de cancelación */}
          {cancelZoneActive && (
            <div className="text-center mt-3 text-red-600 font-medium text-sm animate-pulse">
              ← Suelta para cancelar
            </div>
          )}
        </div>
      </div>
    );
  }

  // ESTADO: BLOQUEADO (grabando sin mantener presionado)
  if (recordingState === "locked") {
    return (
      <div className="bg-red-50 border-2 border-red-400 rounded-2xl px-4 py-3">
        <audio ref={audioPreviewRef} onEnded={() => setIsPlaying(false)} />
        <div className="flex items-center gap-3">
          {/* Ondas animadas */}
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.random() * 24}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              />
            ))}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-600" />
              <span className="text-red-600 font-bold text-lg">{formatTime(duration)}</span>
            </div>
            <p className="text-xs text-slate-600">Grabando...</p>
          </div>

          {/* Detener */}
          <Button
            size="sm"
            onClick={stopLocked}
            className="bg-green-600 hover:bg-green-700 h-10 px-6"
          >
            <Send className="w-4 h-4 mr-2" />
            Listo
          </Button>

          {/* Cancelar */}
          <Button
            size="icon"
            variant="ghost"
            onClick={cancelRecording}
            className="h-10 w-10 text-red-600 hover:bg-red-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // ESTADO: PREVIEW (antes de enviar)
  if (recordingState === "preview" && audioBlob) {
    return (
      <div className="bg-green-50 border-2 border-green-400 rounded-2xl px-4 py-3">
        <audio 
          ref={audioPreviewRef} 
          onEnded={() => setIsPlaying(false)}
        />
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <Button
            size="icon"
            variant="ghost"
            onClick={togglePreview}
            disabled={isSending}
            className="h-10 w-10 hover:bg-green-200"
          >
            {isPlaying ? <Pause className="w-5 h-5 text-green-700" /> : <Play className="w-5 h-5 text-green-700" />}
          </Button>

          {/* Forma de onda */}
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-green-600 rounded-full"
                  style={{ height: `${4 + Math.random() * 16}px` }}
                />
              ))}
            </div>
            <span className="text-sm text-green-700 font-medium">{formatTime(duration)}</span>
          </div>

          {/* Enviar */}
          <Button
            size="icon"
            onClick={sendAudio}
            disabled={isSending}
            className="h-12 w-12 bg-green-600 hover:bg-green-700 rounded-full"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>

          {/* Cancelar */}
          <Button
            size="icon"
            variant="ghost"
            onClick={cancelRecording}
            disabled={isSending}
            className="h-10 w-10 text-red-600 hover:bg-red-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // ESTADO: IDLE (botón micrófono normal)
  return (
    <div
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelRecording}
      className="touch-none"
    >
      <Button
        size="icon"
        className="h-11 w-11 bg-green-600 hover:bg-green-700 rounded-full"
        disabled={disabled}
      >
        <Mic className="w-5 h-5" />
      </Button>
    </div>
  );
}