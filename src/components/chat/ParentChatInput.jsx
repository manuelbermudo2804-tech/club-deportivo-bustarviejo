import React, { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";

export default function ParentChatInput({
  onSendMessage,
  onFileUpload,
  uploading,
  placeholder = "Escribe tu mensaje..."
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

  const handleFileUploadLocal = useCallback(async (e) => {
    const result = await onFileUpload(e);
    if (result && result.length > 0) {
      setLocalAttachments(prev => [...prev, ...result]);
    }
  }, [onFileUpload]);

  return (
    <div className="p-3 bg-white border-t flex-shrink-0">
      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        accept="image/*,application/pdf,.doc,.docx"
        className="hidden" 
        onChange={handleFileUploadLocal} 
        disabled={uploading} 
      />

      {localAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {localAttachments.map((file, idx) => (
            <div key={idx} className="relative">
              {file.tipo?.startsWith('image/') ? (
                <div className="relative">
                  <img src={file.url} alt="" className="w-16 h-16 object-cover rounded" />
                  <button 
                    onClick={() => setLocalAttachments(localAttachments.filter((_, i) => i !== idx))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="bg-slate-100 rounded px-2 py-1 text-xs flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{file.nombre}</span>
                  <button onClick={() => setLocalAttachments(localAttachments.filter((_, i) => i !== idx))}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-10 w-10 flex-shrink-0"
        >
          <Paperclip className="w-5 h-5 text-slate-600" />
        </Button>

        <Textarea
          placeholder={placeholder}
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 min-h-[40px] max-h-32 resize-none"
          rows={1}
        />

        <Button 
          onClick={handleSend} 
          disabled={(!localText.trim() && localAttachments.length === 0) || uploading}
          className="h-10 w-10 p-0 flex-shrink-0 rounded-full"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}