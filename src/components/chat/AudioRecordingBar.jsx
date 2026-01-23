import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Send, X, Play } from "lucide-react";
import { toast } from "sonner";

/**
 * Barra de grabación de audio tipo WhatsApp
 * Estados: recording -> pending upload -> (cancelado o enviado)
 */
export default function AudioRecordingBar({
  isRecording,
  onStartRecording,
  onStopRecording,
  audioBlob,
  audioDuration,
  onSendAudio,
  onCancelAudio,
  uploading = false,
  disabled = false
}) {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = useRef(null);

  const handlePlayPreview = async () => {
    if (!audioBlob) return;
    try {
      if (isPlayingPreview) {
        audioRef.current?.pause();
        setIsPlayingPreview(false);
      } else {
        const url = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = url;
          await audioRef.current.play();
          setIsPlayingPreview(true);
        }
      }
    } catch (error) {
      toast.error("Error al reproducir el audio");
      setIsPlayingPreview(false);
    }
  };

  // Estado de grabación activa
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-red-50 rounded-full px-4 py-2 border-2 border-red-400 animate-pulse">
        <audio ref={audioRef} />
        <div className="flex items-center flex-1 gap-2">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
          <span className="text-sm font-bold text-red-700">🔴 Grabando...</span>
        </div>
        <Button
          size="sm"
          onClick={onStopRecording}
          className="h-8 bg-red-600 hover:bg-red-700 text-white"
          disabled={disabled}
        >
          <Pause className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Audio pendiente - mostrar preview y opciones de envío
  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 bg-green-50 rounded-full px-4 py-2 border-2 border-green-400">
        <audio 
          ref={audioRef} 
          onEnded={() => setIsPlayingPreview(false)}
        />
        <div className="flex items-center flex-1 gap-2">
          <Mic className="w-4 h-4 text-green-700" />
          <span className="text-sm font-medium text-green-700">
            🎤 {audioDuration}s
          </span>
        </div>
        
        {/* Botón reproducir */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handlePlayPreview}
          className="h-8 text-green-700 hover:bg-green-200"
          disabled={uploading || disabled}
        >
          {isPlayingPreview ? "⏸" : "▶"}
        </Button>

        {/* Botón enviar */}
        <Button
          size="sm"
          onClick={onSendAudio}
          className="h-8 bg-green-600 hover:bg-green-700 text-white"
          disabled={uploading || disabled}
        >
          {uploading ? "⏳" : <Send className="w-4 h-4" />}
        </Button>

        {/* Botón cancelar */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancelAudio}
          className="h-8 text-red-600 hover:bg-red-100"
          disabled={uploading || disabled}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Botón micrófono normal
  return (
    <Button
      size="icon"
      onClick={onStartRecording}
      className="h-11 w-11 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full text-white"
      disabled={disabled}
      title="Grabar audio"
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
}