import React, { useState, useRef, memo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Smile } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import AudioRecordButton from "./AudioRecordButton";

const ParentChatInput = memo(function ParentChatInput({ onSendMessage, uploading, placeholder = "Mensaje" }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const textareaRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAudioMode, setIsAudioMode] = useState(false);

  const handleSend = async () => {
    if (!currentMessage.trim()) return;
    onSendMessage({
      mensaje: currentMessage,
      adjuntos: [],
      audio_url: null,
      audio_duracion: 0
    });
    setCurrentMessage("");
  };

  const handleAudioSent = async (audioData) => {
    onSendMessage({
      mensaje: "",
      adjuntos: [],
      audio_url: audioData.audio_url,
      audio_duracion: audioData.audio_duracion
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white flex-shrink-0">
      <div className="p-2 flex items-end gap-2">
        {isAudioMode ? (
          <AudioRecordButton 
            onAudioSent={handleAudioSent}
            disabled={uploading}
            onPreviewChange={setIsAudioMode}
          />
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="h-9 w-9 p-0 flex-shrink-0"
              disabled={uploading}
            >
              <Smile className="w-5 h-5 text-slate-600" />
            </Button>

            {showEmojiPicker && (
              <div className="absolute bottom-16 left-4 z-50">
                <EmojiPicker 
                  autoOpen
                  showInlineButton={false}
                  onEmojiSelect={(emoji) => {
                    setCurrentMessage(prev => prev + emoji);
                    textareaRef.current?.focus();
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}

            <Textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => {
                setCurrentMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 6*24) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 min-h-[44px] max-h-[144px] resize-none text-sm rounded-3xl"
              disabled={uploading}
              rows={1}
            />

            {!currentMessage.trim() && (
              <AudioRecordButton 
                onAudioSent={handleAudioSent}
                disabled={uploading}
                onPreviewChange={setIsAudioMode}
              />
            )}
            {currentMessage.trim() && (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={uploading || !currentMessage.trim()}
                className="h-11 w-11 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default ParentChatInput;