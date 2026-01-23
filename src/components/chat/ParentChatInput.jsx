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
  const [pendingImages, setPendingImages] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  const handleSend = useCallback(async () => {
    if (!localText.trim() && localAttachments.length === 0 && pendingImages.length === 0) return;
    
    let allAttachments = [...localAttachments];
    
    // Subir imágenes pendientes AHORA (antes de enviar)
    if (pendingImages.length > 0) {
      const dataTransfer = new DataTransfer();
      pendingImages.forEach(file => dataTransfer.items.add(file));
      
      const evt = new Event('change', { bubbles: true });
      Object.defineProperty(evt, 'target', {
        writable: false,
        value: { files: dataTransfer.files }
      });
      
      const uploadedImages = await onFileUpload(evt);
      if (uploadedImages && uploadedImages.length > 0) {
        allAttachments = [...allAttachments, ...uploadedImages];
      }
    }
    
    onSendMessage({
      mensaje: localText,
      adjuntos: allAttachments
    });
    
    setLocalText("");
    setLocalAttachments([]);
    setPendingImages([]);
  }, [localText, localAttachments, pendingImages, onSendMessage, onFileUpload]);

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

  const handleImagePreviewConfirm = useCallback(() => {
    if (!previewFile) return;

    // Solo agregar a pendingImages, SIN subir todavía
    setPendingImages(prev => [...prev, previewFile]);
    setImagePreview(null);
    setPreviewFile(null);
  }, [previewFile]);

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

      {!imagePreview && (
        <>
          {/* Imágenes pendientes (preview confirmado pero no subidas) */}
          {pendingImages.length > 0 && (
            <div className="mb-2 grid grid-cols-3 gap-2">
              {pendingImages.map((file, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={file.name}
                    className="w-20 h-20 rounded object-cover bg-slate-200"
                  />
                  <button 
                    onClick={() => setPendingImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
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
          disabled={(!localText.trim() && localAttachments.length === 0 && pendingImages.length === 0) || uploading}
          className="h-10 w-10 p-0 flex-shrink-0 rounded-full"
        >
          <Send className="w-5 h-5" />
        </Button>
          </div>
        </>
      )}
    </div>
  );
}