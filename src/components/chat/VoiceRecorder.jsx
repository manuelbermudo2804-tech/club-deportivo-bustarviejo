import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function VoiceRecorder({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length > 0) {
          const audioFile = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
          onRecordingComplete(audioFile);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      toast.success("🎤 Grabando audio...");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("No se pudo acceder al micrófono");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      chunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      toast.info("Grabación cancelada");
    }
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-3 py-2">
        <Mic className="w-4 h-4 text-red-600 animate-pulse" />
        <span className="text-sm font-mono text-red-700">
          {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={cancelRecording}
          className="text-red-600 hover:bg-red-100 h-7 px-2"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          onClick={stopRecording}
          className="bg-red-600 hover:bg-red-700 h-7 px-3"
        >
          <Square className="w-3 h-3 mr-1 fill-white" />
          Enviar
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={startRecording}
      disabled={disabled}
      className="text-slate-600 hover:text-red-600 hover:bg-red-50"
      title="Grabar mensaje de voz"
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
}