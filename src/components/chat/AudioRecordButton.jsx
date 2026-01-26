import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const t of candidates) {
    try {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    } catch {}
  }
  return "audio/webm";
}

export default function AudioRecordButton({ onAudioSent, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const chunksRef = useRef([]);
  const mediaRef = useRef(null);
  const timerRef = useRef(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Fallback si estamos en iframe o sin soporte
    const inIframe = window.top !== window.self;
    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    setFallbackMode(inIframe || !hasMedia);
  }, []);

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = pickMimeType();
      const mr = new MediaRecorder(stream, { mimeType: type });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stopTimer();
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        try {
          const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
          const file = new File([blob], `audio_${Date.now()}.${ext}`, { type });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          if (onAudioSent) {
            onAudioSent({ audio_url: file_url, audio_duracion: Math.max(1, seconds) });
          }
        } catch (err) {
          console.error("Upload audio error", err);
          toast.error("Error subiendo el audio");
        } finally {
          // Parar tracks
          try { stream.getTracks().forEach(t => t.stop()); } catch {}
        }
      };
      mediaRef.current = mr;
      mr.start();
      setIsRecording(true);
      startTimer();
    } catch (e) {
      console.error("Mic permission/start error", e);
      toast.error("No se pudo acceder al micrófono. Usa 'Subir audio'.");
      setFallbackMode(true);
    }
  };

  const stopRecording = () => {
    try {
      mediaRef.current?.stop();
    } catch {}
    setIsRecording(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Si es un archivo de audio, intentar leer duración
      let durationSec = 0;
      if (file.type.startsWith("audio")) {
        durationSec = await new Promise((resolve) => {
          const a = new Audio();
          a.preload = "metadata";
          a.onloadedmetadata = () => resolve(Math.round(a.duration || 0));
          a.onerror = () => resolve(0);
          a.src = URL.createObjectURL(file);
        });
      }
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (onAudioSent) onAudioSent({ audio_url: file_url, audio_duracion: Math.max(1, durationSec) });
    } catch (err) {
      console.error("Upload audio file error", err);
      toast.error("Error subiendo el audio");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (fallbackMode) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-11 w-11 flex-shrink-0"
          title="Subir audio"
        >
          <Mic className="w-5 h-5 text-slate-600" />
        </Button>
      </>
    );
  }

  return (
    <Button
      size="icon"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      className={`h-11 w-11 flex-shrink-0 rounded-full ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
      title={isRecording ? `Grabando… ${seconds}s` : 'Grabar audio'}
    >
      {isRecording ? <Square className="w-4 h-4 text-white" /> : <Mic className="w-5 h-5" />}
    </Button>
  );
}