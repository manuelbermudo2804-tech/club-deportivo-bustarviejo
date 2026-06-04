import React, { useState, useCallback, memo, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import AudioRecordButton from "./AudioRecordButton";

const CoordinatorChatInput = memo(function CoordinatorChatInput({
  onSendMessage,
  onFileUpload,
  uploading,
  placeholder = "Mensaje",
  editingText = "",
  onCancelEdit
}) {
  const [localText, setLocalText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [audioExpanded, setAudioExpanded] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Cargar texto del mensaje a editar
  React.useEffect(() => {
    if (editingText) setLocalText(editingText);
  }, [editingText]);

  const handleSend = useCallback(() => {
    if (!localText.trim() && pendingAttachments.length === 0) return;
    
    onSendMessage({
      mensaje: localText.trim() || (pendingAttachments.length > 0 ? "📎 Archivo adjunto" : ""),
      adjuntos: pendingAttachments,
      audio_url: null,
      audio_duracion: 0
    });
    
    setLocalText("");
    setPendingAttachments([]);
  }, [localText, pendingAttachments, onSendMessage]);

  const handleAttachClick = async (e) => {
    if (!onFileUpload) return;
    const uploaded = await onFileUpload(e);
    if (uploaded && uploaded.length > 0) {
      setPendingAttachments(prev => [...prev, ...uploaded]);
    }
    // Reset input so the same file can be re-selected later
    if (e.target) e.target.value = "";
  };

  const removeAttachment = (idx) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
  };

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

      {/* Adjuntos pendientes (preview antes de enviar) */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {pendingAttachments.map((file, idx) => (
            <div key={idx} className="relative group bg-slate-100 rounded-lg p-2 flex items-center gap-2 text-xs max-w-[180px]">
              {file.tipo?.startsWith('image/') ? (
                <img src={file.url} alt={file.nombre} className="w-8 h-8 rounded object-cover" />
              ) : (
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
              )}
              <span className="truncate flex-1">{file.nombre}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="text-slate-500 hover:text-red-600 flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inputs ocultos para selección de archivos */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAttachClick}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAttachClick}
      />

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

            {onFileUpload && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => imageInputRef.current?.click()}
                  className="h-9 w-9 p-0 flex-shrink-0"
                  disabled={uploading}
                  title="Enviar imagen"
                >
                  <ImageIcon className="w-5 h-5 text-slate-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 w-9 p-0 flex-shrink-0"
                  disabled={uploading}
                  title="Adjuntar archivo"
                >
                  <Paperclip className="w-5 h-5 text-slate-600" />
                </Button>
              </>
            )}

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

            {localText.trim() || pendingAttachments.length > 0 ? (
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