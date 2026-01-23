import React, { useState, useCallback } from "react";
import WhatsAppInputBar from "./WhatsAppInputBar";
import { useAudioRecording } from "./useAudioRecording";

export default function CoordinatorChatInput({
  onSendMessage,
  onFileUpload,
  onCameraCapture,
  onLocationClick,
  onPollClick,
  onSendAudio,
  uploading,
  placeholder = "Mensaje"
}) {
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);

  const {
    isRecording,
    audioBlob,
    audioDuration,
    isUploading,
    startRecording,
    stopRecording,
    cancelAudio,
    uploadAudio
  } = useAudioRecording();

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
    if (audioBlob) {
      const audioData = await uploadAudio();
      if (audioData) {
        messageData.audio_url = audioData.audio_url;
        messageData.audio_duracion = audioData.audio_duracion;
      } else {
        return;
      }
    }
    
    onSendMessage(messageData);
    
    setLocalText("");
    setLocalAttachments([]);
    cancelAudio();
  }, [localText, localAttachments, audioBlob, onSendMessage, uploadAudio, cancelAudio]);

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
      showExercise={false}
      placeholder={placeholder}
      onTyping={null}
    />
  );
}