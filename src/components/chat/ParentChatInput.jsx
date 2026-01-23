import React, { useState, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mic, Pause, X, Play, Smile } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import { toast } from "sonner";
import { useAudioRecording } from "./useAudioRecording";
import AudioRecordingBar from "./AudioRecordingBar";

export default function ParentChatInput({
  onSendMessage,
  uploading,
  placeholder = "Escribe tu mensaje...",
  onSendAudio
}) {
  const [localText, setLocalText] = useState("");
  const [playingAudio, setPlayingAudio] = useState(null);
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
  
  const textareaRef = useRef(null);
  const audioRef = useRef(null);

  const handleSend = useCallback(async () => {
    if (!localText.trim() && !audioBlob) return;
    
    const messageData = {
      mensaje: localText,
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
    cancelAudio();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [localText, audioBlob, onSendMessage, uploadAudio, cancelAudio]);



  const togglePlayAudio = async () => {
    if (!audioBlob) return;

    try {
      if (playingAudio === 'pending') {
        audioRef.current?.pause();
        setPlayingAudio(null);
      } else {
        const url = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = url;
          await audioRef.current.play();
          setPlayingAudio('pending');
        }
      }
    } catch (error) {
      toast.error("Error al reproducir el audio");
      setPlayingAudio(null);
    }
  };

  const isLoading = uploading || isUploading;

  const handleTextChange = (e) => {
    const newValue = e.target.value;
    setLocalText(newValue);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="p-2 bg-white border-t flex-shrink-0">
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      {/* Audio Recording Bar - estilo WhatsApp */}
      {(isRecording || audioBlob) && (
        <div className="mb-2">
          <AudioRecordingBar
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            audioBlob={audioBlob}
            audioDuration={audioDuration}
            onSendAudio={handleSend}
            onCancelAudio={cancelAudio}
            uploading={isUploading}
            disabled={isUploading}
          />
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 items-end">
        {/* Emoji picker */}
        <EmojiPicker 
          onEmojiSelect={(emoji) => {
            const newValue = localText + emoji;
            setLocalText(newValue);
          }}
          messageText={localText}
        />

        {/* Input */}
        <div className="flex-1 bg-white border rounded-3xl px-4 py-2 min-h-[44px] flex items-center">
          <textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={localText}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="w-full resize-none outline-none text-sm bg-transparent max-h-[120px] overflow-y-auto"
            rows={1}
            style={{ minHeight: '24px' }}
          />
        </div>

        {/* Micrófono - componente mejorado */}
        <AudioRecordingBar
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          audioBlob={audioBlob}
          audioDuration={audioDuration}
          onSendAudio={handleSend}
          onCancelAudio={cancelAudio}
          uploading={isLoading}
          disabled={audioBlob || isLoading}
        />

        {/* Enviar */}
        <Button 
          onClick={handleSend} 
          disabled={(!localText.trim() && !audioBlob) || isLoading}
          size="icon"
          className="h-11 w-11 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}