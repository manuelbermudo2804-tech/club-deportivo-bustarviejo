import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Smile, Paperclip, Camera, MapPin, BarChart3, Dumbbell, Mic, Pause, X, FileText } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

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
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-3xl shadow-2xl p-4 z-50 border-2 border-slate-200 w-[340px]">
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
  messageText,
  setMessageText,
  onSend,
  attachments = [],
  setAttachments,
  recording = false,
  audioBlob = null,
  onStartRecording,
  onStopRecording,
  onSendAudio,
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

  const hasText = messageText.trim().length > 0;

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    onSend();
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleTextChange = (e) => {
    setMessageText(e.target.value);
    if (onTyping) onTyping();
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="p-2 bg-white border-t flex-shrink-0">
      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        accept="*/*"
        className="hidden" 
        onChange={onFileUpload}
        disabled={uploading} 
      />
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={onCameraCapture}
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

      {/* Recording indicator */}
      {recording && (
        <div className="mb-2 flex items-center gap-2 bg-red-50 rounded-lg p-3 border-2 border-red-300 animate-pulse">
          <Mic className="w-5 h-5 text-red-600 animate-pulse" />
          <span className="text-sm flex-1 text-red-700 font-semibold">🔴 Grabando...</span>
          <Button size="sm" onClick={onStopRecording} className="h-8 bg-red-600 hover:bg-red-700">
            Detener
          </Button>
        </div>
      )}

      {/* Audio preview */}
      {audioBlob && (
        <div className="mb-2 flex items-center gap-2 bg-green-50 rounded-lg p-3 border-2 border-green-300">
          <Mic className="w-5 h-5 text-green-600" />
          <span className="text-sm flex-1 font-medium">🎤 Audio {audioDuration}s</span>
          <Button size="sm" onClick={onSendAudio} className="h-8 bg-green-600">Enviar</Button>
          <Button size="sm" variant="outline" onClick={onCancelAudio} className="h-8">✕</Button>
        </div>
      )}

      {/* Input bar - TIPO WHATSAPP */}
      <div className="flex gap-2 items-end">
        {/* Emoji - siempre visible */}
        <EmojiPicker 
          onEmojiSelect={(emoji) => setMessageText(prev => prev + emoji)}
          messageText={messageText}
        />

        {/* Input */}
        <div className="flex-1 bg-white border rounded-3xl px-4 py-2 min-h-[44px] flex items-center">
          <textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={messageText}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="w-full resize-none outline-none text-base bg-transparent max-h-[120px] overflow-y-auto"
            rows={1}
            style={{ minHeight: '24px' }}
          />
        </div>

        {/* Botones dinámicos - COMO WHATSAPP */}
        {!hasText ? (
          <>
            {/* Menú "+" */}
            <AttachmentMenu
              onFileClick={() => fileInputRef.current?.click()}
              onCameraClick={() => cameraInputRef.current?.click()}
              onLocationClick={onLocationClick}
              onPollClick={onPollClick}
              onExerciseClick={onExerciseClick}
              showExercise={showExercise}
              uploading={uploading}
            />

            {/* Cámara rápida */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="h-11 w-11 flex-shrink-0 hover:bg-slate-100"
            >
              <Camera className="w-5 h-5 text-slate-600" />
            </Button>

            {/* Micrófono */}
            <Button
              size="icon"
              onClick={recording ? onStopRecording : onStartRecording}
              className="h-11 w-11 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full"
            >
              {recording ? <Pause className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          </>
        ) : (
          <>
            {/* Botón Enviar - REEMPLAZA al micrófono cuando hay texto */}
            <Button 
              onClick={handleSend}
              disabled={!messageText.trim() && attachments.length === 0}
              size="icon"
              className="h-11 w-11 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full"
            >
              <Send className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}