import React, { useState, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Edit, X, FileText } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import AudioRecordingBar from "./AudioRecordingBar";
import { toast } from "sonner";
import { useAudioRecording } from "./useAudioRecording";

export default function AdminChatInput({
  onSendMessage,
  onSendInternalNote,
  uploading
}) {
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = React.useRef(null);
  const textareaRef = useRef(null);

  const {
    isRecording,
    audioBlob,
    audioDuration,
    isUploading: audioIsUploading,
    startRecording,
    stopRecording,
    cancelAudio,
    uploadAudio
  } = useAudioRecording();

  const handleSend = useCallback(async () => {
    if (!localText.trim() && localAttachments.length === 0 && !audioBlob) return;
    
    setIsUploading(true);
    
    const messageData = {
      mensaje: localText,
      adjuntos: [...localAttachments],
      audio_url: null,
      audio_duracion: 0
    };

    // Si hay audio pendiente, subirlo primero
    if (audioBlob) {
      const audioData = await uploadAudio();
      if (audioData) {
        messageData.audio_url = audioData.audio_url;
        messageData.audio_duracion = audioData.audio_duracion;
      } else {
        setIsUploading(false);
        return;
      }
    }
    
    onSendMessage(messageData);
    
    setLocalText("");
    setLocalAttachments([]);
    cancelAudio();
    setIsUploading(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [localText, localAttachments, audioBlob, onSendMessage, uploadAudio, cancelAudio]);

  const handleSendNote = useCallback(() => {
    if (!localText.trim()) return;
    
    onSendInternalNote({
      mensaje: localText,
      adjuntos: [...localAttachments]
    });
    
    setLocalText("");
    setLocalAttachments([]);
  }, [localText, localAttachments, onSendInternalNote]);

  const handleFileUploadLocal = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const simpleFiles = files.map(f => ({
      url: URL.createObjectURL(f),
      nombre: f.name,
      tipo: f.type,
      tamano: f.size
    }));
    setLocalAttachments(prev => [...prev, ...simpleFiles]);
  }, []);



  const handleTextChange = (e) => {
    const newValue = e.target.value;
    setLocalText(newValue);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="p-3 bg-white border-t flex-shrink-0 space-y-2">
      {/* Attachments preview */}
      {localAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
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

      {/* Audio Recording Bar - estilo WhatsApp */}
      {(isRecording || audioBlob) && (
        <div className="mb-2">
          <AudioRecordingBar
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            audioBlob={audioBlob}
            audioDuration={audioDuration}
            onSendAudio={handleSend}
            onCancelAudio={cancelAudio}
            uploading={isUploading || audioIsUploading}
            disabled={isUploading || audioIsUploading}
          />
        </div>
      )}

      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        className="hidden" 
        onChange={(e) => handleFileUploadLocal(e)} 
        disabled={uploading} 
      />

      <div className="space-y-2">
        <div className="flex gap-1 justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-8 px-2 text-xs"
          >
            <FileText className="w-3 h-3 mr-1" />
            Archivo
          </Button>
          <Button 
            onClick={handleSendNote}
            disabled={!localText.trim()}
            size="sm"
            variant="outline"
            className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 h-8 px-2 text-xs"
            title="Nota interna (solo admins)"
          >
            <Edit className="w-3 h-3 mr-1" />
            Nota
          </Button>
        </div>

        <div className="flex gap-2 items-end">
          <EmojiPicker 
            onEmojiSelect={(emoji) => setLocalText(prev => prev + emoji)}
            messageText={localText}
          />
          
          <div className="flex-1 bg-white border rounded-3xl px-3 py-1 min-h-[44px] flex items-center">
            <textarea
              ref={textareaRef}
              placeholder="Escribe..."
              value={localText}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 resize-none outline-none text-sm bg-transparent max-h-[120px] overflow-y-auto"
              rows={1}
            />
          </div>

          {/* Micrófono - componente mejorado */}
          <AudioRecordingBar
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            audioBlob={audioBlob}
            audioDuration={audioDuration}
            onSendAudio={handleSend}
            onCancelAudio={cancelAudio}
            uploading={isUploading || audioIsUploading}
            disabled={audioBlob || isUploading || audioIsUploading}
          />

          <Button 
            onClick={handleSend} 
            disabled={(!localText.trim() && localAttachments.length === 0 && !audioBlob) || uploading}
            className="bg-red-600 hover:bg-red-700 h-10 w-10 p-0 flex-shrink-0 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}