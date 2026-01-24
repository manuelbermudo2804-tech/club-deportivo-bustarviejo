import React, { useState, useRef, memo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Smile, Mic, Play, Pause, X } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import AudioRecordingBar from "./AudioRecordingBar";
import { useAudioRecording } from "./useAudioRecording";

const ParentChatInput = memo(function ParentChatInput({ onSendMessage, uploading, placeholder = "Mensaje" }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
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

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [playingLocalAudio, setPlayingLocalAudio] = useState(false);

  const handleSend = async () => {
    if (!currentMessage.trim() && !audioBlob) return;

    const messageData = {
      mensaje: currentMessage,
      adjuntos: [],
      audio_url: null,
      audio_duracion: 0
    };

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
    setCurrentMessage("");
    cancelAudio();
  };

  const playLocalAudio = () => {
    if (!audioBlob || !audioRef.current) return;
    
    try {
      if (playingLocalAudio) {
        audioRef.current.pause();
        setPlayingLocalAudio(false);
      } else {
        audioRef.current.src = URL.createObjectURL(audioBlob);
        audioRef.current.play();
        setPlayingLocalAudio(true);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setPlayingLocalAudio(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white flex-shrink-0">
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingLocalAudio(false)}
        onError={() => setPlayingLocalAudio(false)}
      />

      {(isRecording || audioBlob) && (
        <AudioRecordingBar
          isRecording={isRecording}
          audioBlob={audioBlob}
          audioDuration={audioDuration}
          onStop={stopRecording}
          onCancel={cancelAudio}
          onPlay={playLocalAudio}
          playing={playingLocalAudio}
        />
      )}

      <div className="p-2 flex items-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="h-9 w-9 p-0 flex-shrink-0"
          disabled={uploading || isUploading || isRecording}
        >
          <Smile className="w-5 h-5 text-slate-600" />
        </Button>

        {showEmojiPicker && (
          <div className="absolute bottom-16 left-4 z-50">
            <EmojiPicker 
              onEmojiSelect={(emoji) => {
                setCurrentMessage(prev => prev + emoji);
                setShowEmojiPicker(false);
                textareaRef.current?.focus();
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}

        <Textarea
          ref={textareaRef}
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-h-[36px] max-h-[120px] resize-none text-sm"
          disabled={uploading || isUploading || isRecording}
          rows={1}
        />

        {!audioBlob && !currentMessage.trim() ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={uploading || isUploading}
            className={`h-9 w-9 p-0 flex-shrink-0 ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
          >
            <Mic className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSend}
            disabled={uploading || isUploading || isRecording || (!currentMessage.trim() && !audioBlob)}
            className="h-9 w-9 p-0 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

export default ParentChatInput;