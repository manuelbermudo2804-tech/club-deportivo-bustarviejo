import React, { useState, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Edit, X, FileText, Mic, Pause, Play } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import { toast } from "sonner";

export default function AdminChatInput({
  onSendMessage,
  onSendInternalNote,
  uploading
}) {
  const [localText, setLocalText] = useState("");
  const [localAttachments, setLocalAttachments] = useState([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null);
  
  const fileInputRef = React.useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSend = useCallback(() => {
    if (!localText.trim() && localAttachments.length === 0 && !audioBlob) return;
    
    const messageData = {
      mensaje: localText,
      adjuntos: [...localAttachments],
      audio_blob: audioBlob,
      audio_duracion: audioDuration
    };
    
    onSendMessage(messageData);
    
    setLocalText("");
    setLocalAttachments([]);
    setAudioBlob(null);
    setAudioDuration(0);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [localText, localAttachments, audioBlob, audioDuration, onSendMessage]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const startTime = Date.now();
      toast.success("🎤 Grabando...", { duration: 1000 });

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioDuration(duration);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      toast.error("Error al acceder al micrófono");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const cancelAudio = () => {
    setAudioBlob(null);
    setAudioDuration(0);
  };

  const togglePlayAudio = async () => {
    if (!audioBlob) return;
    try {
      if (playingAudio === 'pending') {
        audioRef.current?.pause();
        setPlayingAudio(null);
      } else {
        const url = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = url;
          await audioRef.current.play();
          setPlayingAudio('pending');
        }
      }
    } catch (error) {
      toast.error("Error al reproducir el audio");
      setPlayingAudio(null);
    }
  };

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
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

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

      {/* Audio pendiente */}
      {audioBlob && (
        <div className="flex items-center gap-2 bg-green-50 rounded-lg p-2 border-2 border-green-300">
          <Mic className="w-4 h-4 text-green-600" />
          <span className="text-xs flex-1 font-medium">🎤 {audioDuration}s</span>
          <Button size="sm" onClick={togglePlayAudio} className="h-7 bg-green-600 text-xs">
            {playingAudio === 'pending' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="outline" onClick={cancelAudio} className="h-7 text-xs">✕</Button>
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

          {/* Micrófono */}
          <Button
            size="icon"
            onClick={recording ? stopRecording : startRecording}
            className="h-10 w-10 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full"
            disabled={audioBlob}
          >
            {recording ? <Pause className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

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