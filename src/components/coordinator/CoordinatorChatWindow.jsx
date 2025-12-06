import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Paperclip, X, FileText, Download, Mic, Play, Pause, Search, Star, Tag, Smile, ThumbsUp, Heart, CheckCircle, Image as ImageIcon, MessageCircle, Camera, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const QUICK_REPLIES = [
  "✅ Revisando tu consulta, te respondo pronto",
  "📅 Te confirmo mañana",
  "👍 Entendido, gracias por avisar",
  "📞 Te llamaré para comentarlo",
  "✨ Perfecto, todo aclarado",
];

const REACTIONS = ["👍", "❤️", "✅", "👏", "🎉"];

export default function CoordinatorChatWindow({ conversation, user, onClose }) {
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();
  const audioContextRef = useRef(null);
  const notificationSoundRef = useRef(null);

  const isCoordinator = user.es_coordinador || user.role === "admin";

  const { data: messages = [] } = useQuery({
    queryKey: ['coordinatorMessages', conversation.id],
    queryFn: () => base44.entities.CoordinatorMessage.filter({ conversacion_id: conversation.id }, 'created_date'),
    refetchInterval: 3000,
  });

  // Reproducir sonido cuando llega un mensaje nuevo
  useEffect(() => {
    if (messages.length > 0 && notificationSoundRef.current) {
      const lastMessage = messages[messages.length - 1];
      const isFromOther = isCoordinator ? lastMessage.autor === "padre" : lastMessage.autor === "coordinador";
      
      // Solo reproducir si es de la otra persona y es reciente (últimos 5 segundos)
      const messageAge = Date.now() - new Date(lastMessage.created_date).getTime();
      if (isFromOther && messageAge < 5000) {
        notificationSoundRef.current.play().catch(() => {});
      }
    }
  }, [messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Marcar como leído cuando abre la conversación
  useEffect(() => {
    const markAsRead = async () => {
      const field = isCoordinator ? 'no_leidos_coordinador' : 'no_leidos_padre';
      const msgField = isCoordinator ? 'leido_coordinador' : 'leido_padre';
      const dateField = isCoordinator ? 'fecha_leido_coordinador' : 'fecha_leido_padre';
      
      if (conversation[field] > 0) {
        await base44.entities.CoordinatorConversation.update(conversation.id, {
          [field]: 0
        });

        const unreadMessages = messages.filter(m => m.autor !== (isCoordinator ? "coordinador" : "padre") && !m[msgField]);
        for (const msg of unreadMessages) {
          await base44.entities.CoordinatorMessage.update(msg.id, {
            [msgField]: true,
            [dateField]: new Date().toISOString()
          });
        }

        queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
        queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      }
    };
    markAsRead();
  }, [conversation.id, messages]);

  // Indicador "escribiendo..."
  const handleTyping = async () => {
    const field = isCoordinator ? 'coordinador_escribiendo' : 'padre_escribiendo';
    
    clearTimeout(typingTimeoutRef.current);
    
    await base44.entities.CoordinatorConversation.update(conversation.id, {
      [field]: true,
      ultima_actividad_escribiendo: new Date().toISOString()
    });

    typingTimeoutRef.current = setTimeout(async () => {
      await base44.entities.CoordinatorConversation.update(conversation.id, {
        [field]: false
      });
    }, 3000);
  };

  // Polling para estado "escribiendo"
  const { data: conversationState } = useQuery({
    queryKey: ['coordinatorConversationState', conversation.id],
    queryFn: () => base44.entities.CoordinatorConversation.filter({ id: conversation.id }),
    refetchInterval: 2000,
    select: (data) => data[0]
  });

  const otherPersonTyping = isCoordinator 
    ? conversationState?.padre_escribiendo 
    : conversationState?.coordinador_escribiendo;

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

  const sendPoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      toast.error("Necesitas una pregunta y al menos 2 opciones");
      return;
    }

    const pollText = `📊 **ENCUESTA**\n\n${pollQuestion}\n\n${pollOptions.filter(o => o.trim()).map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}\n\n_Responde con el número de tu opción_`;
    
    setMessageText(pollText);
    setShowPollDialog(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  // Grabar audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const startTime = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioDuration(duration);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      toast.error("No se pudo acceder al micrófono");
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

  const sendAudio = async () => {
    if (!audioBlob) return;

    try {
      const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      sendMessageMutation.mutate({ 
        mensaje: "🎤 Audio", 
        audio_url: file_url,
        audio_duracion: audioDuration,
        adjuntos: []
      });
      
      cancelAudio();
    } catch (error) {
      toast.error("Error al enviar el audio");
    }
  };

  const togglePlayAudio = (audioUrl) => {
    if (playingAudio === audioUrl) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudio(audioUrl);
      }
    }
  };

  const addReaction = async (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    const existingReactions = message.reacciones || [];
    
    // Verificar si ya reaccionó
    const alreadyReacted = existingReactions.find(r => r.user_email === user.email && r.emoji === emoji);
    
    let newReactions;
    if (alreadyReacted) {
      // Quitar reacción
      newReactions = existingReactions.filter(r => !(r.user_email === user.email && r.emoji === emoji));
    } else {
      // Agregar reacción
      newReactions = [...existingReactions, {
        user_email: user.email,
        user_nombre: user.full_name || "Usuario",
        emoji: emoji,
        fecha: new Date().toISOString()
      }];
    }

    await base44.entities.CoordinatorMessage.update(messageId, {
      reacciones: newReactions
    });

    queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
    setShowReactions(null);
  };

  const togglePriority = async () => {
    await base44.entities.CoordinatorConversation.update(conversation.id, {
      prioritaria: !conversation.prioritaria
    });
    queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
    toast.success(conversation.prioritaria ? "Prioridad removida" : "Marcada como prioritaria");
  };

  const changeLabel = async (label) => {
    await base44.entities.CoordinatorConversation.update(conversation.id, {
      etiqueta: label
    });
    queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
    toast.success("Etiqueta actualizada");
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await base44.entities.CoordinatorMessage.create({
        conversacion_id: conversation.id,
        autor: isCoordinator ? "coordinador" : "padre",
        autor_email: user.email,
        autor_nombre: user.full_name || (isCoordinator ? "Coordinador" : "Padre"),
        mensaje: data.mensaje,
        audio_url: data.audio_url,
        audio_duracion: data.audio_duracion,
        adjuntos: data.adjuntos,
        leido_coordinador: isCoordinator,
        leido_padre: !isCoordinator,
        fecha_leido_coordinador: isCoordinator ? new Date().toISOString() : null,
        fecha_leido_padre: !isCoordinator ? new Date().toISOString() : null
      });

      const fieldNoLeidos = isCoordinator ? 'no_leidos_padre' : 'no_leidos_coordinador';
      const fieldEscribiendo = isCoordinator ? 'coordinador_escribiendo' : 'padre_escribiendo';

      await base44.entities.CoordinatorConversation.update(conversation.id, {
        ultimo_mensaje: data.mensaje,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: isCoordinator ? "coordinador" : "padre",
        [fieldNoLeidos]: (conversation[fieldNoLeidos] || 0) + 1,
        [fieldEscribiendo]: false,
        archivada: false
      });

      // Notificación push
      const targetEmail = isCoordinator ? conversation.padre_email : user.email;
      await base44.entities.AppNotification.create({
        usuario_email: targetEmail,
        titulo: `💬 ${isCoordinator ? 'Coordinador' : conversation.padre_nombre}`,
        mensaje: data.mensaje.substring(0, 100),
        tipo: "coordinador_chat",
        icono: "💬",
        enlace: isCoordinator ? "ParentCoordinatorChat" : "CoordinatorChat",
        vista: false
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
      setMessageText("");
      setAttachments([]);
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ mensaje: messageText, adjuntos: attachments });
  };

  const filteredMessages = searchTerm
    ? messages.filter(m => m.mensaje?.toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;

  return (
    <div className="flex flex-col h-full">
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />
      <audio ref={notificationSoundRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZizUIGGS57OihUBILUKXh8raFHwU5jtX0z3k" />

      {/* Header */}
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900">{conversation.padre_nombre}</h2>
              {conversation.prioritaria && <Star className="w-4 h-4 text-orange-500 fill-orange-500" />}
              {conversation.etiqueta && (
                <Badge variant="outline" className="text-xs">{conversation.etiqueta}</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {conversation.jugadores_asociados?.map(j => `${j.jugador_nombre} (${j.categoria})`).join(', ')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Barra de herramientas (solo para coordinador) */}
        {isCoordinator && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={togglePriority}>
              <Star className={`w-4 h-4 mr-1 ${conversation.prioritaria ? 'fill-orange-500 text-orange-500' : ''}`} />
              {conversation.prioritaria ? 'Quitar prioridad' : 'Marcar urgente'}
            </Button>
            <Select value={conversation.etiqueta || ""} onValueChange={changeLabel}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <Tag className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Etiquetar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Sin etiqueta</SelectItem>
                <SelectItem value="Horarios">Horarios</SelectItem>
                <SelectItem value="Quejas">Quejas</SelectItem>
                <SelectItem value="Consulta Partido">Consulta Partido</SelectItem>
                <SelectItem value="Equipación">Equipación</SelectItem>
                <SelectItem value="Transporte">Transporte</SelectItem>
                <SelectItem value="Lesiones">Lesiones</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Búsqueda */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Buscar en mensajes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {filteredMessages.map((msg) => {
          const isMine = (isCoordinator && msg.autor === "coordinador") || (!isCoordinator && msg.autor === "padre");
          const isImage = msg.adjuntos?.some(f => f.tipo?.startsWith('image/'));
          
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[70%] ${isMine ? 'bg-cyan-600 text-white' : 'bg-white text-slate-900'} rounded-2xl p-3 shadow-sm relative`}>
                <p className="text-xs font-semibold mb-1 opacity-70">{msg.autor_nombre}</p>
                
                {msg.audio_url ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant={isMine ? "secondary" : "outline"}
                      onClick={() => togglePlayAudio(msg.audio_url)}
                    >
                      {playingAudio === msg.audio_url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <span className="text-sm">{msg.audio_duracion}s</span>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                )}

                {msg.adjuntos?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.adjuntos.map((file, idx) => (
                      file.tipo?.startsWith('image/') ? (
                        <img 
                          key={idx}
                          src={file.url} 
                          alt={file.nombre}
                          className="rounded cursor-pointer max-w-full h-auto"
                          onClick={() => setShowImagePreview(file.url)}
                        />
                      ) : (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 text-xs p-2 rounded ${isMine ? 'bg-cyan-700' : 'bg-slate-100'}`}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="flex-1 truncate">{file.nombre}</span>
                          <Download className="w-3 h-3" />
                        </a>
                      )
                    ))}
                  </div>
                )}

                {/* Reacciones */}
                {msg.reacciones?.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {msg.reacciones.map((r, idx) => (
                      <span key={idx} className="text-lg" title={r.user_nombre}>
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs opacity-60">
                    {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                    {isMine && (isCoordinator ? msg.leido_padre : msg.leido_coordinador) && " · Visto"}
                  </p>
                  
                  {/* Botón de reacciones */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    onClick={() => setShowReactions(msg.id)}
                  >
                    <Smile className="w-3 h-3" />
                  </Button>
                </div>

                {/* Selector de reacciones */}
                {showReactions === msg.id && (
                  <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-10">
                    {REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(msg.id, emoji)}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button onClick={() => setShowReactions(null)} className="ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {otherPersonTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl p-3 shadow-sm">
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

      {/* Input */}
      <div className="p-3 bg-white border-t">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
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
                  <div className="bg-slate-100 rounded px-2 py-1 text-xs flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{file.nombre}</span>
                    <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {audioBlob && (
          <div className="mb-2 flex items-center gap-2 bg-green-50 rounded-lg p-2">
            <Mic className="w-4 h-4 text-green-600" />
            <span className="text-sm flex-1">Audio {audioDuration}s</span>
            <Button size="sm" onClick={sendAudio} className="h-7">Enviar</Button>
            <Button size="sm" variant="outline" onClick={cancelAudio} className="h-7">✕</Button>
          </div>
        )}

        {isCoordinator && showQuickReplies && (
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

        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <label className="cursor-pointer">
              <input type="file" multiple accept="*/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              <Button type="button" variant="ghost" size="icon" disabled={uploading} className="h-10 w-10">
                <Paperclip className="w-5 h-5 text-slate-500" />
              </Button>
            </label>
            
            <label className="cursor-pointer">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} disabled={uploading} />
              <Button type="button" variant="ghost" size="icon" disabled={uploading} className="h-10 w-10">
                <Camera className="w-5 h-5 text-slate-500" />
              </Button>
            </label>
          </div>

          <Textarea
            placeholder="Mensaje..."
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
            className="flex-1 min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={recording || audioBlob}
          />

          <div className="flex gap-1">
            {!recording && !audioBlob && !messageText.trim() && (
              <>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={startRecording}
                  className="h-10 w-10"
                >
                  <Mic className="w-5 h-5 text-slate-500" />
                </Button>
                
                {isCoordinator && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowPollDialog(true)}
                    className="h-10 w-10"
                  >
                    <BarChart3 className="w-5 h-5 text-slate-500" />
                  </Button>
                )}
              </>
            )}

            {recording && (
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                onClick={stopRecording}
                className="h-10 w-10 animate-pulse bg-red-50"
              >
                <Pause className="w-5 h-5 text-red-600" />
              </Button>
            )}

            {(messageText.trim() || attachments.length > 0) && !recording && !audioBlob && (
              <Button 
                onClick={handleSend} 
                size="icon"
                className="h-10 w-10 bg-cyan-600 hover:bg-cyan-700"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}

            {isCoordinator && messageText.trim() && !recording && !audioBlob && (
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
          </div>
        </div>
      </div>

      {/* Preview de imagen */}
      <Dialog open={!!showImagePreview} onOpenChange={() => setShowImagePreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {showImagePreview && (
            <img src={showImagePreview} alt="Preview" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Crear encuesta */}
      <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📊 Crear Encuesta Rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Pregunta</label>
              <Input
                placeholder="¿Qué prefieres para el torneo?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Opciones</label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input
                    placeholder={`Opción ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="mt-2"
              >
                + Agregar opción
              </Button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPollDialog(false)}>Cancelar</Button>
              <Button onClick={sendPoll}>Enviar Encuesta</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}