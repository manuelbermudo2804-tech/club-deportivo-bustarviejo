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

      {/* Audio pendiente */}
      {audioBlob && (
        <div className="mb-2 flex items-center gap-2 bg-green-50 rounded-lg p-3 border-2 border-green-300">
          <Mic className="w-5 h-5 text-green-600" />
          <span className="text-sm flex-1 font-medium">🎤 Audio {audioDuration}s</span>
          <Button size="sm" onClick={togglePlayAudio} className="h-8 bg-green-600">
            {playingAudio === 'pending' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={cancelAudio} className="h-8">✕</Button>
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

        {/* Micrófono */}
        <Button
          size="icon"
          onClick={isRecording ? stopRecording : startRecording}
          className="h-11 w-11 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full"
          disabled={audioBlob || isLoading}
        >
          {isRecording ? <Pause className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

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