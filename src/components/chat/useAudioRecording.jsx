import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * Hook centralizado para grabación de audio en chats
 * Maneja todo el ciclo: grabar -> previsualizar -> subir -> enviar
 */
export function useAudioRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(null);
  const maxTimerRef = useRef(null);

  // Iniciar grabación
  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Tu navegador no soporta grabación de audio');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioDuration(duration);
        stream.getTracks().forEach(track => track.stop());
        try { if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; } } catch {}
      };

      mediaRecorder.start();
      setIsRecording(true);
      try { maxTimerRef.current = setTimeout(() => { try { mediaRecorderRef.current?.stop(); } catch {} }, 60000); } catch {}
      toast.success('🎤 Grabando...', { duration: 1000 });
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        toast.error('Debes permitir el acceso al micrófono');
      } else {
        toast.error('Error al acceder al micrófono');
      }
    }
  }, []);

  // Detener grabación
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    try { if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; } } catch {}
  }, [isRecording]);

  // Cancelar grabación y descartar audio
  const cancelAudio = useCallback(() => {
    setAudioBlob(null);
    setAudioDuration(0);
    try { if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; } } catch {}
  }, []);

  // Subir audio a la plataforma
  const uploadAudio = useCallback(async () => {
    if (!audioBlob) return null;

    setIsUploading(true);
    try {
      const file = new File(
        [audioBlob],
        `audio_${Date.now()}.webm`,
        { type: 'audio/webm' }
      );
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      return {
        audio_url: file_url,
        audio_duracion: audioDuration
      };
    } catch (error) {
      console.error('Error subiendo audio:', error);
      toast.error('Error al subir el audio');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [audioBlob, audioDuration]);

  return {
    // Estado
    isRecording,
    audioBlob,
    audioDuration,
    isUploading,

    // Métodos
    startRecording,
    stopRecording,
    cancelAudio,
    uploadAudio
  };
}