import React, { useState, useCallback, memo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Smile } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import AudioRecordButton from "./AudioRecordButton";

const CoordinatorChatInput = memo(function CoordinatorChatInput({
  onSendMessage,
  uploading,
  placeholder = "Mensaje",
  editingText = "",
  onCancelEdit
}) {
  const [localText, setLocalText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [audioExpanded, setAudioExpanded] = useState(false);

  // Cargar texto del mensaje a editar
  React.useEffect(() => {
    if (editingText) setLocalText(editingText);
  }, [editingText]);

  const handleSend = useCallback(() => {
    if (!localText.trim()) return;
    
    onSendMessage({
      mensaje: localText,
      adjuntos: [],
      audio_url: null,
      audio_duracion: 0
    });
    
    setLocalText("");
  }, [localText, onSendMessage]);

  const handleAudioSent = useCallback(async (audioData) => {
    onSendMessage({
      mensaje: "",
      adjuntos: [],
      audio_url: audioData.audio_url,
      audio_duracion: audioData.audio_duracion
    });
  }, [onSendMessage]);

  return (
    <div className="border-t bg-white flex-shrink-0 p-2">
      {editingText && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-2 text-xs">
          <span className="text-amber-800">✏️ Editando mensaje</span>
          <button
            onClick={() => { setLocalText(""); onCancelEdit?.(); }}
            className="text-amber-700 hover:text-amber-900 font-medium"
          >
            Cancelar
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        {audioExpanded ? (
          <AudioRecordButton 
            onAudioSent={handleAudioSent}
            disabled={uploading}
            expanded={true}
            onExpandedChange={setAudioExpanded}
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
                    setLocalText(prev => prev + emoji);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}

            <Textarea
              value={localText}
              onChange={(e) => {
                setLocalText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 6*24) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={placeholder}
              className="flex-1 min-h-[44px] max-h-[144px] resize-none text-sm rounded-3xl"
              disabled={uploading}
              rows={1}
            />

            {localText.trim() ? (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={uploading}
                className="h-11 w-11 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full"
              >
                <Send className="w-5 h-5" />
              </Button>
            ) : (
              <AudioRecordButton 
                onAudioSent={handleAudioSent}
                disabled={uploading}
                expanded={false}
                onExpandedChange={setAudioExpanded}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default CoordinatorChatInput;