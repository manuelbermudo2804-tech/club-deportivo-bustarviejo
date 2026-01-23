import React, { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import ImageMessageUpload from "./ImageMessageUpload";

export default function ParentChatInput({
  onSendMessage,
  onFileUpload,
  uploading,
  placeholder = "Escribe tu mensaje..."
}) {
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const fileInputRef = React.useRef(null);

  const handleSend = useCallback(() => {
    if (!localText.trim() && localAttachments.length === 0 && uploadedImages.length === 0) return;
    
    onSendMessage({
      mensaje: localText,
      adjuntos: [...localAttachments, ...uploadedImages]
    });
    
    setLocalText("");
    setLocalAttachments([]);
    setUploadedImages([]);
    setPendingImages([]);
  }, [localText, localAttachments, uploadedImages, onSendMessage]);

  const handleFileUploadLocal = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const otherFiles = files.filter(f => !f.type.startsWith('image/'));

    // Imágenes: preview inmediato + subida background
    if (imageFiles.length > 0) {
      setPendingImages(prev => [...prev, ...imageFiles]);
    }

    // Otros archivos: subida tradicional
    if (otherFiles.length > 0) {
      const result = await onFileUpload({ target: { files: otherFiles } });
      if (result && result.length > 0) {
        setLocalAttachments(prev => [...prev, ...result]);
      }
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

      {/* Previews de imágenes subiendo */}
      {pendingImages.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2">
          {pendingImages.map((file, idx) => (
            <ImageMessageUpload
              key={idx}
              file={file}
              onUploadComplete={(uploaded) => {
                setUploadedImages(prev => [...prev, uploaded]);
                setPendingImages(prev => prev.filter((_, i) => i !== idx));
              }}
              onRemove={() => setPendingImages(prev => prev.filter((_, i) => i !== idx))}
            />
          ))}
        </div>
      )}

      {/* Archivos no-imagen ya subidos */}
      {localAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {localAttachments.map((file, idx) => (
            <div key={idx} className="bg-slate-100 rounded px-2 py-1 text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{file.nombre}</span>
              <button onClick={() => setLocalAttachments(localAttachments.filter((_, i) => i !== idx))}>
                <X className="w-3 h-3" />
              </button>
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
          disabled={(!localText.trim() && localAttachments.length === 0 && uploadedImages.length === 0) || uploading}
          className="h-10 w-10 p-0 flex-shrink-0 rounded-full"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}