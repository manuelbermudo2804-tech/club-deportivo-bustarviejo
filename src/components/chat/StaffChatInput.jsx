import React, { useState, memo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip, Camera } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import AudioRecordButton from "./AudioRecordButton";

const StaffChatInput = memo(function StaffChatInput({
  onSendMessage,
  onFileUpload,
  onCameraCapture,
  uploading,
  placeholder = "Escribe un mensaje..."
}) {
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
                <Send className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          className="h-11 w-11 flex-shrink-0"
          disabled={uploading}
        >
          <Paperclip className="w-5 h-5 text-slate-600" />
        </Button>

        {!localText.trim() && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => cameraInputRef.current?.click()}
            className="h-11 w-11 flex-shrink-0"
            disabled={uploading}
          >
            <Camera className="w-5 h-5 text-slate-600" />
          </Button>
        )}

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

        {!(!!localText.trim()) && (
          <AudioRecordButton 
            onAudioSent={handleAudioSent}
            disabled={uploading}
          />
        )}
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

export default StaffChatInput;