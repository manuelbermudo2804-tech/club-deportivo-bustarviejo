import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Smile, Paperclip, Camera, MapPin, BarChart3, Dumbbell, X, FileText } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import ImagePreviewModal from "./ImagePreviewModal";
import AudioRecordButton from "./AudioRecordButton";



// Menú "+" tipo WhatsApp
function AttachmentMenu({ 
  onFileClick, 
  onCameraClick, 
  onLocationClick, 
  onPollClick, 
  onExerciseClick,
  showExercise = false,
  uploading 
}) {
  const [open, setOpen] = useState(false);

  const options = [
    { icon: Paperclip, label: "Archivos", onClick: onFileClick, color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Camera, label: "Cámara", onClick: onCameraClick, color: "text-green-600", bg: "bg-green-50" },
    { icon: MapPin, label: "Ubicación", onClick: onLocationClick, color: "text-orange-600", bg: "bg-orange-50" },
    { icon: BarChart3, label: "Encuesta", onClick: onPollClick, color: "text-purple-600", bg: "bg-purple-50" },
    ...(showExercise ? [{ icon: Dumbbell, label: "Ejercicios", onClick: onExerciseClick, color: "text-red-600", bg: "bg-red-50" }] : []),
  ];

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setOpen(!open)}
        disabled={uploading}
        className="h-11 w-11 flex-shrink-0 hover:bg-slate-100"
      >
        <div className={`transition-transform ${open ? 'rotate-45' : ''}`}>
          <Paperclip className="w-5 h-5 text-slate-600" />
        </div>
      </Button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-[70px] left-1/2 -translate-x-1/2 bg-white rounded-3xl shadow-2xl p-4 z-50 border-2 border-slate-200 w-[340px]">
            <div className="grid grid-cols-4 gap-3">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    opt.onClick();
                    setOpen(false);
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-all"
                >
                  <div className={`w-12 h-12 rounded-full ${opt.bg} flex items-center justify-center shadow-sm`}>
                    <opt.icon className={`w-6 h-6 ${opt.color}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-700 leading-tight text-center">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function WhatsAppInputBar({
  messageText: externalMessageText,
  setMessageText: externalSetMessageText,
  onSend,
  attachments = [],
  setAttachments,
  recording = false,
  audioBlob = null,
  onStartRecording,
  onStopRecording,
  onUploadAudio,
  onCancelAudio,
  audioDuration = 0,
  uploading = false,
  onFileUpload,
  onCameraCapture,
  onLocationClick,
  onPollClick,
  onExerciseClick,
  showExercise = false,
  placeholder = "Mensaje",
  onTyping,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const textareaRef = useRef(null);
  
  // INPUT 100% LOCAL - nunca se sobrescribe desde fuera
  const [localText, setLocalText] = useState("");
  const localTextRef = useRef("");
  
  // Preview de imagen ANTES de enviar
  const [imagePreview, setImagePreview] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  
  // Estado para envío de audio
  

  

  // Sincronizar con prop externa SOLO cuando está vacía (para edición)
  useEffect(() => {
    if (externalMessageText && !localTextRef.current) {
      setLocalText(externalMessageText);
      localTextRef.current = externalMessageText;
    }
  }, [externalMessageText]);

  const hasText = localText.trim().length > 0;
  const hasContent = hasText || attachments.length > 0;

  const handleSend = () => {
    if (!localText.trim() && attachments.length === 0) return;
    
    // Pasar el texto actual al callback del padre
    onSend(localText);
    
    // Limpiar input local
    setLocalText("");
    localTextRef.current = "";
    
    // Limpiar también el externo si existe
    if (externalSetMessageText) {
      externalSetMessageText("");
    }
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleTextChange = (e) => {
    const newValue = e.target.value;
    setLocalText(newValue);
    localTextRef.current = newValue;
    
    // Sincronizar con padre (para persistencia)
    if (externalSetMessageText) {
      externalSetMessageText(newValue);
    }
    
    if (onTyping) onTyping();
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  // Manejo de preview para cámara y galería
  const handleCameraWithPreview = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setPreviewFile(file);
      // Resetear input
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleGalleryWithPreview = (e) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      // Mostrar preview del PRIMER archivo imagen
      const firstImage = imageFiles[0];
      const url = URL.createObjectURL(firstImage);
      setImagePreview(url);
      setPreviewFile(firstImage);
      
      // Pasar archivos no-imagen al handler original
      const nonImageFiles = files.filter(f => !f.type.startsWith('image/'));
      if (nonImageFiles.length > 0) {
        const evt = new Event('change', { bubbles: true });
        Object.defineProperty(evt, 'target', {
          writable: false,
          value: { files: nonImageFiles }
        });
        onFileUpload(evt);
      }
      
      // Resetear input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImagePreviewConfirm = async () => {
    if (!previewFile) return;

    try {
      // Crear evento simulado con el archivo
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(previewFile);
      
      const evt = new Event('change', { bubbles: true });
      Object.defineProperty(evt, 'target', {
        writable: false,
        value: { files: dataTransfer.files }
      });

      // Pasar al handler original (cámara o galería)
      // Pero como queremos que se agregue a attachments, llamamos directamente
      const result = await onCameraCapture(evt);
      if (result) {
        setAttachments(prev => [...prev, result]);
      }

      // Cerrar preview
      setImagePreview(null);
      setPreviewFile(null);
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      toast.error('Error al procesar la imagen');
      setImagePreview(null);
      setPreviewFile(null);
    }
  };

  const handleImagePreviewCancel = () => {
    setImagePreview(null);
    setPreviewFile(null);
    // Limpiar inputs
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-2 bg-white border-t flex-shrink-0">
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
        onChange={handleGalleryWithPreview}
        disabled={uploading} 
      />
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={handleCameraWithPreview}
        disabled={uploading} 
      />

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, idx) => (
            <div key={idx} className="relative">
              {file.tipo?.startsWith('image/') ? (
                <div className="relative">
                  <img src={file.url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  <button 
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span className="truncate max-w-[120px]">{file.nombre}</span>
                  <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}



      {/* Input bar - TIPO WHATSAPP */}
      <div className="flex gap-2 items-end">
        {/* Emoji - siempre visible */}
        <EmojiPicker 
          autoOpen
          showInlineButton={true}
          onEmojiSelect={(emoji) => {
            const newValue = localText + emoji;
            setLocalText(newValue);
            localTextRef.current = newValue;
            if (externalSetMessageText) externalSetMessageText(newValue);
          }}
          messageText={localText}
        />

        {/* Input */}
        <div className="flex-1 bg-white border rounded-3xl px-4 py-2 min-h-[44px] flex items-center">
          <textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={localText}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="w-full resize-none outline-none text-sm bg-transparent max-h-[120px] overflow-y-auto"
            rows={1}
            style={{ minHeight: '24px' }}
          />
        </div>

        {/* Botones dinámicos - COMO WHATSAPP */}
        <>
          {/* Menú adjuntos siempre visible */}
          <AttachmentMenu
            onFileClick={() => fileInputRef.current?.click()}
            onCameraClick={() => cameraInputRef.current?.click()}
            onLocationClick={onLocationClick}
            onPollClick={onPollClick}
            onExerciseClick={onExerciseClick}
            showExercise={showExercise}
            uploading={uploading}
          />

          {/* Cámara rápida solo cuando no hay texto */}
          {!hasContent && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="h-11 w-11 flex-shrink-0 hover:bg-slate-100"
            >
              <Camera className="w-5 h-5 text-slate-600" />
            </Button>
          )}

          {/* Micrófono cuando no hay texto, Enviar cuando sí */}
          {!hasText ? (
            <AudioRecordButton
              disabled={uploading}
              onAudioSent={async ({ audio_url, audio_duracion }) => {
                if (onUploadAudio) {
                  await onUploadAudio({ audio_url, audio_duracion });
                }
              }}
            />
          ) : (
            <Button 
              onClick={handleSend}
              disabled={!localText.trim() && attachments.length === 0}
              size="icon"
              className="h-11 w-11 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full"
            >
              <Send className="w-5 h-5" />
            </Button>
          )}
        </>
      </div>
    </div>
  );
}