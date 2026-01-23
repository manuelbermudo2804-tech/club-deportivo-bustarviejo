import React, { useState, useCallback } from "react";
import WhatsAppInputBar from "./WhatsAppInputBar";

export default function CoachChatInput({
  onSendMessage,
  onFileUpload,
  onCameraCapture,
  onLocationClick,
  onPollClick,
  onExerciseClick,
  onSendAudio,
  uploading,
  placeholder = "Mensaje"
}) {
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);

  const handleSend = useCallback(async (textFromInput) => {
    const text = textFromInput || localText;
    
    if (!text.trim() && localAttachments.length === 0 && !audioBlob) return;
    
    const messageData = {
      mensaje: text,
      adjuntos: [...localAttachments],
      audio_url: null,
      audio_duracion: 0
    };

    // Si hay audio pendiente, subirlo primero
    if (audioBlob && onSendAudio) {
      try {
        const audioData = await onSendAudio(audioBlob, audioDuration);
        if (audioData) {
          messageData.audio_url = audioData.audio_url;
          messageData.audio_duracion = audioData.audio_duracion;
        }
      } catch (error) {
        console.error('Error enviando audio:', error);
        return;
      }
    }
    
    onSendMessage(messageData);
    
    setLocalText("");
    setLocalAttachments([]);
    setAudioBlob(null);
    setAudioDuration(0);
  }, [localText, localAttachments, audioBlob, audioDuration, onSendMessage, onSendAudio]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      const startTime = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioDuration(duration);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error('Error recording:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  const sendAudioWrapper = useCallback(async (blob, duration) => {
    if (blob && onSendAudio) {
      return await onSendAudio(blob, duration);
    }
  }, [onSendAudio]);

  const handleFileUploadLocal = useCallback(async (e) => {
    const result = await onFileUpload(e);
    if (result && result.length > 0) {
      setLocalAttachments(prev => [...prev, ...result]);
    }
  }, [onFileUpload]);

  const handleCameraCaptureLocal = useCallback(async (e) => {
    const result = await onCameraCapture(e);
    if (result) {
      setLocalAttachments(prev => [...prev, result]);
    }
  }, [onCameraCapture]);

  return (
    <WhatsAppInputBar
      messageText={localText}
      setMessageText={setLocalText}
      onSend={handleSend}
      attachments={localAttachments}
      setAttachments={setLocalAttachments}
      recording={recording}
      audioBlob={audioBlob}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onSendAudio={sendAudioWrapper}
      onCancelAudio={() => { setAudioBlob(null); setAudioDuration(0); }}
      audioDuration={audioDuration}
      uploading={uploading}
      onFileUpload={handleFileUploadLocal}
      onCameraCapture={handleCameraCaptureLocal}
      onLocationClick={onLocationClick}
      onPollClick={onPollClick}
      onExerciseClick={onExerciseClick}
      showExercise={true}
      placeholder={placeholder}
      onTyping={null}
    />
  );
}