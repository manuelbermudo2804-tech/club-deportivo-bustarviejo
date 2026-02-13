import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, X, Loader2 } from "lucide-react";
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
      if (window.MediaRecorder && MediaRecorder.isTypeSupported?.(t)) return t;
    } catch {}
  }
  return "audio/webm";
}

/**
 * Flujo simplificado:
 * 1. Toque en micrófono → empieza a grabar INMEDIATAMENTE (barra roja con timer)
 * 2. Toque en enviar → sube y envía directamente
 * 3. Botón X → cancela
 * Sin preview, sin mantener pulsado, sin deslizar.
 */
export default function AudioRecordButton({ onAudioSent, disabled, onPreviewChange, autoStart = false }) {
  const [state, setState] = useState("idle"); // idle | recording | sending
  const [seconds, setSeconds] = useState(0);

  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const fileInputRef = useRef(null);
  const hasAutoStarted = useRef(false);

  const isIframe = (() => { 
    try { 
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      if (isStandalone) return false;
      return window.top !== window.self; 
    } catch { return true; } 
  })();

  const [fallbackMode] = useState(() => {
    const hasMedia = !!(navigator?.mediaDevices?.getUserMedia && window?.MediaRecorder);
    return !hasMedia || isIframe;
  });

  // Auto-start recording when mounted with autoStart=true
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current && !fallbackMode && state === "idle") {
      hasAutoStarted.current = true;
      startRecording();
    }
  }, [autoStart, fallbackMode]);

  // Cleanup
  useEffect(() => {
    return () => {
      try { timerRef.current && clearInterval(timerRef.current); } catch {}
      try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
      const mime = pickMimeType();
      const mr = new MediaRecorder(stream, { mimeType: mime });

      streamRef.current = stream;
      mediaRef.current = mr;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mr.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };

      mr.start();
      setState("recording");
      setSeconds(0);
      try { onPreviewChange?.(true); } catch {}

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 60) stopAndSend();
      }, 250);

    } catch (error) {
      if (error.name === 'NotAllowedError') {
        toast.error('Debes permitir acceso al micrófono');
      } else {
        toast.error('Error al acceder al micrófono');
      }
    }
  };

  const cancelRecording = () => {
    try { timerRef.current && clearInterval(timerRef.current); } catch {}
    try { if (mediaRef.current?.state === 'recording') mediaRef.current.stop(); } catch {}
    try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
    streamRef.current = null;
    chunksRef.current = [];
    setState("idle");
    setSeconds(0);
    try { onPreviewChange?.(false); } catch {}
  };

  const stopAndSend = async () => {
    if (state !== "recording") return;

    // Stop timer
    try { timerRef.current && clearInterval(timerRef.current); } catch {}
    const finalDuration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));

    setState("sending");

    // Stop recorder and wait for data
    const blob = await new Promise((resolve) => {
      const mr = mediaRef.current;
      if (!mr || mr.state === 'inactive') {
        resolve(new Blob(chunksRef.current, { type: mr?.mimeType || 'audio/webm' }));
        return;
      }
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        resolve(b);
      };
      mr.stop();
    });

    // Stop stream
    try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
    streamRef.current = null;

    if (!blob || blob.size === 0) {
      toast.error("Audio vacío, inténtalo de nuevo");
      setState("idle");
      try { onPreviewChange?.(false); } catch {}
      return;
    }

    // Upload and send
    try {
      const type = blob.type || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], `audio_${Date.now()}.${ext}`, { type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      onAudioSent?.({ audio_url: file_url, audio_duracion: finalDuration });
    } catch (err) {
      console.error("Upload audio error", err);
      toast.error("Error al enviar el audio");
    }

    setState("idle");
    setSeconds(0);
    chunksRef.current = [];
    try { onPreviewChange?.(false); } catch {}
  };

  // Fallback: file upload
  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setState("sending");
    try {
      let dur = 0;
      if (f.type.startsWith("audio")) {
        dur = await new Promise((res) => {
          const a = new Audio();
          a.preload = "metadata";
          a.onloadedmetadata = () => res(Math.round(a.duration || 0));
          a.onerror = () => res(0);
          a.src = URL.createObjectURL(f);
        });
      }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      onAudioSent?.({ audio_url: file_url, audio_duracion: Math.max(1, dur) });
    } catch (err) {
      toast.error("Error subiendo el audio");
    }
    setState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ============ RECORDING BAR ============
  if (state === "recording") {
    return (
      <div className="flex items-center gap-2 w-full">
        {/* Cancel */}
        <Button
          size="icon"
          variant="ghost"
          onClick={cancelRecording}
          className="h-10 w-10 text-red-500 hover:bg-red-50 flex-shrink-0 rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Recording indicator */}
        <div className="flex-1 flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-full px-4 py-2">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-sm font-semibold text-red-600">Grabando</span>

          {/* Mini waveform */}
          <div className="flex items-center gap-[2px] flex-1 justify-center">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className="w-[3px] bg-red-400 rounded-full animate-pulse"
                style={{
                  height: `${6 + Math.sin(Date.now() / 200 + i) * 8 + Math.random() * 4}px`,
                  animationDelay: `${i * 80}ms`,
                  animationDuration: '0.5s',
                }}
              />
            ))}
          </div>

          <span className="text-sm font-mono font-bold text-red-700 tabular-nums flex-shrink-0">
            {formatTime(seconds)}
          </span>
        </div>

        {/* Send */}
        <Button
          size="icon"
          onClick={stopAndSend}
          className="h-11 w-11 bg-green-600 hover:bg-green-700 rounded-full flex-shrink-0 shadow-md"
        >
          <Send className="w-5 h-5 text-white" />
        </Button>
      </div>
    );
  }

  // ============ SENDING ============
  if (state === "sending") {
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-full px-4 py-2.5">
          <Loader2 className="w-4 h-4 text-green-600 animate-spin flex-shrink-0" />
          <span className="text-sm font-medium text-green-700">Enviando audio...</span>
        </div>
      </div>
    );
  }

  // ============ FALLBACK (iframe / no mic) ============
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

  // ============ IDLE — Mic button ============
  return (
    <Button
      size="icon"
      onClick={startRecording}
      disabled={disabled}
      className="h-11 w-11 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-full flex-shrink-0"
      title="Grabar audio"
    >
      <Mic className="w-5 h-5 text-white" />
    </Button>
  );
}