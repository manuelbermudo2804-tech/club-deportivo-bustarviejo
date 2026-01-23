import React, { useState, useRef, useCallback } from "react";
import WhatsAppInputBar from "./WhatsAppInputBar";

/**
 * Input de chat 100% aislado e independiente
 * NO se re-renderiza cuando llegan mensajes
 * NO depende del estado del chat principal
 * Gestiona su propio estado local exclusivamente
 */
export default function StaffChatInput({
  onSendMessage,
  onFileUpload,
  onCameraCapture,
  onLocationClick,
  onPollClick,
  onExerciseClick,
  uploading,
  showExercise = false,
  placeholder = "Escribe un mensaje..."
}) {
  // Estado 100% local - nunca se sobrescribe desde fuera
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);

  // Enviar mensaje - llama al callback del padre y limpia
  const handleSend = useCallback((textFromInput) => {
    const text = textFromInput || localText;
    
    if (!text.trim() && localAttachments.length === 0) return;
    
    // Pasar datos al padre
    onSendMessage({
      mensaje: text,
      adjuntos: [...localAttachments]
    });
    
    // Limpiar estado local inmediatamente
    setLocalText("");
    setLocalAttachments([]);
  }, [localText, localAttachments, onSendMessage]);

  // Upload de archivos - gestiona localmente
  const handleFileUploadLocal = useCallback(async (e) => {
    const result = await onFileUpload(e);
    if (result && result.length > 0) {
      setLocalAttachments(prev => [...prev, ...result]);
    }
  }, [onFileUpload]);

  // Captura de cámara - gestiona localmente
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
      showExercise={showExercise}
      placeholder={placeholder}
      onTyping={null}
    />
  );
}