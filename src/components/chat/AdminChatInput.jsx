import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, X, FileText, StickyNote, Smile } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import AudioRecordButton from "./AudioRecordButton";

export default function AdminChatInput({ onSendMessage, onSendInternalNote, uploading }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAudioMode, setIsAudioMode] = useState(false);


  const handleSend = async () => {
    if (!currentMessage.trim() && attachments.length === 0) return;

    const messageData = {
      mensaje: currentMessage,
      adjuntos: [...attachments],
      audio_url: null,
      audio_duracion: 0
    };

    onSendMessage(messageData);
    setCurrentMessage("");
    setAttachments([]);
  };

  const handleSendInternalNote = async () => {
    if (!currentMessage.trim()) return;

    const messageData = {
      mensaje: currentMessage,
      adjuntos: [...attachments]
    };

    onSendInternalNote(messageData);
    setCurrentMessage("");
    setAttachments([]);
  };

  const handleFileSelect = (e) => {
    // Dummy - las subidas se manejan desde el parent
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white flex-shrink-0 p-3">


      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-slate-100 rounded-lg p-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <span className="text-xs truncate max-w-[120px]">{file.nombre}</span>
              <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {isAudioMode ? (
          <AudioRecordButton
            onAudioSent={async ({ audio_url, audio_duracion }) => {
              onSendMessage({
                mensaje: "",
                adjuntos: [...attachments],
                audio_url,
                audio_duracion
              });
              setAttachments([]);
            }}
            disabled={uploading}
            onPreviewChange={setIsAudioMode}
            autoStart
          />
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="h-9 w-9 p-0"
              disabled={uploading}
            >
              <Smile className="w-5 h-5" />
            </Button>

            {showEmojiPicker && (
              <div className="absolute bottom-16 left-4 z-50">
                <EmojiPicker 
                  autoOpen
                  showInlineButton={false}
                  onEmojiSelect={(emoji) => {
                    setCurrentMessage(prev => prev + emoji);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}

            <Textarea
              value={currentMessage}
              onChange={(e) => {
                setCurrentMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 6*24) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="flex-1 min-h-[44px] max-h-[144px] resize-none text-sm"
              disabled={uploading}
              rows={1}
            />

            {!currentMessage.trim() ? (
              <AudioRecordButton
                onAudioSent={async ({ audio_url, audio_duracion }) => {
                  onSendMessage({
                    mensaje: "",
                    adjuntos: [...attachments],
                    audio_url,
                    audio_duracion
                  });
                  setAttachments([]);
                }}
                disabled={uploading}
                onPreviewChange={setIsAudioMode}
              />
            ) : (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendInternalNote}
                  disabled={uploading || !currentMessage.trim()}
                  className="h-9"
                  title="Enviar como nota interna (solo admins)"
                >
                  <StickyNote className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={uploading || !currentMessage.trim()}
                  className="h-9 bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}