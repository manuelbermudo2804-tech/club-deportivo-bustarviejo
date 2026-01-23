import React, { useState, useCallback } from "react";
import WhatsAppInputBar from "./WhatsAppInputBar";

export default function CoachChatInput({
  onSendMessage,
  onFileUpload,
  onCameraCapture,
  onLocationClick,
  onPollClick,
  onExerciseClick,
  uploading,
  placeholder = "Mensaje"
}) {
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);

  const handleSend = useCallback((textFromInput) => {
    const text = textFromInput || localText;
    
    if (!text.trim() && localAttachments.length === 0) return;
    
    onSendMessage({
      mensaje: text,
      adjuntos: [...localAttachments]
    });
    
    setLocalText("");
    setLocalAttachments([]);
  }, [localText, localAttachments, onSendMessage]);

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
      recording={false}
      audioBlob={null}
      onStartRecording={() => {}}
      onStopRecording={() => {}}
      onSendAudio={() => {}}
      onCancelAudio={() => {}}
      audioDuration={0}
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