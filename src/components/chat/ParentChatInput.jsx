import React, { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import ImagePreviewModal from "./ImagePreviewModal";

export default function ParentChatInput({
  onSendMessage,
  onFileUpload,
  uploading,
  placeholder = "Escribe tu mensaje..."
}) {
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  const handleSend = useCallback(() => {
    if (!localText.trim() && localAttachments.length === 0) return;
    
    onSendMessage({
      mensaje: localText,
      adjuntos: [...localAttachments]
    });
    
    setLocalText("");
    setLocalAttachments([]);
  }, [localText, localAttachments, onSendMessage]);

  const handleFileUploadLocal = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const otherFiles = files.filter(f => !f.type.startsWith('image/'));

    // Mostrar preview del PRIMER imagen
    if (imageFiles.length > 0) {
      const url = URL.createObjectURL(imageFiles[0]);
      setImagePreview(url);
      setPreviewFile(imageFiles[0]);
      
      // Pasar otros archivos al handler original
      if (otherFiles.length > 0) {
        const evt = new Event('change', { bubbles: true });
        Object.defineProperty(evt, 'target', {
          writable: false,
          value: { files: otherFiles }
        });
        onFileUpload(evt);
      }
      
      // Resetear input
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else if (otherFiles.length > 0) {
      // Solo otros archivos, sin imágenes
      onFileUpload(e);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [onFileUpload]);

  const handleImagePreviewConfirm = useCallback(async () => {
    if (!previewFile) return;

    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(previewFile);
      
      const evt = new Event('change', { bubbles: true });
      Object.defineProperty(evt, 'target', {
        writable: false,
        value: { files: dataTransfer.files }
      });

      const result = await onFileUpload(evt);
      if (result && result.length > 0) {
        setLocalAttachments(prev => [...prev, ...result]);
      }

      setImagePreview(null);
      setPreviewFile(null);
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      setImagePreview(null);
      setPreviewFile(null);
    }
  }, [previewFile, onFileUpload]);

  const handleImagePreviewCancel = useCallback(() => {
    setImagePreview(null);
    setPreviewFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="p-3 bg-white border-t flex-shrink-0">
      {/* Modal de preview de imagen */}
      {imagePreview && (
        <ImagePreviewModal
          imageFile={previewFile}
          imageUrl={imagePreview}
          onConfirm={handleImagePreviewConfirm}
          onCancel={handleImagePreviewCancel}
          uploading={uploading}
        />
      )}

      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        accept="*/*"
        className="hidden" 
        onChange={handleFileUploadLocal} 
        disabled={uploading} 
      />
      
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={handleFileUploadLocal}
        disabled={uploading} 
      />

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

        <Button
          size="icon"
          variant="ghost"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="h-10 w-10 flex-shrink-0"
        >
          <ImageIcon className="w-5 h-5 text-slate-600" />
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
      )}
    </div>
  );
}