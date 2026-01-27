import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Play, Pause, X, Check } from "lucide-react";
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

export default function AudioRecordButton({ onAudioSent, disabled, onPreviewChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);

  // Preview state (allow listen before sending)
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Recorder internals
  const chunksRef = useRef([]);
  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  // Fallback (iframe or no mic permissions)
  const [fallbackMode, setFallbackMode] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Usar fallback SOLO si el navegador no soporta MediaRecorder/getUserMedia
    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    setFallbackMode(!hasMedia);
  }, []);

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const cleanupStream = () => {
    try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
    streamRef.current = null;
  };

  const startRecording = async () => {
    try {
      // Evitar iniciar si ya hay una previsualización pendiente
      if (previewBlob) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const type = pickMimeType();
      const mr = new MediaRecorder(stream, { mimeType: type });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stopTimer();
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        cleanupStream();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        try { onPreviewChange && onPreviewChange(true); } catch {}
      };
      mediaRef.current = mr;
      mr.start();
      setIsRecording(true);
      setSeconds(0);
      startTimer();
    } catch (e) {
      console.error("Mic permission/start error", e);
      toast.error("No se pudo acceder al micrófono. Usa 'Subir audio'.");
      setFallbackMode(true);
    }
  };

  const stopRecording = () => {
    // Activa inmediatamente el modo de previsualización para evitar que reaparezcan controles de texto/mic
    try { onPreviewChange && onPreviewChange(true); } catch {}
    try { mediaRef.current?.stop(); } catch {}
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSending(true);
      // Try duration if audio
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
      onAudioSent?.({ audio_url: file_url, audio_duracion: Math.max(1, durationSec) });
    } catch (err) {
      console.error("Upload audio file error", err);
      toast.error("Error subiendo el audio");
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const discardPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPreviewBlob(null);
    setIsPlaying(false);
    try { onPreviewChange && onPreviewChange(false); } catch {}
  };

  const sendPreview = async () => {
    if (!previewBlob) return;
    try {
      setSending(true);
      const type = previewBlob.type || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
      const file = new File([previewBlob], `audio_${Date.now()}.${ext}`, { type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // Fijar duración robusta (si seconds quedó 0, estimar con metadata)
      let durationSec = seconds;
      if (!durationSec) {
        durationSec = await new Promise((resolve) => {
          const a = new Audio();
          a.preload = 'metadata';
          a.onloadedmetadata = () => resolve(Math.max(1, Math.round(a.duration || 1)));
          a.onerror = () => resolve(1);
          a.src = URL.createObjectURL(previewBlob);
        });
      }
      onAudioSent?.({ audio_url: file_url, audio_duracion: Math.max(1, durationSec) });
      discardPreview();
    } catch (err) {
      console.error("Upload audio error", err);
      toast.error("Error subiendo el audio");
    } finally {
      setSending(false);
    }
  };

  // Preview UI
  if (previewBlob && !fallbackMode) {
    return (
      <div className="flex flex-wrap items-center gap-2 w-full">
        <audio
          ref={audioRef}
          src={previewUrl}
          controls
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="h-10 flex-1 min-w-0"
          style={{ maxWidth: '100%' }}
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={discardPreview}
            disabled={sending || disabled}
            className="flex items-center gap-1 px-3"
          >
            <X className="w-4 h-4" /> Cancelar
          </Button>
          <Button
            size="sm"
            onClick={sendPreview}
            disabled={sending || disabled}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-1 px-3"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enviar
          </Button>
        </div>
      </div>
    );
  }

  if (fallbackMode) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || sending}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          className="h-11 w-11 flex-shrink-0"
          title="Subir audio"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin text-slate-600" /> : <Mic className="w-5 h-5 text-slate-600" />}
        </Button>
      </>
    );
  }

  return (
    <Button
      size="icon"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || sending}
      className={`h-11 w-11 flex-shrink-0 rounded-full ${isRecording ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
      title={isRecording ? `Grabando… ${seconds}s` : 'Grabar audio'}
    >
      {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
    </Button>
  );
}