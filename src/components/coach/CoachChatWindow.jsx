import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, FileText, Download, MessageCircle, Camera, Folder, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const QUICK_REPLIES = [
  "✅ Gracias por tu mensaje, te respondo pronto",
  "👍 Entendido",
  "📞 Hablamos en el próximo entrenamiento",
  "⚽ Está trabajando muy bien",
  "💪 Seguimos mejorando",
];

export default function CoachChatWindow({ conversation, user, onClose }) {
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();

  const isCoach = user?.es_entrenador || user?.role === "admin";

  const { data: messages = [] } = useQuery({
    queryKey: ['coachMessages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      return await base44.entities.CoachMessage.filter({ conversacion_id: conversation.id }, 'created_date');
    },
    refetchInterval: 3000,
    enabled: !!conversation?.id,
  });

  const { data: conversationState } = useQuery({
    queryKey: ['coachConversationState', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return null;
      const data = await base44.entities.CoachConversation.filter({ id: conversation.id });
      return data[0];
    },
    refetchInterval: 2000,
    enabled: !!conversation?.id,
  });

  const otherPersonTyping = isCoach 
    ? conversationState?.padre_escribiendo 
    : conversationState?.entrenador_escribiendo;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, otherPersonTyping]);

  useEffect(() => {
    if (!conversation?.id) return;
    
    const markAsRead = async () => {
      const field = isCoach ? 'no_leidos_entrenador' : 'no_leidos_padre';
      const msgField = isCoach ? 'leido_entrenador' : 'leido_padre';
      const dateField = isCoach ? 'fecha_leido_entrenador' : 'fecha_leido_padre';
      
      if (conversation[field] > 0) {
        await base44.entities.CoachConversation.update(conversation.id, {
          [field]: 0
        });

        const unreadMessages = messages.filter(m => m.autor !== (isCoach ? "entrenador" : "padre") && !m[msgField]);
        for (const msg of unreadMessages) {
          await base44.entities.CoachMessage.update(msg.id, {
            [msgField]: true,
            [dateField]: new Date().toISOString()
          });
        }

        queryClient.invalidateQueries({ queryKey: ['coachParentConversations'] });
        queryClient.invalidateQueries({ queryKey: ['coachMessages', conversation.id] });
      }
    };
    markAsRead();
  }, [conversation?.id, messages]);

  const handleTyping = async () => {
    if (!conversation?.id) return;
    
    const field = isCoach ? 'entrenador_escribiendo' : 'padre_escribiendo';
    
    clearTimeout(typingTimeoutRef.current);
    
    await base44.entities.CoachConversation.update(conversation.id, {
      [field]: true,
      ultima_actividad_escribiendo: new Date().toISOString()
    });

    typingTimeoutRef.current = setTimeout(async () => {
      await base44.entities.CoachConversation.update(conversation.id, {
        [field]: false
      });
    }, 3000);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({
          url: file_url,
          nombre: file.name,
          tipo: file.type,
          tamano: file.size
        });
      }
      setAttachments([...attachments, ...uploaded]);
      toast.success("Archivos adjuntados");
    } catch (error) {
      toast.error("Error al subir archivos");
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachments([...attachments, {
        url: file_url,
        nombre: file.name,
        tipo: file.type,
        tamano: file.size
      }]);
      toast.success("Foto capturada");
    } catch (error) {
      toast.error("Error al capturar foto");
    } finally {
      setUploading(false);
    }
  };

  const allSharedFiles = messages.flatMap(m => m.adjuntos || []);

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await base44.entities.CoachMessage.create({
        conversacion_id: conversation.id,
        autor: isCoach ? "entrenador" : "padre",
        autor_email: user.email,
        autor_nombre: user.full_name || (isCoach ? "Entrenador" : "Padre"),
        mensaje: data.mensaje,
        adjuntos: data.adjuntos,
        leido_entrenador: isCoach,
        leido_padre: !isCoach,
        fecha_leido_entrenador: isCoach ? new Date().toISOString() : null,
        fecha_leido_padre: !isCoach ? new Date().toISOString() : null
      });

      const fieldNoLeidos = isCoach ? 'no_leidos_padre' : 'no_leidos_entrenador';
      const fieldEscribiendo = isCoach ? 'entrenador_escribiendo' : 'padre_escribiendo';

      await base44.entities.CoachConversation.update(conversation.id, {
        ultimo_mensaje: data.mensaje,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: isCoach ? "entrenador" : "padre",
        [fieldNoLeidos]: (conversation[fieldNoLeidos] || 0) + 1,
        [fieldEscribiendo]: false,
        archivada: false
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachMessages', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['coachParentConversations'] });
      setMessageText("");
      setAttachments([]);
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ mensaje: messageText, adjuntos: attachments });
  };

  if (!conversation || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-slate-500 text-sm">Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">{conversation.padre_nombre}</h2>
            <p className="text-sm text-slate-500">{conversation.categoria}</p>
            <p className="text-xs text-slate-400">
              {conversation.jugadores_asociados?.map(j => j.jugador_nombre).join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowGallery(!showGallery)}
            >
              <Folder className="w-4 h-4 mr-1" />
              {allSharedFiles.length}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {showGallery && (
        <div className="p-4 bg-white border-b max-h-[200px] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">📁 Archivos Compartidos</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowGallery(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {allSharedFiles.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No hay archivos compartidos</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allSharedFiles.map((file, idx) => (
                file.tipo?.startsWith('image/') ? (
                  <img 
                    key={idx}
                    src={file.url}
                    alt={file.nombre}
                    className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => setShowImagePreview(file.url)}
                  />
                ) : (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 bg-slate-100 rounded hover:bg-slate-200"
                  >
                    <FileText className="w-8 h-8 text-slate-600" />
                    <span className="text-xs truncate w-full text-center">{file.nombre}</span>
                  </a>
                )
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {!messages || messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">¡Inicia la conversación!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = (isCoach && msg.autor === "entrenador") || (!isCoach && msg.autor === "padre");
            
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isMine ? 'bg-blue-600 text-white' : 'bg-white text-slate-900 border'} rounded-2xl p-3 shadow-sm`}>
                  <p className="text-xs font-semibold mb-1 opacity-70">{msg.autor_nombre}</p>
                  <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                  {msg.adjuntos?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.adjuntos.map((file, idx) => (
                        file.tipo?.startsWith('image/') ? (
                          <img 
                            key={idx}
                            src={file.url}
                            alt={file.nombre}
                            className="rounded cursor-pointer max-w-full h-auto hover:opacity-80"
                            onClick={() => setShowImagePreview(file.url)}
                          />
                        ) : (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-xs p-2 rounded ${isMine ? 'bg-blue-700' : 'bg-slate-100'}`}
                          >
                            <FileText className="w-3 h-3" />
                            <span className="flex-1 truncate">{file.nombre}</span>
                            <Download className="w-3 h-3" />
                          </a>
                        )
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs opacity-60">
                      {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                    </p>
                    {isMine && (
                      <div className="flex items-center gap-1">
                        {(isCoach ? msg.leido_padre : msg.leido_entrenador) ? (
                          <CheckCheck className="w-4 h-4 text-blue-300" />
                        ) : (
                          <Check className="w-4 h-4 opacity-50" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {otherPersonTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl p-3 shadow-sm border">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t">
        {isCoach && showQuickReplies && (
          <div className="mb-2 bg-white border rounded-lg shadow-lg p-2 space-y-1">
            {QUICK_REPLIES.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setMessageText(reply);
                  setShowQuickReplies(false);
                }}
                className="block w-full text-left text-xs p-2 hover:bg-slate-50 rounded"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div key={idx} className="relative">
                {file.tipo?.startsWith('image/') ? (
                  <div className="relative">
                    <img src={file.url} alt="" className="w-16 h-16 object-cover rounded" />
                    <button 
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-100 rounded px-2 py-1 text-xs flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{file.nombre}</span>
                    <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1">
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="*/*" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={uploading} 
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              disabled={uploading} 
              className="h-10 w-10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            
            <input 
              ref={cameraInputRef}
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handleCameraCapture} 
              disabled={uploading} 
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              disabled={uploading} 
              className="h-10 w-10"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="w-5 h-5" />
            </Button>
          </div>

          <Textarea
            placeholder="Escribe tu mensaje..."
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 min-h-[44px] resize-none"
            rows={1}
          />

          <div className="flex gap-1">
            {isCoach && messageText.trim() && (
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                onClick={() => setShowQuickReplies(!showQuickReplies)}
                className="h-10 w-10"
              >
                <MessageCircle className="w-5 h-5 text-slate-500" />
              </Button>
            )}
            
            <Button 
              onClick={handleSend} 
              disabled={!messageText.trim() && attachments.length === 0} 
              className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {showImagePreview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowImagePreview(null)}>
          <div className="relative max-w-4xl w-full">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowImagePreview(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white"
            >
              <X className="w-6 h-6" />
            </Button>
            <img src={showImagePreview} alt="Preview" className="w-full h-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}