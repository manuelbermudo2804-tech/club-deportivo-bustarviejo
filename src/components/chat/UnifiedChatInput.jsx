import React, { useState, useEffect, memo, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip, Camera, MapPin, BarChart3, FileText, X } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import AudioRecordButton from "./AudioRecordButton";

/**
 * Input de chat UNIFICADO para los 4 chats del club
 * (familia↔entrenador, familia↔coordinadora, coordinadora, staff).
 *
 * Trae el set completo de capacidades. Cada chat activa solo las que
 * le aplican mediante flags. La lógica de negocio (qué entidad se crea,
 * notificaciones, moderación) sigue viviendo en cada página vía onSendMessage.
 *
 * Props de capacidad (todas opcionales, por defecto desactivadas salvo emoji/audio):
 *  - onFileUpload(e) -> devuelve array de adjuntos subidos -> habilita Archivos + Imagen
 *  - onCameraCapture(e) -> devuelve un adjunto -> habilita Cámara
 *  - onLocationClick() -> habilita Ubicación
 *  - onPollClick() -> habilita Encuesta
 *  - showAudio (default true)
 *  - editingText / onCancelEdit -> banner de edición
 */
const UnifiedChatInput = memo(function UnifiedChatInput({
  onSendMessage,
  onFileUpload,
  onCameraCapture,
  onLocationClick,
  onPollClick,
  uploading,
  placeholder = "Escribe un mensaje...",
  showAudio = true,
  disabled = false,
  editingText = "",
  onCancelEdit,
}) {
  const [localText, setLocalText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [audioExpanded, setAudioExpanded] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (editingText) setLocalText(editingText);
  }, [editingText]);

  // ¿Qué acciones de adjunto hay disponibles?
  const hasFiles = !!onFileUpload;
  const hasCamera = !!onCameraCapture;
  const hasLocation = !!onLocationClick;
  const hasPoll = !!onPollClick;
  const attachActions = [hasFiles, hasCamera, hasLocation, hasPoll].filter(Boolean).length;

  const handleSend = () => {
    if (!localText.trim() && pendingAttachments.length === 0) return;
    onSendMessage({
      mensaje: localText.trim(),
      adjuntos: [...pendingAttachments],
      audio_url: null,
      audio_duracion: 0,
    });
    setLocalText("");
    setPendingAttachments([]);
  };

  const handleAudioSent = (audioData) => {
    onSendMessage({
      mensaje: "",
      adjuntos: [],
      audio_url: audioData.audio_url,
      audio_duracion: audioData.audio_duracion,
    });
  };

  const handleFileUploadLocal = async (e) => {
    const result = await onFileUpload(e);
    if (result && result.length > 0) setPendingAttachments(prev => [...prev, ...result]);
    if (e.target) e.target.value = "";
  };

  const handleCameraCaptureLocal = async (e) => {
    const result = await onCameraCapture(e);
    if (result) setPendingAttachments(prev => [...prev, result]);
    if (e.target) e.target.value = "";
  };

  const removeAttachment = (idx) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="border-t bg-white flex-shrink-0 p-2">
      {hasFiles && (
        <input ref={fileInputRef} type="file" multiple accept="*/*" className="hidden" onChange={handleFileUploadLocal} disabled={uploading} />
      )}
      {hasCamera && (
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCaptureLocal} disabled={uploading} />
      )}

      {editingText && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-2 text-xs">
          <span className="text-amber-800">✏️ Editando mensaje</span>
          <button onClick={() => { setLocalText(""); onCancelEdit?.(); }} className="text-amber-700 hover:text-amber-900 font-medium">
            Cancelar
          </button>
        </div>
      )}

      {uploading && (
        <div className="mb-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-sm text-blue-700 font-medium">Subiendo archivo...</span>
        </div>
      )}

      {/* Adjuntos pendientes (preview antes de enviar) */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {pendingAttachments.map((file, idx) => (
            <div key={idx} className="relative bg-slate-100 rounded-lg p-2 flex items-center gap-2 text-xs max-w-[180px]">
              {file.tipo?.startsWith('image/') ? (
                <img src={file.url} alt={file.nombre} className="w-8 h-8 rounded object-cover" />
              ) : (
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
              )}
              <span className="truncate flex-1">{file.nombre}</span>
              <button onClick={() => removeAttachment(idx)} className="text-slate-500 hover:text-red-600 flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {audioExpanded ? (
          <AudioRecordButton onAudioSent={handleAudioSent} disabled={uploading || disabled} expanded={true} onExpandedChange={setAudioExpanded} />
        ) : (
          <>
            {/* Menú de adjuntos (solo si hay alguna acción disponible) */}
            {attachActions > 0 && (
              <div className="relative">
                <Button size="icon" variant="ghost" onClick={() => setShowAttachMenu(!showAttachMenu)} className="h-11 w-11 flex-shrink-0" disabled={uploading || disabled}>
                  <Paperclip className={`w-5 h-5 text-slate-600 transition-transform ${showAttachMenu ? 'rotate-45' : ''}`} />
                </Button>

                {showAttachMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                    <div className="fixed bottom-[70px] left-1/2 -translate-x-1/2 bg-white rounded-3xl shadow-2xl p-4 z-50 border-2 border-slate-200 w-[340px]">
                      <div className={`grid gap-3 ${attachActions >= 4 ? 'grid-cols-4' : attachActions === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {hasFiles && (
                          <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-all">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shadow-sm">
                              <Paperclip className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-xs font-medium text-slate-700">Archivos</span>
                          </button>
                        )}
                        {hasCamera && (
                          <button onClick={() => { cameraInputRef.current?.click(); setShowAttachMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-all">
                            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shadow-sm">
                              <Camera className="w-6 h-6 text-green-600" />
                            </div>
                            <span className="text-xs font-medium text-slate-700">Cámara</span>
                          </button>
                        )}
                        {hasLocation && (
                          <button onClick={() => { onLocationClick?.(); setShowAttachMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-all">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center shadow-sm">
                              <MapPin className="w-6 h-6 text-orange-600" />
                            </div>
                            <span className="text-xs font-medium text-slate-700">Ubicación</span>
                          </button>
                        )}
                        {hasPoll && (
                          <button onClick={() => { onPollClick?.(); setShowAttachMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-all">
                            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shadow-sm">
                              <BarChart3 className="w-6 h-6 text-purple-600" />
                            </div>
                            <span className="text-xs font-medium text-slate-700">Encuesta</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <Button size="sm" variant="ghost" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="h-9 w-9 p-0 flex-shrink-0" disabled={uploading || disabled}>
              <Smile className="w-5 h-5 text-slate-600" />
            </Button>

            {showEmojiPicker && (
              <div className="absolute bottom-16 left-4 z-50">
                <EmojiPicker autoOpen showInlineButton={false} onEmojiSelect={(emoji) => setLocalText(prev => prev + emoji)} onClose={() => setShowEmojiPicker(false)} />
              </div>
            )}

            <Textarea
              value={localText}
              onChange={(e) => {
                setLocalText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 6 * 24) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={placeholder}
              className="flex-1 min-h-[44px] max-h-[144px] resize-none text-sm rounded-3xl"
              disabled={uploading || disabled}
              rows={1}
            />

            {localText.trim() || pendingAttachments.length > 0 ? (
              <Button size="icon" onClick={handleSend} disabled={uploading || disabled} className="h-11 w-11 bg-green-600 hover:bg-green-700 flex-shrink-0 rounded-full">
                <Send className="w-5 h-5" />
              </Button>
            ) : showAudio ? (
              <AudioRecordButton onAudioSent={handleAudioSent} disabled={uploading || disabled} expanded={false} onExpandedChange={setAudioExpanded} />
            ) : (
              <Button size="icon" disabled className="h-11 w-11 bg-green-600 flex-shrink-0 rounded-full opacity-50">
                <Send className="w-5 h-5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default UnifiedChatInput;