import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * Hook para manejar grabación y reproducción de audio en chats
 * Centraliza toda la lógica de audio en un solo lugar
 */
export function useAudioMessage() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [playingAudioUrl, setPlayingAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const maxTimerRef = useRef(null);

  // Iniciar grabación
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(blob);
        setRecordedDuration(duration);
        stream.getTracks().forEach(track => track.stop());
        try { if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; } } catch {}
      };

      mediaRecorder.start();
      setIsRecording(true);
      try { maxTimerRef.current = setTimeout(() => { try { mediaRecorderRef.current?.stop(); } catch {} }, 60000); } catch {}
    } catch (error) {
      console.error('Error accediendo al micrófono:', error);
      toast.error('No se pudo acceder al micrófono');
      setIsRecording(false);
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

  // Cancelar grabación
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordedAudio(null);
      setRecordedDuration(0);
    }
    try { if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; } } catch {}
  }, []);

  // Subir audio a la plataforma
  const uploadAudio = useCallback(async () => {
    if (!recordedAudio) return null;

    try {
      const file = new File(
        [recordedAudio],
        `audio_${Date.now()}.webm`,
        { type: 'audio/webm' }
      );
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return { audio_url: file_url, audio_duration: recordedDuration };
    } catch (error) {
      console.error('Error subiendo audio:', error);
      toast.error('Error al subir el audio');
      return null;
    }
  }, [recordedAudio, recordedDuration]);

  // Reproducir audio
  const playAudio = useCallback((audioUrl) => {
    if (!audioRef.current) return;

    try {
      if (playingAudioUrl === audioUrl) {
        // Pausar
        audioRef.current.pause();
        setPlayingAudioUrl(null);
      } else {
        // Reproducir
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudioUrl(audioUrl);
      }
    } catch (error) {
      console.error('Error reproduciendo audio:', error);
      toast.error('Error al reproducir el audio');
      setPlayingAudioUrl(null);
    }
  }, [playingAudioUrl]);

  // Detener reproducción
  const stopPlayingAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingAudioUrl(null);
    }
  }, []);

  return {
    // Estado
    isRecording,
    recordedAudio,
    recordedDuration,
    playingAudioUrl,
    audioRef,

    // Métodos
    startRecording,
    stopRecording,
    cancelRecording,
    uploadAudio,
    playAudio,
    stopPlayingAudio
  };
}