import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, X, FileText, Download, MessageCircle, Users, Search, Folder, Check, CheckCheck, Smile, Pin, Reply, Edit, Trash2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import ChatInputActions from "../components/chat/ChatInputActions";
import ChatMessageActions from "../components/chat/ChatMessageActions";
import PollMessage from "../components/chat/PollMessage";
import LocationMessage from "../components/chat/LocationMessage";
import EmojiPicker from "../components/chat/EmojiPicker";
import SearchFilters from "../components/chat/SearchFilters";
import DateSeparator from "../components/chat/DateSeparator";
import NewMessageButton from "../components/chat/NewMessageButton";
import SocialLinks from "../components/SocialLinks";
import { sendWithQueue } from "../components/utils/messageQueue";
import PinnedMessagesBanner from "../components/chat/PinnedMessagesBanner";
import StaffChatInput from "../components/chat/StaffChatInput";
import EmojiScaler from "../components/chat/EmojiScaler";
import ChatImageBubble from "../components/chat/ChatImageBubble";
import ChatAudioBubble from "../components/chat/ChatAudioBubble";
import { useChatUnreadCounts } from "../components/chat/useChatUnreadCounts";

const QUICK_REPLIES = [
  "✅ Perfecto, gracias",
  "👍 Entendido",
  "📝 Lo reviso y confirmo",
  "💪 Seguimos así",
  "🙏 Gracias por avisar"
];

