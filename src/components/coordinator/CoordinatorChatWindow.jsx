import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Paperclip, X, FileText, Download, Mic, Play, Pause, Search, Star, Smile, MessageCircle, MapPin, Reply, Edit, Trash2, Pin, Check, CheckCheck, ChevronLeft, MoreHorizontal, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import ChatMessageActions from "../chat/ChatMessageActions";
import PollMessage from "../chat/PollMessage";
import LocationMessage from "../chat/LocationMessage";
import PinnedMessagesBanner from "../chat/PinnedMessagesBanner";
import EmojiPicker from "../chat/EmojiPicker";
import CoordinatorChatInput from "../chat/CoordinatorChatInput";
import EmojiScaler from "../chat/EmojiScaler";
import ChatImageBubble from "../chat/ChatImageBubble";
import ChatAudioBubble from "../chat/ChatAudioBubble";
import { useAudioRecording } from "../chat/useAudioRecording";

const REACTIONS = ["👍", "❤️", "✅", "👏", "🎉"];

export default function CoordinatorChatWindow({ conversation, user, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef(null);

  const isCoordinator = user?.es_coordinador || user?.role === "admin";

  const { data: messages = [] } = useQuery({
    queryKey: ['coordinatorMessages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      return await base44.entities.CoordinatorMessage.filter({ conversacion_id: conversation.id }, 'created_date');
    },
    enabled: !!conversation?.id,
  });

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.entities.CoordinatorMessage.subscribe((event) => {
      if (event.data?.conversacion_id === conversation.id) {
        queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      }
    });
    return unsub;
  }, [conversation?.id, queryClient]);

  const { data: conversationState } = useQuery({
    queryKey: ['coordinatorConversationState', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return null;
      const data = await base44.entities.CoordinatorConversation.filter({ id: conversation.id });
      return data[0];
    },
    refetchInterval: false,
    staleTime: 60000,
    enabled: !!conversation?.id,
  });

  const otherPersonTyping = isCoordinator 
    ? conversationState?.padre_escribiendo 
    : conversationState?.coordinador_escribiendo;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [messages, conversation?.id]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      // usar scroll instantáneo para asegurar quedarse abajo
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [conversation?.id, messages.length]);

  // Scroll tracking para botón de mensajes nuevos
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isAtBottom) {
        setShowNewMessageButton(false);
        setUnreadCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Detectar nuevos mensajes del padre mientras no estás al final
  useEffect(() => {
    if (!scrollContainerRef.current || !messages || messages.length === 0 || !user) return;
    
    const container = scrollContainerRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (!isAtBottom) {
      const unreadFromParent = messages.filter(msg => 
        msg.autor === "padre" && !msg.leido_coordinador
      );
      
      if (unreadFromParent.length > 0) {
        setUnreadCount(unreadFromParent.length);
        setShowNewMessageButton(true);
      }
    }
  }, [messages, user]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      setShowNewMessageButton(false);
      setUnreadCount(0);
    }
  };

  const handleTyping = async () => {
    if (!conversation?.id) return;
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

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.7);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploaded = [];
      for (const file of files) {
        if (file.type.startsWith('video/')) {
          toast.error("❌ No se pueden enviar videos");
          continue;
        }
        
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }
        
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });
        uploaded.push({
          url: file_url,
          nombre: file.name,
          tipo: file.type,
          tamano: file.size
        });
      }
      if (uploaded.length > 0) {
        toast.success("Archivos adjuntados");
        return uploaded;
      }
      return [];
    } catch (error) {
      toast.error("Error al subir archivos");
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return null;
    
    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
      const fileObj = {
        url: file_url,
        nombre: file.name,
        tipo: file.type,
        tamano: file.size
      };
      toast.success("Foto capturada");
      return fileObj;
    } catch (error) {
      toast.error("Error al capturar foto");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const togglePlayAudio = async (audioUrl) => {
    try {
      if (playingAudio === audioUrl) {
        audioRef.current?.pause();
        setPlayingAudio(null);
      } else {
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
          setPlayingAudio(audioUrl);
        }
      }
    } catch (error) {
      setPlayingAudio(null);
      toast.error("Error al reproducir el audio");
    }
  };

  const sendPoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      toast.error("Necesitas una pregunta y al menos 2 opciones");
      return;
    }

    sendMessageMutation.mutate({
      mensaje: "📊 Encuesta",
      archivos_adjuntos: [],
      encuesta: {
        pregunta: pollQuestion,
        opciones: pollOptions.filter(o => o.trim()),
        votos: [],
        cerrada: false
      }
    });
    
    setShowPollDialog(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const addReaction = async (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    const existingReactions = message.reacciones || [];
    
    const alreadyReacted = existingReactions.find(r => r.user_email === user.email && r.emoji === emoji);
    
    let newReactions;
    if (alreadyReacted) {
      newReactions = existingReactions.filter(r => !(r.user_email === user.email && r.emoji === emoji));
    } else {
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

  const getPinnedMessages = () => {
    try {
      return messages.filter(m => m.anclado === true);
    } catch (e) {
      return [];
    }
  };
  
  const pinnedMessages = getPinnedMessages();

  // Resumen hijos (para cabecera compacta)
  const childNames = conversation?.jugadores_asociados?.map(j => j.jugador_nombre) || [];
  const extraChildren = Math.max(0, (childNames.length || 0) - 1);

  // Clasificación: cambiar etiqueta / prioridad
  const handleChangeEtiqueta = async (value) => {
    if (!conversation?.id) return;
    await base44.entities.CoordinatorConversation.update(conversation.id, { etiqueta: value });
    toast.success("Etiqueta actualizada");
    queryClient.invalidateQueries({ queryKey: ['coordinatorConversationState', conversation.id] });
    queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
  };

  const togglePrioritaria = async () => {
    if (!conversation?.id) return;
    const next = !conversation.prioritaria;
    await base44.entities.CoordinatorConversation.update(conversation.id, { prioritaria: next });
    toast.success(next ? "Marcada como prioritaria" : "Prioridad desactivada");
    queryClient.invalidateQueries({ queryKey: ['coordinatorConversationState', conversation.id] });
    queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
  };

  const sendLocationFromBrowser = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          sendMessageMutation.mutate({
            mensaje: "📍 Ubicación compartida",
            archivos_adjuntos: [],
            ubicacion: {
              latitud: latitude,
              longitud: longitude,
              nombre: locationName,
              direccion: locationAddress
            }
          });
          
          setShowLocationDialog(false);
          setLocationName("");
          setLocationAddress("");
          toast.success("Ubicación enviada");
        },
        () => {
          toast.error("No se pudo obtener tu ubicación");
        }
      );
    } else {
      toast.error("Tu navegador no soporta geolocalización");
    }
  };

  const sendMessageMutation = useMutation({
    onMutate: async (messageData) => {
      await queryClient.cancelQueries({ queryKey: ['coordinatorMessages', conversation?.id] });
      const previousMessages = queryClient.getQueryData(['coordinatorMessages', conversation?.id]);
      
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        mensaje: messageData.mensaje,
        autor: isCoordinator ? "coordinador" : "padre",
        autor_email: user.email,
        autor_nombre: user.full_name || (isCoordinator ? "Coordinador" : "Padre"),
        archivos_adjuntos: messageData.adjuntos || [],
        audio_url: messageData.audio_url,
        audio_duracion: messageData.audio_duracion,
        created_date: new Date().toISOString(),
        leido_coordinador: isCoordinator,
        leido_padre: !isCoordinator,
      };
      
      queryClient.setQueryData(['coordinatorMessages', conversation?.id], (old = []) => [...old, optimisticMessage]);
      return { previousMessages };
    },
    onError: (err, messageData, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['coordinatorMessages', conversation?.id], context.previousMessages);
      }
      toast.error("Error al enviar mensaje");
    },
    mutationFn: async (messageData) => {
      if (!conversation?.id || !user?.email || !messageData.mensaje?.trim()) {
        throw new Error("Datos obligatorios faltantes");
      }

      const messagePayload = {
        conversacion_id: conversation.id,
        autor: isCoordinator ? "coordinador" : "padre",
        autor_email: user.email,
        autor_nombre: user.full_name || (isCoordinator ? "Coordinador" : "Padre"),
        mensaje: messageData.mensaje.trim(),
        leido_coordinador: isCoordinator,
        leido_padre: !isCoordinator,
        archivos_adjuntos: messageData.adjuntos || messageData.archivos_adjuntos || []
      };

      if (messageData.audio_url) {
        messagePayload.audio_url = messageData.audio_url;
        messagePayload.audio_duracion = messageData.audio_duracion || 0;
      }
      if (messageData.encuesta) {
        messagePayload.encuesta = messageData.encuesta;
      }
      if (messageData.ubicacion) {
        messagePayload.ubicacion = messageData.ubicacion;
      }
      if (messageData.respuesta_a) {
        messagePayload.respuesta_a = messageData.respuesta_a;
        messagePayload.mensaje_citado = messageData.mensaje_citado;
      }

      const newMessage = await base44.entities.CoordinatorMessage.create(messagePayload);

      const fieldNoLeidos = isCoordinator ? 'no_leidos_padre' : 'no_leidos_coordinador';
      const fieldEscribiendo = isCoordinator ? 'coordinador_escribiendo' : 'padre_escribiendo';

      await base44.entities.CoordinatorConversation.update(conversation.id, {
        ultimo_mensaje: messageData.mensaje,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: isCoordinator ? "coordinador" : "padre",
        [fieldNoLeidos]: (conversation[fieldNoLeidos] || 0) + 1,
        [fieldEscribiendo]: false,
        archivada: false
      });

      if (!isCoordinator && conversation.coordinador_email) {
        await base44.entities.AppNotification.create({
          usuario_email: conversation.coordinador_email,
          titulo: `💬 Mensaje de ${user.full_name}`,
          mensaje: (messageData.mensaje || "Mensaje").substring(0, 100),
          tipo: "importante",
          icono: "💬",
          enlace: "CoordinatorChat",
          vista: false
        });
      } else if (isCoordinator && conversation.padre_email) {
        await base44.entities.AppNotification.create({
          usuario_email: conversation.padre_email,
          titulo: `🎓 Mensaje del Coordinador`,
          mensaje: (messageData.mensaje || "Mensaje").substring(0, 100),
          tipo: "importante",
          icono: "🎓",
          enlace: "ParentCoordinatorChat",
          vista: false
        });
      }

      return newMessage;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
    },
  });

  const handleSendMessage = (messageData) => {
    if (editingMessage) {
      setEditingMessage(null);
      editMessageMutation.mutate({
        id: editingMessage.id,
        mensaje: messageData.mensaje
      });
      return;
    }
    
    if (replyingTo) {
      messageData.respuesta_a = replyingTo.id;
      messageData.mensaje_citado = {
        autor_nombre: replyingTo.autor_nombre,
        mensaje: replyingTo.mensaje.substring(0, 100)
      };
    }
    
    sendMessageMutation.mutate(messageData);
    setReplyingTo(null);
  };

  const editMessageMutation = useMutation({
    mutationFn: async ({ id, mensaje }) => {
      await base44.entities.CoordinatorMessage.update(id, {
        mensaje,
        editado: true,
        fecha_edicion: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      toast.success("Mensaje editado");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.CoordinatorMessage.update(messageId, {
        eliminado: true,
        mensaje: "Este mensaje fue eliminado"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      toast.success("Mensaje eliminado");
    },
  });

  const votePollMutation = useMutation({
    mutationFn: async ({ messageId, optionIndex }) => {
      const msg = messages.find(m => m.id === messageId);
      const votos = msg.encuesta?.votos || [];
      
      votos.push({
        usuario_email: user.email,
        usuario_nombre: user.full_name,
        opcion_index: optionIndex,
        fecha: new Date().toISOString()
      });

      await base44.entities.CoordinatorMessage.update(messageId, {
        encuesta: {
          ...msg.encuesta,
          votos
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
    },
  });

  const unpinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.CoordinatorMessage.update(messageId, {
        anclado: false,
        anclado_por: null,
        anclado_fecha: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.CoordinatorMessage.update(messageId, {
        anclado: true,
        anclado_por: user.email,
        anclado_fecha: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
    },
  });

  if (!conversation || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Cargando chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden min-h-0">
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingAudio(null)}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 border-b flex-shrink-0 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-4 h-4" />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{conversation.padre_nombre}</h3>
              <div className="flex items-center gap-1 text-[11px] text-white/80 min-w-0">
                <span className="truncate max-w-[160px]">{childNames[0] || ''}</span>
                {extraChildren > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/15 text-white whitespace-nowrap">+{extraChildren}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {isCoordinator && (
          <div className="mt-2 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={conversation.etiqueta || "Otro"} onValueChange={handleChangeEtiqueta}>
                <SelectTrigger className="h-8 w-40 sm:w-56 bg-white/10 text-white border-white/20">
                  <SelectValue placeholder="Etiqueta" />
                </SelectTrigger>
                <SelectContent className="z-[1000]">
                  <SelectItem value="Horarios">Horarios</SelectItem>
                  <SelectItem value="Quejas">Quejas</SelectItem>
                  <SelectItem value="Consulta Partido">Consulta Partido</SelectItem>
                  <SelectItem value="Equipación">Equipación</SelectItem>
                  <SelectItem value="Transporte">Transporte</SelectItem>
                  <SelectItem value="Lesiones">Lesiones</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={togglePrioritaria} className="text-white hover:bg-white/20 h-8 px-3" title={conversation.prioritaria ? "Quitar prioridad" : "Marcar prioritaria"}>
                <Star className={`w-4 h-4 ${conversation.prioritaria ? 'text-orange-300 fill-orange-300' : ''}`} />
                <span className="ml-1 hidden sm:inline text-xs">Prioridad</span>
              </Button>
            </div>
            <div className="flex items-center gap-2">
            </div>
          </div>
        )}
      </div>

      {/* Pinned Messages */}
      <PinnedMessagesBanner 
        pinnedMessages={pinnedMessages}
        onUnpin={(id) => unpinMessageMutation.mutate(id)}
        canUnpin={isCoordinator}
      />

      {/* Messages Area - scrollable */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 pb-24 min-h-0 scroll-smooth relative" style={{backgroundColor: '#E5DDD5'}}>
        {messages.map((msg, idx) => {
          const isMine = (isCoordinator && msg.autor === "coordinador") || (!isCoordinator && msg.autor === "padre");
          
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end mr-2' : 'justify-start ml-2'} group mb-1.5`}>
              <div className={`max-w-[72%] rounded-2xl px-3 py-2 relative`} style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSize: '15px',
                lineHeight: '1.4',
                fontWeight: 400,
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                backgroundColor: isMine ? '#DCF8C6' : '#FFFFFF',
                boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
              }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold opacity-70">
                    {msg.autor === "coordinador" ? "Coordinador" : msg.autor_nombre}
                  </p>
                  <ChatMessageActions
                    message={msg}
                    isMine={isMine}
                    isStaff={isCoordinator}
                    onReply={(m) => setReplyingTo(m)}
                    onEdit={(m) => {
                      setEditingMessage(m);
                      toast.info("Edición próximamente");
                    }}
                    onDelete={(m) => deleteMessageMutation.mutate(m.id)}
                  />
                </div>

                {msg.audio_url ? (
                  <div className="mt-1">
                    <ChatAudioBubble url={msg.audio_url} duration={msg.audio_duracion} isMine={isMine} />
                  </div>
                ) : (
                 <p style={{fontSize: '15px', lineHeight: '1.4', fontWeight: 400, whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>
                   <EmojiScaler content={msg.mensaje} />
                   {msg.editado && <span className="text-xs opacity-50 ml-1">(editado)</span>}
                 </p>
                )}

                {msg.ubicacion && <LocationMessage ubicacion={msg.ubicacion} />}
                
                {msg.encuesta && (
                  <PollMessage 
                    encuesta={msg.encuesta} 
                    messageId={msg.id}
                    userEmail={user.email}
                    userName={user.full_name}
                    onVote={(msgId, optionIdx) => votePollMutation.mutate({ messageId: msgId, optionIndex: optionIdx })}
                    isCreator={msg.autor_email === user.email}
                  />
                )}

                {(() => {
                  const attachments = msg.archivos_adjuntos || [];
                  const images = attachments.filter(f => f.tipo?.startsWith('image/') || f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                  const audios = attachments.filter(f => f.tipo?.startsWith('audio/'));
                  const files = attachments.filter(f => !f.tipo?.startsWith('image/') && !f.tipo?.startsWith('audio/'));
                  return (
                    <>
                      {images.length > 0 && <div className="mt-1"><ChatImageBubble images={images} isMine={isMine} /></div>}
                      {audios.map((file, idx) => <div key={`a-${idx}`} className="mt-1"><ChatAudioBubble url={file.url} duration={file.duracion} isMine={isMine} /></div>)}
                      {files.length > 0 && <div className="mt-1 space-y-1">{files.map((file, idx) => (
                        <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs p-2 rounded ${isMine ? 'bg-cyan-700' : 'bg-slate-100'}`}>
                          <FileText className="w-3 h-3" /><span className="flex-1 truncate">{file.nombre}</span><Download className="w-3 h-3" />
                        </a>
                      ))}</div>}
                    </>
                  );
                })()}

                <div className="flex items-center gap-1 justify-end mt-1">
                  <p style={{fontSize: '11px', opacity: 0.6}}>
                    {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                  </p>
                  {isMine && (
                    <div className="flex items-center">
                      {(isCoordinator ? msg.leido_padre : msg.leido_coordinador) ? (
                        <CheckCheck className="w-3 h-3 text-white opacity-70" />
                      ) : (
                        <Check className="w-3 h-3 opacity-50" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {otherPersonTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />

        {/* Botón flotante de mensajes nuevos */}
        {showNewMessageButton && unreadCount > 0 && (
          <Button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-cyan-600 hover:bg-cyan-700 text-white shadow-xl animate-bounce z-10"
            size="lg"
          >
            <ChevronDown className="w-5 h-5 mr-2" />
            {unreadCount} {unreadCount === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}
          </Button>
        )}
      </div>

      {/* Input Bar */}
      <div className="border-t bg-white flex-shrink-0 sticky bottom-0 z-10">
         <CoordinatorChatInput
           onSendMessage={handleSendMessage}
           onFileUpload={handleFileUpload}
           onCameraCapture={handleCameraCapture}
           onLocationClick={() => setShowLocationDialog(true)}
           onPollClick={() => setShowPollDialog(true)}
           uploading={uploading}
           placeholder="Escribe un mensaje..."
         />
       </div>

      {/* Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📍 Enviar Ubicación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nombre del lugar"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
            <Input
              placeholder="Dirección (opcional)"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLocationDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={sendLocationFromBrowser} className="flex-1 bg-blue-600">
                <MapPin className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      <Dialog open={!!showImagePreview} onOpenChange={() => setShowImagePreview(null)}>
        <DialogContent className="max-w-2xl">
          {showImagePreview && (
            <img src={showImagePreview} alt="Preview" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Poll Dialog */}
      <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📊 Crear Encuesta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Pregunta</label>
              <Input
                placeholder="¿Qué prefieres?"
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
              <Button onClick={sendPoll}>Enviar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}