import React, { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Edit, X, FileText } from "lucide-react";
import EmojiPicker from "./EmojiPicker";

export default function AdminChatInput({
  onSendMessage,
  onSendInternalNote,
  onFileUpload,
  uploading
}) {
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);
  const fileInputRef = React.useRef(null);

  const handleSend = useCallback(() => {
    if (!localText.trim() && localAttachments.length === 0) return;
    
    onSendMessage({
      mensaje: localText,
      adjuntos: [...localAttachments]
    });
    
    setLocalText("");
    setLocalAttachments([]);
  }, [localText, localAttachments, onSendMessage]);

  const handleSendNote = useCallback(() => {
    if (!localText.trim()) return;
    
    onSendInternalNote({
      mensaje: localText,
      adjuntos: [...localAttachments]
    });
    
    setLocalText("");
    setLocalAttachments([]);
  }, [localText, localAttachments, onSendInternalNote]);

  const handleFileUploadLocal = useCallback(async (e) => {
    const result = await onFileUpload(e);
    if (result && result.length > 0) {
      setLocalAttachments(prev => [...prev, ...result]);
    }
  }, [onFileUpload]);

  return (
    <div className="p-4 bg-white border-t flex-shrink-0 space-y-2">
      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        className="hidden" 
        onChange={handleFileUploadLocal} 
        disabled={uploading} 
      />

      {localAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {localAttachments.map((file, idx) => (
            <div key={idx} className="bg-slate-100 rounded px-3 py-1 text-xs flex items-center gap-2">
              <FileText className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{file.nombre}</span>
              <button onClick={() => setLocalAttachments(localAttachments.filter((_, i) => i !== idx))}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex gap-1 justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-8 px-3 text-xs"
          >
            <Paperclip className="w-3 h-3 mr-1" />
            Archivo
          </Button>
          <Button 
            onClick={handleSendNote}
            disabled={!localText.trim()}
            size="sm"
            variant="outline"
            className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 h-8 px-3 text-xs"
            title="Nota interna (solo admins)"
          >
            <Edit className="w-3 h-3 mr-1" />
            Nota interna
          </Button>
        </div>

        <div className="flex gap-2 items-end">
          <EmojiPicker 
            onEmojiSelect={(emoji) => setLocalText(prev => prev + emoji)}
            messageText={localText}
          />
          
          <Textarea
            placeholder="Escribe tu mensaje..."
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 min-h-[44px] max-h-32 resize-none text-sm py-3 px-3"
            rows={1}
          />

          <Button 
            onClick={handleSend} 
            disabled={!localText.trim() && localAttachments.length === 0}
            className="bg-red-600 hover:bg-red-700 h-11 w-11 p-0 flex-shrink-0 rounded-full"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center">
        💡 Usa el botón <Edit className="w-3 h-3 inline" /> para notas internas (solo visibles para admins)
      </p>
    </div>
  );
}