export default function StaffChat() {
  const navigate = useNavigate();
   const [user, setUser] = useState(null);
   const [isStaff, setIsStaff] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterPerson, setFilterPerson] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const REACTIONS = ["👍", "❤️", "😊", "👏", "🎉"];
  const cameraInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const staff = currentUser.es_coordinador || currentUser.es_entrenador || currentUser.role === "admin";
      setIsStaff(staff);

      if (!staff) return;

      // Buscar o crear conversación general de staff
      const conversations = await base44.entities.StaffConversation.filter({ categoria: "General" });
      
      if (conversations.length > 0) {
        setConversation(conversations[0]);
      } else {
        // Crear conversación general de staff
        const newConv = await base44.entities.StaffConversation.create({
          nombre: "Chat Interno Staff",
          categoria: "General",
          participantes: [],
          activa: true
        });
        setConversation(newConv);
      }
    };
    fetchUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['staffMessages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      return await base44.entities.StaffMessage.filter({ conversacion_id: conversation.id }, 'created_date');
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 300000,
    enabled: !!conversation?.id,
  });

  // REAL-TIME: Suscripción a mensajes de staff
  useEffect(() => {
    if (!conversation?.id) return;
    
    const unsub = base44.entities.StaffMessage.subscribe((event) => {
      if (event.data?.conversacion_id === conversation.id) {
        queryClient.invalidateQueries({ queryKey: ['staffMessages', conversation.id] });
      }
    });
    
    return unsub;
  }, [conversation?.id, queryClient]);

  // Calcular mensajes sin leer (solo para badge local) y recargar contadores independientes
  useEffect(() => {
    if (!messages || !user) {
      setUnreadCount(0);
      return;
    }
    const unread = messages.filter(m => 
      m.autor_email !== user.email && 
      !m.leido_por?.some(l => l.email === user.email)
    ).length;
    setUnreadCount(unread);
  }, [messages, user]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersStaff'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
    staleTime: 60000,
  });

  const staffUsersFromDB = allUsers.filter(u => 
    u.es_coordinador || u.es_entrenador || u.role === "admin"
  );

  // Participantes reales: combinar usuarios de BD + personas que han escrito en el chat
  const participantsFromMessages = React.useMemo(() => {
    const map = new Map();
    (messages || []).forEach(m => {
      if (m.autor_email && !map.has(m.autor_email)) {
        map.set(m.autor_email, {
          email: m.autor_email,
          full_name: m.autor_nombre || m.autor_email,
          autor_rol: m.autor_rol,
          es_coordinador: m.autor_rol === 'coordinador',
          es_entrenador: m.autor_rol === 'entrenador',
          role: m.autor_rol === 'admin' ? 'admin' : 'user',
        });
      }
    });
    return map;
  }, [messages]);

  // Unir ambas fuentes (BD + mensajes), priorizando BD si existe
  const staffUsers = React.useMemo(() => {
    const merged = new Map();
    // Primero los de BD (más datos)
    staffUsersFromDB.forEach(u => merged.set(u.email, u));
    // Luego los de mensajes (si no están en BD)
    participantsFromMessages.forEach((u, email) => {
      if (!merged.has(email)) merged.set(email, u);
    });
    return Array.from(merged.values());
  }, [staffUsersFromDB, participantsFromMessages]);

  const pinnedMessages = messages.filter(m => m.anclado === true && !m.eliminado);

  const filteredMessages = messages.filter(msg => {
    if (msg.eliminado) return false;
    
    if (searchTerm && !msg.mensaje?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (filterType !== "all") {
      if (filterType === "text" && (msg.adjuntos?.length > 0 || msg.encuesta || msg.ubicacion)) return false;
      if (filterType === "files" && !msg.adjuntos?.some(f => !f.tipo?.startsWith('image/'))) return false;
      if (filterType === "images" && !msg.adjuntos?.some(f => f.tipo?.startsWith('image/'))) return false;
      if (filterType === "polls" && !msg.encuesta) return false;
      if (filterType === "locations" && !msg.ubicacion) return false;
    }
    
    if (filterPerson !== "all" && msg.autor_email !== filterPerson) {
      return false;
    }
    
    if (filterDate !== "all") {
      const msgDate = new Date(msg.created_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (filterDate === "today" && msgDate < today) return false;
      if (filterDate === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (msgDate < weekAgo) return false;
      }
      if (filterDate === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (msgDate < monthAgo) return false;
      }
    }
    
    return true;
  });

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsScrolledToBottom(atBottom);
  };

  useEffect(() => {
    if (isScrolledToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      setNewMessageCount(0);
    } else if (!isScrolledToBottom && messages.length > 0) {
      setNewMessageCount(prev => prev + 1);
    }
  }, [messages, isScrolledToBottom]);

  // Robust subscriptions: refetch on regain focus/online
  useEffect(() => {
    const onOnline = () => {
      if (!conversation?.id) return;
      queryClient.invalidateQueries({ queryKey: ['staffMessages', conversation.id] });
    };
    const onVis = () => {
      if (!document.hidden && conversation?.id) {
        queryClient.invalidateQueries({ queryKey: ['staffMessages', conversation.id] });
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('visibilitychange', onVis);
    };
  }, [conversation?.id, queryClient]);

  // Marcar como leído via backend persistente
  const { markRead } = useChatUnreadCounts(user);
  useEffect(() => {
    if (!conversation?.id || !user?.email) return;
    markRead('staff', conversation.id);
  }, [conversation?.id, user?.email]);

  const allSharedFiles = messages.flatMap(m => m.adjuntos || m.archivos_adjuntos || []);

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
      if (uploaded.length > 0) {
        toast.success("Archivos adjuntados");
        return uploaded; // Retornar para que el input los gestione
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
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const fileObj = {
        url: file_url,
        nombre: file.name,
        tipo: file.type,
        tamano: file.size
      };
      toast.success("Foto capturada");
      return fileObj; // Retornar para que el input lo gestione
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

  const sendLocationFromBrowser = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          sendMessageMutation.mutate({
            mensaje: "📍 Ubicación compartida",
            adjuntos: [],
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

  const sendPoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      toast.error("Necesitas una pregunta y al menos 2 opciones");
      return;
    }

    sendMessageMutation.mutate({
      mensaje: "📊 Encuesta",
      adjuntos: [],
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
    toast.success("Encuesta enviada");
  };

  const sendMessageMutation = useMutation({
    onMutate: async (messageData) => {
      await queryClient.cancelQueries({ queryKey: ['staffMessages', conversation?.id] });
      const previousMessages = queryClient.getQueryData(['staffMessages', conversation?.id]);
      
      const displayName = user.role === "admin" ? "Administrador" : user.full_name || "Staff";
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        mensaje: messageData.mensaje,
        autor_email: user.email,
        autor_nombre: displayName,
        archivos_adjuntos: messageData.adjuntos || [],
        adjuntos: messageData.adjuntos || [],
        audio_url: messageData.audio_url,
        audio_duracion: messageData.audio_duracion,
        encuesta: messageData.encuesta,
        ubicacion: messageData.ubicacion,
        created_date: new Date().toISOString(),
        leido_por: [{ email: user.email, nombre: user.full_name }],
      };
      
      queryClient.setQueryData(['staffMessages', conversation?.id], (old = []) => [...old, optimisticMessage]);
      return { previousMessages };
    },
    onError: (err, messageData, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['staffMessages', conversation?.id], context.previousMessages);
      }
      toast.error("Error al enviar mensaje");
    },
    mutationFn: async (messageData) => {
       const autorRol = user.role === "admin" ? "admin" : user.es_coordinador ? "coordinador" : "entrenador";
       const displayName = user.role === "admin" ? "Administrador" : user.full_name;

       const newMessage = await base44.entities.StaffMessage.create({
         conversacion_id: conversation.id,
         autor_email: user.email,
         autor_nombre: displayName,
         autor_rol: autorRol,
         mensaje: messageData.mensaje,
         audio_url: messageData.audio_url,
         audio_duracion: messageData.audio_duracion,
         adjuntos: messageData.adjuntos,
         encuesta: messageData.encuesta,
         ubicacion: messageData.ubicacion,
         respuesta_a: messageData.respuesta_a,
         mensaje_citado: messageData.mensaje_citado,
         leido_por: [{ email: user.email, nombre: user.full_name, fecha: new Date().toISOString() }]
       });

      await base44.entities.StaffConversation.update(conversation.id, {
        ultimo_mensaje: messageData.mensaje,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: user.full_name
      });

      // Crear notificaciones sin depender de listar usuarios (respeta permisos)
      try {
        const notifPayload = {
          titulo: "Nuevo mensaje en Staff",
          mensaje: (messageData.mensaje || "Archivo/acción en el chat").slice(0, 120),
          tipo: "mensaje",
          prioridad: "importante",
          enlace: "StaffChat",
          vista: false
        };

        const tasks = [];

        // Notificar a coordinadores (con fallback por Usuarios)
        try {
          const coordSettings = await base44.entities.CoordinatorSettings.list();
          let coordEmails = Array.from(new Set((coordSettings || []).map(s => s.coordinador_email).filter(Boolean)));
          if (coordEmails.length === 0 && user.role === 'admin') {
            try {
              const coords = await base44.entities.User.filter({ es_coordinador: true });
              coordEmails = Array.from(new Set(coords.map(u => u.email).filter(Boolean)));
            } catch {}
          }
          coordEmails
            .filter(email => email && email !== user.email)
            .forEach(email => tasks.push(base44.entities.AppNotification.create({ usuario_email: email, ...notifPayload })));
        } catch {}

        // Notificar a entrenadores (con fallback por Usuarios)
        try {
          const coachSettings = await base44.entities.CoachSettings?.list?.();
          let coachEmails = Array.from(new Set((coachSettings || []).map(s => s.entrenador_email || s.coach_email).filter(Boolean)));
          if (coachEmails.length === 0 && user.role === 'admin') {
            try {
              const coaches = await base44.entities.User.filter({ es_entrenador: true });
              coachEmails = Array.from(new Set(coaches.map(u => u.email).filter(Boolean)));
            } catch {}
          }
          coachEmails
            .filter(email => email && email !== user.email)
            .forEach(email => tasks.push(base44.entities.AppNotification.create({ usuario_email: email, ...notifPayload })));
        } catch {}

        await Promise.all(tasks);
      } catch {}

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
      setReplyingTo(null);
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ id, mensaje }) => {
      await base44.entities.StaffMessage.update(id, {
        mensaje,
        editado: true,
        fecha_edicion: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
      toast.success("Mensaje editado");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.StaffMessage.update(messageId, {
        eliminado: true,
        mensaje: "Este mensaje fue eliminado"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
      toast.success("Mensaje eliminado");
    },
  });

  const addReaction = async (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    const existingReactions = message.reacciones || [];
    
    const alreadyReacted = existingReactions.find(r => r.email === user.email && r.emoji === emoji);
    
    let newReactions;
    if (alreadyReacted) {
      newReactions = existingReactions.filter(r => !(r.email === user.email && r.emoji === emoji));
    } else {
      newReactions = [...existingReactions, {
        email: user.email,
        nombre: user.full_name,
        emoji: emoji,
        fecha: new Date().toISOString()
      }];
    }

    await base44.entities.StaffMessage.update(messageId, {
      reacciones: newReactions
    });

    queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
    setShowReactions(null);
  };

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

      await base44.entities.StaffMessage.update(messageId, {
        encuesta: {
          ...msg.encuesta,
          votos
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
      toast.success("Voto registrado");
    },
  });

  const unpinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.StaffMessage.update(messageId, {
        anclado: false,
        anclado_por: null,
        anclado_fecha: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
      toast.success("Mensaje desanclado");
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.StaffMessage.update(messageId, {
        anclado: true,
        anclado_por: user.email,
        anclado_fecha: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
      toast.success("Mensaje anclado");
    },
  });

  // Callback que recibe el mensaje del input aislado
  const handleSendMessage = (messageData) => {
    if (editingMessage) {
      setEditingMessage(null);
      editMessageMutation.mutate({
        id: editingMessage.id,
        mensaje: messageData.mensaje
      });
      return;
    }
    
    // Agregar respuesta si aplica
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

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Solo el staff del club puede acceder</p>
      </div>
    );
  }

  if (!conversation || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-slate-500 text-sm">Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[100px] lg:pt-0 pb-0 lg:relative lg:inset-auto lg:h-[calc(100vh-0px)]">
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingAudio(null)}
        onError={() => {
          setPlayingAudio(null);
          toast.error("Error al cargar el audio");
        }}
      />
      <Card className="border-purple-200 shadow-lg h-full flex flex-col overflow-hidden lg:rounded-lg rounded-none">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-2 flex-shrink-0">
           <div className="flex items-center justify-between">
             <CardTitle className="flex items-center gap-2 text-sm">
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => navigate(-1)}
                 className="text-white hover:bg-white/20 h-8 w-8 p-0 mr-1"
                 title="Volver atrás"
               >
                 <ChevronLeft className="w-4 h-4" />
               </Button>
               <MessageCircle className="w-4 h-4" />
               💼 Chat Interno Staff
               {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs animate-pulse">{unreadCount}</Badge>
               )}
             </CardTitle>
             <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGallery(!showGallery)}
                className="text-white hover:bg-white/20 text-xs"
              >
                <Folder className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline text-xs">Archivos</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowParticipants(true)}
                className="text-white hover:bg-white/20 text-xs"
              >
                <Users className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline text-xs">{staffUsers?.length || 0}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
          <SearchFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            filterPerson={filterPerson}
            onFilterPersonChange={setFilterPerson}
            filterDate={filterDate}
            onFilterDateChange={setFilterDate}
            allParticipants={staffUsers.map(u => ({ email: u.email, nombre: u.full_name }))}
          />

          {/* Mensajes Anclados */}
          <PinnedMessagesBanner 
            pinnedMessages={pinnedMessages}
            onUnpin={(id) => unpinMessageMutation.mutate(id)}
            canUnpin={true}
          />

          {/* Botón "Nuevo mensaje" - después del filtro */}
          {!isScrolledToBottom && newMessageCount > 0 && (
            <NewMessageButton 
              onClick={() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                setNewMessageCount(0);
              }}
              unreadCount={newMessageCount}
            />
          )}

          {showGallery && (
            <div className="p-4 bg-white border-b max-h-[200px] overflow-y-auto flex-shrink-0">
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

          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-3 space-y-0 min-h-0 relative" 
            style={{backgroundColor: '#E5DDD5'}}
            onScroll={handleScroll}
          >
            {replyingTo && (
              <div className="sticky top-0 z-10 bg-purple-50 border-l-4 border-purple-500 p-2 rounded flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-purple-900">Respondiendo a {replyingTo.autor_nombre}</p>
                  <p className="text-xs text-purple-700 truncate">{replyingTo.mensaje}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {filteredMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-xs sm:text-sm">
                  {searchTerm ? "No se encontraron mensajes" : "¡Inicia la conversación!"}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, idx, arr) => {
                const isMine = msg.autor_email === user.email;
                const prevMsg = idx > 0 ? arr[idx - 1] : null;
                const showDateSeparator = !prevMsg || !isSameDay(new Date(prevMsg.created_date), new Date(msg.created_date));
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && <DateSeparator date={msg.created_date} />}
                    
                    <div className={`flex ${isMine ? 'justify-end mr-2' : 'justify-start ml-2'} group mb-1.5`}>
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
                        {msg.mensaje_citado && (
                          <div className={`mb-2 p-2 rounded border-l-2 ${
                            isMine ? 'bg-purple-700 border-purple-400' : 'bg-slate-100 border-slate-400'
                          }`}>
                            <p className="text-xs opacity-70">{msg.mensaje_citado.autor_nombre}</p>
                            <p className="text-xs italic truncate">{msg.mensaje_citado.mensaje}</p>
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-semibold opacity-70">
                              {msg.autor_rol === "coordinador" ? "🎓 " : msg.autor_rol === "admin" ? "👑 " : "🏃 "}
                              {msg.autor_nombre}
                            </p>
                            {msg.autor_rol === "coordinador" && (
                              <Badge className="text-[10px] bg-cyan-600 px-1 py-0 h-4">Coordinador</Badge>
                            )}
                            {msg.autor_rol === "admin" && (
                              <Badge className="text-[10px] bg-orange-600 px-1 py-0 h-4">Admin</Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {isMine && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                onClick={() => msg.anclado ? unpinMessageMutation.mutate(msg.id) : pinMessageMutation.mutate(msg.id)}
                                title={msg.anclado ? "Desanclar" : "Anclar mensaje"}
                              >
                                <Pin className={`w-3 h-3 ${msg.anclado ? 'text-yellow-600 fill-yellow-600' : ''}`} />
                              </Button>
                            )}
                            <ChatMessageActions
                              message={msg}
                              isMine={isMine}
                              isStaff={true}
                              onReply={(m) => setReplyingTo(m)}
                              onEdit={(m) => {
                                setEditingMessage(m);
                                toast.info("Edición de mensajes desde el input próximamente");
                              }}
                              onDelete={(m) => deleteMessageMutation.mutate(m.id)}
                              onForward={(m) => {}}
                            />
                          </div>
                        </div>

                        {msg.audio_url ? (
                          <div className="mt-1">
                            <ChatAudioBubble url={msg.audio_url} duration={msg.audio_duracion} isMine={isMine} />
                          </div>
                        ) : (
                         <p style={{fontSize: '15px', lineHeight: '1.4', fontWeight: 400, whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>
                           <EmojiScaler content={msg.mensaje} />
                           {msg.editado && <span className="text-xs ml-1 opacity-60">(editado)</span>}
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
                          const attachments = msg.adjuntos || [];
                          const images = attachments.filter(f => f.tipo?.startsWith('image/') || f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                          const audios = attachments.filter(f => f.tipo?.startsWith('audio/'));
                          const files = attachments.filter(f => !f.tipo?.startsWith('image/') && !f.tipo?.startsWith('audio/'));
                          return (
                            <>
                              {images.length > 0 && <div className="mt-1"><ChatImageBubble images={images} isMine={isMine} /></div>}
                              {audios.map((file, idx) => <div key={`a-${idx}`} className="mt-1"><ChatAudioBubble url={file.url} duration={file.duracion} isMine={isMine} /></div>)}
                              {files.length > 0 && <div className="mt-1 space-y-1">{files.map((file, idx) => (
                                <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs p-2 rounded ${isMine ? 'bg-purple-700' : 'bg-slate-100'}`}>
                                  <FileText className="w-3 h-3" /><span className="flex-1 truncate">{file.nombre}</span><Download className="w-3 h-3" />
                                </a>
                              ))}</div>}
                            </>
                          );
                        })()}

                        {msg.reacciones?.length > 0 && (
                          <EmojiScaler reactions={msg.reacciones} />
                        )}

                        <div className="flex items-center gap-1 justify-end mt-1">
                          <p style={{fontSize: '11px', opacity: 0.6}}>
                            {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                          </p>
                          
                          {/* Doble check visual - solo en mensajes propios */}
                          {isMine && (
                            <div className="flex items-center">
                              {msg.leido_por?.length > 1 ? (
                                <CheckCheck className="w-3 h-3 text-white opacity-70" />
                              ) : (
                                <Check className="w-3 h-3 opacity-50" />
                              )}
                            </div>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`opacity-50 hover:opacity-100 h-5 w-5 p-0 ${isMine ? 'text-white' : 'text-slate-600'}`}
                            onClick={() => setShowReactions(msg.id)}
                          >
                            <Smile className="w-3 h-3" />
                          </Button>
                        </div>

                        {showReactions === msg.id && (
                          <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-xl p-2 flex gap-2 z-10 border">
                            {REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(msg.id, emoji)}
                                className="text-2xl hover:scale-125 transition-transform"
                              >
                                {emoji}
                              </button>
                            ))}
                            <button onClick={() => setShowReactions(null)} className="ml-2 text-slate-400 hover:text-slate-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <StaffChatInput
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            onCameraCapture={handleCameraCapture}
            onLocationClick={() => setShowLocationDialog(true)}
            onPollClick={() => setShowPollDialog(true)}
            onExerciseClick={() => setShowQuickReplies(!showQuickReplies)}
            uploading={uploading}
            showExercise={false}
            placeholder="Escribe un mensaje..."
          />
        </CardContent>
      </Card>

      {/* Diálogo de ubicación */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📍 Enviar Ubicación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nombre del lugar (ej: Campo de fútbol)"
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
              <Button onClick={sendLocationFromBrowser} className="flex-1 bg-purple-600">
                Enviar mi ubicación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de encuesta */}
      <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📊 Crear Encuesta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Pregunta de la encuesta"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
            />
            {pollOptions.map((opt, idx) => (
              <Input
                key={idx}
                placeholder={`Opción ${idx + 1}`}
                value={opt}
                onChange={(e) => {
                  const newOptions = [...pollOptions];
                  newOptions[idx] = e.target.value;
                  setPollOptions(newOptions);
                }}
              />
            ))}
            <Button
              variant="outline"
              onClick={() => setPollOptions([...pollOptions, ""])}
              className="w-full"
            >
              + Añadir opción
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPollDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={sendPoll} className="flex-1 bg-purple-600">
                Enviar Encuesta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de participantes */}
      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>👥 Participantes del Chat ({staffUsers.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {staffUsers.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No hay participantes aún</p>
            ) : (
              staffUsers.map((staffUser, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-3 border">
                <div className="flex items-center gap-2">
                  {staffUser.es_coordinador && <span>🎓</span>}
                  {staffUser.es_entrenador && <span>🏃</span>}
                  {staffUser.role === "admin" && <span>👑</span>}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{staffUser.full_name}</p>
                    <p className="text-xs text-slate-600">{staffUser.email}</p>
                    <div className="flex gap-1 mt-1">
                      {staffUser.role === "admin" && <Badge className="text-xs bg-orange-600">Admin</Badge>}
                      {staffUser.es_coordinador && <Badge className="text-xs bg-cyan-600">Coordinador</Badge>}
                      {staffUser.es_entrenador && <Badge className="text-xs bg-blue-600">Entrenador</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Vista previa de imagen */}
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