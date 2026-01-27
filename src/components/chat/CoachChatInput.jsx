import React, { useState, memo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip, Camera, MapPin, BarChart3, Dumbbell, X } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import AudioRecordButton from "./AudioRecordButton";

const CoachChatInput = memo(function CoachChatInput({
  onSendMessage,
  onFileUpload,
  onCameraCapture,
  onLocationClick,
  onPollClick,
  onExerciseClick,
  uploading,
  placeholder = "Mensaje"
}) {
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  const handleSend = async () => {
    if (!localText.trim() && localAttachments.length === 0) return;
    
    onSendMessage({
      mensaje: localText,
      adjuntos: [...localAttachments],
      audio_url: null,
      audio_duracion: 0
    });
    
    setLocalText("");
    setLocalAttachments([]);
  };

  const handleAudioSent = async (audioData) => {
    onSendMessage({
      mensaje: "",
      adjuntos: [],
      audio_url: audioData.audio_url,
      audio_duracion: audioData.audio_duracion
    });
  };

  const handleFileUploadLocal = async (e) => {
    const result = await onFileUpload(e);
    if (result && result.length > 0) {
      setLocalAttachments(prev => [...prev, ...result]);
    }
  };

  const handleCameraCaptureLocal = async (e) => {
    const result = await onCameraCapture(e);
    if (result) {
      setLocalAttachments(prev => [...prev, result]);
    }
  };

  const attachOptions = [
    { icon: Paperclip, label: "Archivos", onClick: () => fileInputRef.current?.click(), color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Camera, label: "Cámara", onClick: () => cameraInputRef.current?.click(), color: "text-green-600", bg: "bg-green-50" },
    { icon: MapPin, label: "Ubicación", onClick: onLocationClick, color: "text-orange-600", bg: "bg-orange-50" },
    { icon: BarChart3, label: "Encuesta", onClick: onPollClick, color: "text-purple-600", bg: "bg-purple-50" },
    { icon: Dumbbell, label: "Ejercicios", onClick: onExerciseClick, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="border-t bg-white flex-shrink-0 p-2">
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
        onChange={handleCameraCaptureLocal}
        disabled={uploading} 
      />

      {localAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {localAttachments.map((file, idx) => (
            <div key={idx} className="bg-slate-100 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
              <span className="truncate max-w-[120px]">{file.nombre}</span>
              <button onClick={() => setLocalAttachments(localAttachments.filter((_, i) => i !== idx))}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Menú adjuntos */}
        <div className="relative">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="h-11 w-11 flex-shrink-0"
            disabled={uploading}
          >
            <Paperclip className={`w-5 h-5 text-slate-600 transition-transform ${showAttachMenu ? 'rotate-45' : ''}`} />
          </Button>

          {showAttachMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
              <div className="fixed bottom-[70px] left-1/2 -translate-x-1/2 bg-white rounded-3xl shadow-2xl p-4 z-50 border-2 border-slate-200 w-[340px]">
                <div className="grid grid-cols-4 gap-3">
                  {attachOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        opt.onClick();
                        setShowAttachMenu(false);
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
              onEmojiSelect={(emoji) => {
                setLocalText(prev => prev + emoji);
                setShowEmojiPicker(false);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}

        <Textarea
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={placeholder}
          className="flex-1 min-h-[36px] max-h-[120px] resize-none text-sm rounded-3xl"
          disabled={uploading}
          rows={1}
        />

        <AudioRecordButton 
          onAudioSent={handleAudioSent}
          disabled={uploading}
        />
        {(!!localText.trim() || localAttachments.length > 0) && (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={uploading}
            className="h-11 w-11 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full"
          >
            <Send className="w-5 h-5" />
          </Button>
        )}
      </div>
      )}
    </div>
  );
});

export default CoachChatInput;