import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Send, X, Loader2 } from "lucide-react";
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
 * Two modes based on `expanded` prop:
 * 
 * 1) expanded=false (default): Renders a mic BUTTON only. 
 *    When tapped, calls onExpandedChange(true).
 * 
 * 2) expanded=true: Immediately starts recording and renders a FULL-WIDTH bar.
 *    Parent should hide other input elements and give this the full row.
 *    When done (sent/cancelled), calls onExpandedChange(false).
 */
export default function AudioRecordButton({ onAudioSent, disabled, expanded = false, onExpandedChange }) {
  const [phase, setPhase] = useState("idle"); // idle | starting | recording | sending
  const [seconds, setSeconds] = useState(0);

  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const fileInputRef = useRef(null);
  const didStartRef = useRef(false);

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

  // Auto-start when expanded becomes true
  useEffect(() => {
    if (expanded && !didStartRef.current && !fallbackMode) {
      didStartRef.current = true;
      startRecording();
    }
    if (!expanded) {
      didStartRef.current = false;
    }
  }, [expanded, fallbackMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { timerRef.current && clearInterval(timerRef.current); } catch {}
      try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
    };
  }, []);

  const collapse = useCallback(() => {
    setPhase("idle");
    setSeconds(0);
    try { onExpandedChange?.(false); } catch {}
  }, [onExpandedChange]);

  const startRecording = async () => {
    setPhase("starting");
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
      setPhase("recording");
      setSeconds(0);

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
      collapse();
    }
  };

  const cancelRecording = () => {
    try { timerRef.current && clearInterval(timerRef.current); } catch {}
    try { if (mediaRef.current?.state === 'recording') mediaRef.current.stop(); } catch {}
    try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
    streamRef.current = null;
    chunksRef.current = [];
    collapse();
  };

  const stopAndSend = async () => {
    try { timerRef.current && clearInterval(timerRef.current); } catch {}
    const finalDuration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));

    setPhase("sending");

    const blob = await new Promise((resolve) => {
      const mr = mediaRef.current;
      if (!mr || mr.state === 'inactive') {
        resolve(new Blob(chunksRef.current, { type: mr?.mimeType || 'audio/webm' }));
        return;
      }
      mr.onstop = () => resolve(new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' }));
      mr.stop();
    });

    try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
    streamRef.current = null;

    if (!blob || blob.size === 0) {
      toast.error("Audio vacío, inténtalo de nuevo");
      collapse();
      return;
    }

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

    chunksRef.current = [];
    collapse();
  };

  // Fallback: file upload
  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhase("sending");
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
    if (fileInputRef.current) fileInputRef.current.value = "";
    collapse();
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ============ FALLBACK (iframe / no mic) — always just a button ============
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

  // ============ COLLAPSED — Just the mic button ============
  if (!expanded) {
    return (
      <Button
        size="icon"
        onClick={() => onExpandedChange?.(true)}
        disabled={disabled}
        className="h-11 w-11 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-full flex-shrink-0"
        title="Grabar audio"
      >
        <Mic className="w-5 h-5 text-white" />
      </Button>
    );
  }

  // ============ EXPANDED STATES ============

  // Starting (waiting for mic permission)
  if (phase === "starting" || phase === "idle") {
    return (
      <div className="flex items-center gap-2 w-full">
        <Button
          size="icon"
          variant="ghost"
          onClick={cancelRecording}
          className="h-10 w-10 text-red-500 hover:bg-red-50 flex-shrink-0 rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>
        <div className="flex-1 flex items-center gap-2.5 bg-orange-50 border border-orange-200 rounded-full px-4 py-2.5">
          <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />
          <span className="text-sm font-medium text-orange-600">Accediendo al micrófono...</span>
        </div>
      </div>
    );
  }

  // Recording
  if (phase === "recording") {
    return (
      <div className="flex items-center gap-2 w-full">
        <Button
          size="icon"
          variant="ghost"
          onClick={cancelRecording}
          className="h-10 w-10 text-red-500 hover:bg-red-50 flex-shrink-0 rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="flex-1 flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-full px-4 py-2">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-sm font-semibold text-red-600 flex-shrink-0">Grabando</span>

          <div className="flex items-center gap-[2px] flex-1 justify-center overflow-hidden">
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

  // Sending
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-full px-4 py-2.5">
        <Loader2 className="w-4 h-4 text-green-600 animate-spin flex-shrink-0" />
        <span className="text-sm font-medium text-green-700">Enviando audio...</span>
      </div>
    </div>
  );
}