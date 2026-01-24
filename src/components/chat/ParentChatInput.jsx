import React, { useState, useRef, memo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Smile } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import WhatsAppAudioButton from "./WhatsAppAudioButton";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ParentChatInput = memo(function ParentChatInput({ onSendMessage, uploading, placeholder = "Mensaje" }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const textareaRef = useRef(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSend = async () => {
    if (!currentMessage.trim()) return;

    const messageData = {
      mensaje: currentMessage,
      adjuntos: [],
      audio_url: null,
      audio_duracion: 0
    };

    onSendMessage(messageData);
    setCurrentMessage("");
  };

  const handleAudioSent = async (audioBlob, duration) => {
    try {
      // Subir audio
      const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Enviar mensaje con audio
      const messageData = {
        mensaje: "",
        adjuntos: [],
        audio_url: file_url,
        audio_duracion: duration
      };

      onSendMessage(messageData);
      toast.success('🎤 Audio enviado');
    } catch (error) {
      console.error('Error subiendo audio:', error);
      toast.error('Error al enviar audio');
      throw error;
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
      <div className="p-2 flex items-end gap-2">
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
          disabled={uploading}
          rows={1}
        />

        {!currentMessage.trim() ? (
          <WhatsAppAudioButton 
            onAudioSent={handleAudioSent}
            disabled={uploading}
          />
        ) : (
          <Button
            size="sm"
            onClick={handleSend}
            disabled={uploading || !currentMessage.trim()}
            className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

export default ParentChatInput;