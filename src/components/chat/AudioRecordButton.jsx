import React, { useEffect, useRef, useState } from "react";
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
 * Self-contained audio record button.
 * - Tap mic → starts recording immediately (replaces itself with recording bar)
 * - Tap send → uploads and sends
 * - Tap X → cancels
 * 
 * Props:
 * - onAudioSent({ audio_url, audio_duracion })
 * - disabled
 * - onRecordingChange(bool) - optional, notifies parent when recording starts/stops
 */
export default function AudioRecordButton({ onAudioSent, disabled, onRecordingChange }) {
  const [state, setState] = useState("idle"); // idle | starting | recording | sending
  const [seconds, setSeconds] = useState(0);

  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Notify parent of recording state changes
  useEffect(() => {
    const isRecording = state === "starting" || state === "recording" || state === "sending";
    try { onRecordingChange?.(isRecording); } catch {}
  }, [state]);

  // Cleanup
  useEffect(() => {
    return () => {
      try { timerRef.current && clearInterval(timerRef.current); } catch {}
      try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
    };
  }, []);

  const startRecording = async () => {
    setState("starting");
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
      setState("idle");
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
  };

  const stopAndSend = async () => {
    if (state !== "recording") return;

    try { timerRef.current && clearInterval(timerRef.current); } catch {}
    const finalDuration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));

    setState("sending");

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

    try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
    streamRef.current = null;

    if (!blob || blob.size === 0) {
      toast.error("Audio vacío, inténtalo de nuevo");
      setState("idle");
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

    setState("idle");
    setSeconds(0);
    chunksRef.current = [];
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

  // ============ IDLE — Mic button only ============
  if (state === "idle") {
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

  // ============ FULL-WIDTH STATES (starting, recording, sending) ============
  // These are rendered by the parent via the "expanded" slot
  return null;
}

/**
 * Separate component for the expanded recording bar.
 * Parent renders this INSTEAD of the normal input row when recording is active.
 */
export function AudioRecordingBar({ audioRef }) {
  // This is now handled inline — kept for backward compat
  return null;
}