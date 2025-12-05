import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, AlertCircle, Users, MessageCircle, User, Archive, ArchiveRestore, Filter, BarChart3, Check, CheckCheck, Search, Pin, Image, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";
import PrivateChatPanel from "../components/chat/PrivateChatPanel";
import QuickPollDialog from "../components/chat/QuickPollDialog";
import PollMessage from "../components/chat/PollMessage";
import ReadConfirmation from "../components/chat/ReadConfirmation";
import ChatSearchDialog from "../components/chat/ChatSearchDialog";
import PinnedMessagesDialog from "../components/chat/PinnedMessagesDialog";
import MediaGalleryDialog from "../components/chat/MediaGalleryDialog";
import { usePageTutorial } from "../components/tutorials/useTutorial";

export default function CoachChat() {
  usePageTutorial("coach_chat");
  
  const [messageContent, setMessageContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null); // Categoría seleccionada
  const [chatSubMode, setChatSubMode] = useState("anuncios"); // "anuncios" o "privado" dentro de cada categoría
  const [attachments, setAttachments] = useState([]);
  const [priority, setPriority] = useState("Normal");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showPinnedDialog, setShowPinnedDialog] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 segundos
    gcTime: 60000,
    refetchInterval: 15000, // Polling cada 15 segundos
  });

  const { data: allPlayers = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: privateConversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['privateConversations'],
    queryFn: () => base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha'),
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: 15000, // Polling cada 15 segundos
    refetchOnWindowFocus: true,
  });

  const { data: privateMessages = [], refetch: refetchPrivateMessages } = useQuery({
    queryKey: ['privateMessages', selectedConversation?.id],
    queryFn: () => selectedConversation 
      ? base44.entities.PrivateMessage.filter({ conversacion_id: selectedConversation.id }, '-created_date')
      : [],
    enabled: !!selectedConversation?.id,
    staleTime: 10000,
    gcTime: 30000,
    refetchInterval: 5000, // Polling cada 5 segundos cuando hay chat abierto
  });

  const isAdmin = user?.role === "admin";
  const isCoordinator = user?.es_coordinador === true;
  const isCoach = user?.es_entrenador === true;

  // Categorías que este usuario puede ver
  const myCategories = useMemo(() => {
    if (!user) return [];
    
    let categories = [];
    
    // Chat interno staff - visible para entrenadores, coordinadores y admins
    if (isAdmin || isCoordinator || isCoach) {
      categories.push("Chat Interno Staff");
    }
    
    // Los coordinadores y admins ven "Coordinación Deportiva" (mensajes de familias)
    if (isAdmin || isCoordinator) {
      categories.push("Coordinación Deportiva");
    }
    
    // Admin y Coordinador ven TODAS las categorías de equipos
    if (isAdmin || isCoordinator) {
      categories = [...categories, ...new Set(allPlayers.map(p => p.deporte).filter(Boolean))];
    } else {
      // Entrenadores solo ven los equipos que entrenan
      categories = [...categories, ...(user.categorias_entrena || [])];
    }
    
    return [...new Set(categories)];
  }, [user, allPlayers, isAdmin, isCoordinator, isCoach]);

  // Conversaciones privadas de la categoría seleccionada
  // IMPORTANTE: Mostrar conversaciones con mensajes nuevos aunque estén archivadas
  const categoryPrivateConversations = useMemo(() => {
    if (!selectedCategory) return [];
    return privateConversations.filter(conv => {
      // Admin y coordinador ven todas las conversaciones, entrenadores solo las suyas
      if (!isAdmin && !isCoordinator && conv.participante_staff_email !== user?.email) return false;
      if (conv.categoria !== selectedCategory) return false;
      
      // Si tiene mensajes no leídos, mostrarla SIEMPRE (aunque esté archivada)
      const hasUnread = (conv.no_leidos_staff || 0) > 0;
      if (hasUnread) return true;
      
      // Filtrar por archivadas o activas
      if (showArchived) return conv.archivada === true;
      return !conv.archivada;
    });
  }, [privateConversations, selectedCategory, isAdmin, isCoordinator, user, showArchived]);

  // Contador de archivadas para mostrar en el filtro
  const archivedCount = useMemo(() => {
    if (!selectedCategory) return 0;
    return privateConversations.filter(conv => {
      if (!isAdmin && !isCoordinator && conv.participante_staff_email !== user?.email) return false;
      if (conv.categoria !== selectedCategory) return false;
      return conv.archivada === true;
    }).length;
  }, [privateConversations, selectedCategory, isAdmin, isCoordinator, user]);

  // Mutación para archivar/desarchivar
  const archiveConversationMutation = useMutation({
    mutationFn: async ({ convId, archive }) => {
      await base44.entities.PrivateConversation.update(convId, { archivada: archive });
    },
    onSuccess: (_, { archive }) => {
      refetchConversations();
      setSelectedConversation(null);
      toast.success(archive ? "Conversación archivada" : "Conversación restaurada");
    },
  });

  // Contador de no leídos por categoría (incluye archivadas con mensajes nuevos)
  const getUnreadCountForCategory = (categoria) => {
    return privateConversations.filter(c => 
      c.categoria === categoria && 
      (c.no_leidos_staff || 0) > 0 &&
      (isAdmin || isCoordinator || c.participante_staff_email === user?.email)
    ).reduce((sum, c) => sum + (c.no_leidos_staff || 0), 0);
  };
  
  // Contador total de no leídos para mostrar en el badge del menú
  const totalUnreadCount = useMemo(() => {
    return privateConversations.filter(c => 
      (c.no_leidos_staff || 0) > 0 &&
      (isAdmin || isCoordinator || c.participante_staff_email === user?.email)
    ).reduce((sum, c) => sum + (c.no_leidos_staff || 0), 0);
  }, [privateConversations, isAdmin, isCoordinator, user]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const newMessage = await base44.entities.ChatMessage.create(messageData);
      
      // Auto-crear álbum para imágenes
      const imageAttachments = messageData.archivos_adjuntos?.filter(att => att.tipo === "imagen") || [];
      if (imageAttachments.length > 0) {
        await base44.entities.PhotoGallery.create({
          titulo: `Chat - ${messageData.deporte} (${format(new Date(), "d MMM yyyy", { locale: es })})`,
          descripcion: messageData.mensaje || "Fotos del chat",
          fecha_evento: new Date().toISOString().split('T')[0],
          categoria: messageData.deporte,
          tipo_evento: "Otro",
          fotos: imageAttachments.map(img => ({ url: img.url, descripcion: "", jugadores_etiquetados: [] })),
          visible_para_padres: true,
          destacado: false
        });
      }

      // Notificar por email si es importante/urgente
      if ((messageData.prioridad === "Importante" || messageData.prioridad === "Urgente") && messageData.tipo === "admin_a_grupo") {
        const groupPlayers = allPlayers.filter(p => p.deporte === messageData.deporte);
        const parentEmails = [...new Set(groupPlayers.map(p => p.email_padre).filter(Boolean))];
        const priorityEmoji = messageData.prioridad === "Urgente" ? "🔴" : "⚠️";
        
        parentEmails.forEach(email => {
          base44.integrations.Core.SendEmail({
            to: email,
            subject: `${priorityEmoji} [${messageData.prioridad.toUpperCase()}] CD Bustarviejo - ${messageData.deporte}`,
            body: `Nuevo mensaje ${messageData.prioridad.toLowerCase()} del entrenador.\n\n${messageData.mensaje}\n\nAccede a la app para ver más detalles.`
          }).catch(console.error);
        });
      }
      
      return newMessage;
    },
    onSuccess: async () => {
      setOptimisticMessages([]);
      setIsSending(false);
      setPriority("Normal");
      refetchMessages();
    },
    onError: () => {
      setOptimisticMessages([]);
      setIsSending(false);
      toast.error("Error al enviar mensaje");
    },
  });

  const voteOnPollMutation = useMutation({
    mutationFn: async ({ messageId, optionIndex }) => {
      const message = messages.find(m => m.id === messageId);
      if (!message || !message.poll) return;

      const votes = message.poll.votes || [];
      const existingVote = votes.find(v => v.user_email === user.email);
      
      if (!existingVote) {
        votes.push({
          user_email: user.email,
          user_name: user.full_name,
          option_index: optionIndex,
          voted_at: new Date().toISOString()
        });

        const updatedPoll = { ...message.poll, votes };
        await base44.entities.ChatMessage.update(messageId, { poll: updatedPoll });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  // Contar destinatarios del grupo para confirmaciones de lectura
  const getGroupRecipientCount = (categoria) => {
    const groupPlayers = allPlayers.filter(p => p.deporte === categoria);
    const uniqueParents = new Set();
    groupPlayers.forEach(p => {
      if (p.email_padre) uniqueParents.add(p.email_padre);
      if (p.email_tutor_2) uniqueParents.add(p.email_tutor_2);
    });
    return uniqueParents.size;
  };

  const handleSendPoll = async (pollData) => {
    if (!user || !selectedCategory) return;

    const senderName = user.full_name || "Entrenador";

    await base44.entities.ChatMessage.create({
      remitente_email: user.email,
      remitente_nombre: senderName,
      mensaje: `📊 ${pollData.question}`,
      prioridad: "Normal",
      tipo: "admin_a_grupo",
      deporte: selectedCategory,
      grupo_id: selectedCategory,
      leido: false,
      poll: {
        question: pollData.question,
        options: pollData.options,
        votes: []
      }
    });

    toast.success("📊 Encuesta enviada al grupo");
    refetchMessages();
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      await Promise.all(messageIds.map(id => 
        base44.entities.ChatMessage.update(id, { leido: true })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatMessages'] }),
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ messageId, pin }) => {
      await base44.entities.ChatMessage.update(messageId, { 
        anclado: pin,
        anclado_por: pin ? user.email : null,
        anclado_fecha: pin ? new Date().toISOString() : null
      });
    },
    onSuccess: (_, { pin }) => {
      refetchMessages();
      toast.success(pin ? "📌 Mensaje anclado" : "Mensaje desanclado");
    },
  });

  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    return deporte.trim().replace(/_undefined$/, '').replace(/_$/, '');
  };

  // Mensajes del grupo seleccionado (anuncios)
  const currentGroupMessages = useMemo(() => {
    if (!selectedCategory) return [];
    return messages.filter(msg => {
      const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
      // En coordinación mostrar todos los mensajes (de padres y staff)
      if (selectedCategory === "Coordinación Deportiva") {
        return msgDeporte === selectedCategory;
      }
      return msgDeporte === selectedCategory && msg.tipo === "admin_a_grupo";
    });
  }, [messages, selectedCategory]);

  // Verificar si es chat de coordinación (bidireccional)
  const isCoordinationChat = selectedCategory === "Coordinación Deportiva";
  
  // Verificar si es chat interno staff
  const isStaffChat = selectedCategory === "Chat Interno Staff";

  // Determinar el modo efectivo del chat (staff siempre anuncios, resto usa tabs)
  const effectiveChatMode = isStaffChat ? "anuncios" : chatSubMode;

  const handleSendGroupMessage = () => {
    if (!user || !selectedCategory) return;
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje");
      return;
    }
    if (isSending) return;

    const msgText = messageContent || "(Archivo adjunto)";
    
    // Determinar nombre del remitente según el rol
    const senderName = isCoordinator 
      ? "Coordinación Deportiva" 
      : isCoach 
        ? `${user.full_name} (Entrenador)` 
        : user.full_name || "Staff";
    
    // Mensaje optimista - aparece inmediatamente
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      remitente_email: user.email,
      remitente_nombre: senderName,
      mensaje: msgText,
      prioridad: priority,
      tipo: "admin_a_grupo",
      deporte: selectedCategory,
      grupo_id: selectedCategory,
      leido: false,
      archivos_adjuntos: attachments,
      created_date: new Date().toISOString(),
      _isOptimistic: true
    };
    
    setOptimisticMessages([optimisticMsg]);
    setMessageContent("");
    setAttachments([]);
    setIsSending(true);
    
    sendMessageMutation.mutate({
      remitente_email: user.email,
      remitente_nombre: senderName,
      mensaje: msgText,
      prioridad: priority,
      tipo: "admin_a_grupo",
      deporte: selectedCategory,
      categoria: "",
      grupo_id: selectedCategory,
      leido: false,
      archivos_adjuntos: optimisticMsg.archivos_adjuntos,
    });
  };

  const handlePrivateMessageSent = () => {
    refetchPrivateMessages();
    refetchConversations();
  };

  const sportEmojis = {
    "Chat Interno Staff": "👥",
    "Coordinación Deportiva": "🎓",
    "Fútbol Pre-Benjamín (Mixto)": "⚽",
    "Fútbol Benjamín (Mixto)": "⚽",
    "Fútbol Alevín (Mixto)": "⚽",
    "Fútbol Infantil (Mixto)": "⚽",
    "Fútbol Cadete": "⚽",
    "Fútbol Juvenil": "⚽",
    "Fútbol Aficionado": "⚽",
    "Fútbol Femenino": "⚽",
    "Baloncesto (Mixto)": "🏀"
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentGroupMessages.length, privateMessages.length]);

  if (loadingPlayers || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <QuickPollDialog
      isOpen={showPollDialog}
      onClose={() => setShowPollDialog(false)}
      onSend={handleSendPoll}
      groupName={selectedCategory}
    />
    <ChatSearchDialog
      isOpen={showSearchDialog}
      onClose={() => setShowSearchDialog(false)}
      messages={currentGroupMessages}
    />
    <PinnedMessagesDialog
      isOpen={showPinnedDialog}
      onClose={() => setShowPinnedDialog(false)}
      messages={currentGroupMessages}
      onUnpin={(msgId) => togglePinMutation.mutate({ messageId: msgId, pin: false })}
      isAdmin={true}
    />
    <MediaGalleryDialog
      isOpen={showMediaDialog}
      onClose={() => setShowMediaDialog(false)}
      messages={currentGroupMessages}
    />
    
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
          {isAdmin ? "Chat del Club" : isCoordinator ? "Chat Coordinación" : "Chat de Equipos"}
        </h1>
        <p className="text-slate-600 text-sm">
          Selecciona una categoría para ver anuncios y mensajes privados
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Lista de categorías */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-md border overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white">
            <h3 className="font-bold">Mis Equipos</h3>
            <p className="text-xs text-orange-100">{myCategories.length} categorías</p>
          </div>
          <div className="divide-y max-h-[60vh] overflow-y-auto">
            {myCategories.map(cat => {
              const unread = getUnreadCountForCategory(cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    if (selectedCategory !== cat) {
                      setSelectedCategory(cat);
                      // Coordinadores: privado primero, Entrenadores: anuncios primero
                      if (cat === "Chat Interno Staff") {
                        setChatSubMode("anuncios");
                      } else if (isCoordinator && !isCoach) {
                        setChatSubMode("privado");
                      } else {
                        setChatSubMode("anuncios");
                      }
                      setSelectedConversation(null);
                      // Scroll hacia arriba al seleccionar categoría
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`w-full p-3 flex items-center gap-3 transition-colors text-left ${
                    selectedCategory === cat ? 'bg-orange-50 border-l-4 border-l-orange-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedCategory === cat ? 'bg-orange-600 text-white' : 'bg-orange-100'
                  }`}>
                    <span className="text-lg">{sportEmojis[cat] || "⚽"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate text-sm">{cat}</div>
                    <div className="text-xs text-slate-500">
                      {allPlayers.filter(p => p.deporte === cat && p.activo).length} jugadores
                    </div>
                  </div>
                  {unread > 0 && (
                    <Badge className="bg-red-500 text-white text-xs animate-pulse">{unread}</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel principal */}
        <div className="lg:col-span-3 space-y-4">
          {selectedCategory ? (
            <>
              
              {/* Sub-tabs dentro de cada categoría */}
              <div className="bg-white rounded-xl shadow-md border p-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-lg text-slate-900">
                    {sportEmojis[selectedCategory] || "⚽"} {selectedCategory}
                  </h2>
                </div>
                {/* Coordinadores y admins pueden enviar anuncios a TODAS las categorías incluyendo Coordinación Deportiva */}
                {!isStaffChat && (
                  <Tabs value={chatSubMode} onValueChange={(v) => { setChatSubMode(v); setSelectedConversation(null); }}>
                    <TabsList className="w-full">
                      {isCoordinator && !isCoach ? (
                        <>
                          <TabsTrigger value="privado" className="flex-1 gap-2">
                            <MessageCircle className="w-4 h-4" />
                            🔒 Privado Familias
                            {getUnreadCountForCategory(selectedCategory) > 0 && (
                              <Badge className="bg-red-500 text-white text-xs ml-1">{getUnreadCountForCategory(selectedCategory)}</Badge>
                            )}
                          </TabsTrigger>
                          <TabsTrigger value="anuncios" className="flex-1 gap-2">
                            <Users className="w-4 h-4" />
                            📢 Anuncios Grupo
                            <span className="text-[10px] text-slate-500 hidden md:inline">(todos ven)</span>
                          </TabsTrigger>
                        </>
                      ) : (
                        <>
                          <TabsTrigger value="anuncios" className="flex-1 gap-2">
                            <Users className="w-4 h-4" />
                            📢 Anuncios Grupo
                            <span className="text-[10px] text-slate-500 hidden md:inline">(todos ven)</span>
                          </TabsTrigger>
                          <TabsTrigger value="privado" className="flex-1 gap-2">
                            <MessageCircle className="w-4 h-4" />
                            🔒 Privado Familias
                            {getUnreadCountForCategory(selectedCategory) > 0 && (
                              <Badge className="bg-red-500 text-white text-xs ml-1">{getUnreadCountForCategory(selectedCategory)}</Badge>
                            )}
                          </TabsTrigger>
                        </>
                      )}
                    </TabsList>
                  </Tabs>
                )}
              </div>

              {effectiveChatMode === "anuncios" ? (
                /* SUB-MODO ANUNCIOS */
                <div className="bg-white rounded-xl shadow-md border overflow-hidden flex flex-col" style={{ height: 'calc(70vh - 100px)' }}>
                  <div className={`p-3 text-white flex items-center gap-3 flex-shrink-0 ${
                    isStaffChat
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700'
                      : isCoordinationChat 
                        ? 'bg-gradient-to-r from-green-600 to-green-700' 
                        : 'bg-gradient-to-r from-blue-600 to-blue-700'
                  }`}>
                    <Users className="w-5 h-5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-sm">
                        {isStaffChat 
                          ? "Chat Interno - Entrenadores y Coordinación" 
                          : isCoordinationChat 
                            ? "Chat de Coordinación" 
                            : `Anuncios para ${selectedCategory}`}
                      </h3>
                      <p className="text-xs opacity-80">
                        {isStaffChat
                          ? "Solo entrenadores y coordinador ven estos mensajes"
                          : isCoordinationChat 
                            ? "Mensajes de familias - responde directamente aquí" 
                            : "Todos los padres del grupo verán estos mensajes"}
                      </p>
                    </div>
                    {/* Botones de herramientas */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowSearchDialog(true)}
                        className="p-2 rounded-full hover:bg-white/20 transition-colors"
                        title="Buscar mensajes"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowPinnedDialog(true)}
                        className="p-2 rounded-full hover:bg-white/20 transition-colors relative"
                        title="Mensajes anclados"
                      >
                        <Pin className="w-4 h-4" />
                        {currentGroupMessages.filter(m => m.anclado).length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[10px] flex items-center justify-center">
                            {currentGroupMessages.filter(m => m.anclado).length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setShowMediaDialog(true)}
                        className="p-2 rounded-full hover:bg-white/20 transition-colors"
                        title="Galería de medios"
                      >
                        <Image className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ backgroundColor: '#e5ddd5' }}>
                    {currentGroupMessages.length === 0 && optimisticMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-slate-500 bg-white/80 rounded-xl p-6">
                          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No hay anuncios</p>
                        </div>
                      </div>
                    ) : (
                      [...currentGroupMessages, ...optimisticMessages]
                        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                        .map((msg) => {
                          const isMyMessage = msg.remitente_email === user?.email || msg.tipo === "admin_a_grupo";
                          const isFromFamily = msg.tipo === "padre_a_grupo";
                          
                          return (
                            <div key={msg.id} className={`flex ${isCoordinationChat && isFromFamily ? 'justify-start' : 'justify-end'} mb-1`}>
                              <div className={`max-w-[80%] rounded-lg shadow-sm ${
                                isCoordinationChat && isFromFamily 
                                  ? 'bg-white text-slate-900 rounded-bl-none' 
                                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-none'
                              } ${msg._isOptimistic ? 'opacity-70' : ''}`}>
                                <div className="px-3 py-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-semibold ${isCoordinationChat && isFromFamily ? 'text-orange-600' : 'opacity-80'}`}>
                                      {isCoordinationChat && isFromFamily ? '👤 ' : ''}{msg.remitente_nombre}
                                    </span>
                                    {msg.prioridad !== "Normal" && (
                                      <span className="text-xs">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                                    )}
                                  </div>
                                  <p className="text-sm leading-relaxed">{msg.mensaje}</p>

                                  {msg.poll && (
                                    <PollMessage 
                                      poll={msg.poll} 
                                      onVote={(msgId, optIdx) => voteOnPollMutation.mutate({ messageId: msgId, optionIndex: optIdx })}
                                      userEmail={user?.email}
                                      messageId={msg.id}
                                    />
                                  )}

                                  {msg.archivos_adjuntos?.length > 0 && (
                                    <div className="mt-2">
                                      <MessageAttachments attachments={msg.archivos_adjuntos} />
                                    </div>
                                  )}
                                  <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className={`text-[10px] ${isCoordinationChat && isFromFamily ? 'text-slate-400' : 'opacity-70'}`}>
                                      {format(new Date(msg.created_date), "HH:mm")}
                                    </span>
                                    {msg._isOptimistic && <span className="text-[10px] opacity-70" title="Enviando...">⏳</span>}
                                    {!msg._isOptimistic && msg.tipo === "admin_a_grupo" && (
                                      <span className="text-[10px] opacity-80" title="Entregado">✓</span>
                                    )}
                                    {msg.anclado && <Pin className="w-3 h-3 opacity-70" />}
                                    {msg.tipo === "admin_a_grupo" && !msg._isOptimistic && (
                                      <ReadConfirmation 
                                        message={msg} 
                                        totalRecipients={getGroupRecipientCount(selectedCategory)}
                                        isAdmin={true}
                                      />
                                    )}
                                    {msg.tipo === "admin_a_grupo" && !msg._isOptimistic && (
                                      <button
                                        onClick={() => togglePinMutation.mutate({ messageId: msg.id, pin: !msg.anclado })}
                                        className="p-1 rounded hover:bg-white/20 transition-colors opacity-70 hover:opacity-100"
                                        title={msg.anclado ? "Desanclar" : "Anclar mensaje"}
                                      >
                                        <Pin className={`w-3 h-3 ${msg.anclado ? 'text-orange-300' : ''}`} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="bg-white border-t p-3 flex-shrink-0">
                    <div className="mb-2">
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">📝 Normal</SelectItem>
                          <SelectItem value="Importante">⚠️ Importante (Email)</SelectItem>
                          <SelectItem value="Urgente">🔴 Urgente (Email)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 items-end">
                      <FileAttachmentButton
                        onFileUploaded={(att) => setAttachments(prev => [...prev, att])}
                        disabled={sendMessageMutation.isPending}
                      />
                      {!isStaffChat && (
                        <Button
                          onClick={() => setShowPollDialog(true)}
                          variant="ghost"
                          size="icon"
                          className="text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                          title="Crear encuesta rápida"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </Button>
                      )}
                      <Input
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder={isStaffChat ? "Escribe a los entrenadores..." : isCoordinationChat ? "Responde a las familias..." : "Escribe un anuncio para el grupo..."}
                        className="flex-1 rounded-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendGroupMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendGroupMessage}
                        disabled={(!messageContent.trim() && attachments.length === 0) || isSending}
                        className={`rounded-full w-10 h-10 p-0 ${isStaffChat ? 'bg-purple-600 hover:bg-purple-700' : isCoordinationChat ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* SUB-MODO PRIVADO */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Lista de conversaciones privadas */}
                  <div className="lg:col-span-1 bg-white rounded-xl shadow-md border overflow-hidden" style={{ height: 'calc(70vh - 100px)' }}>
                    <div className="bg-gradient-to-r from-green-600 to-green-700 p-3 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-sm">{showArchived ? "Archivadas" : "Conversaciones activas"}</h3>
                          <p className="text-xs text-green-100">{categoryPrivateConversations.length} conversaciones</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowArchived(!showArchived)}
                          className="text-white hover:bg-white/20 gap-1 text-xs h-8 px-2"
                        >
                          {showArchived ? (
                            <>
                              <MessageCircle className="w-3 h-3" />
                              Activas
                            </>
                          ) : (
                            <>
                              <Archive className="w-3 h-3" />
                              {archivedCount > 0 && `(${archivedCount})`}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="divide-y overflow-y-auto" style={{ maxHeight: 'calc(100% - 70px)' }}>
                      {categoryPrivateConversations.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">
                          <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-medium">Sin mensajes privados</p>
                          <p className="text-xs mt-1">Las familias pueden escribirte desde su app</p>
                        </div>
                      ) : (
                        categoryPrivateConversations.map(conv => (
                          <button
                            key={conv.id}
                            onClick={() => setSelectedConversation(conv)}
                            className={`w-full p-3 flex items-center gap-3 transition-colors text-left ${
                              selectedConversation?.id === conv.id 
                                ? 'bg-green-50 border-l-4 border-l-green-600' 
                                : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              (conv.no_leidos_staff || 0) > 0 ? 'bg-green-600 text-white' : 'bg-slate-200'
                            }`}>
                              <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 truncate text-sm">
                                {conv.participante_familia_nombre || conv.participante_familia_email?.split('@')[0]}
                              </div>
                              {conv.ultimo_mensaje && (
                                <div className="text-xs text-slate-400 truncate">
                                  {conv.ultimo_mensaje_de === 'staff' ? '↩️ ' : '📩 '}{conv.ultimo_mensaje}
                                </div>
                              )}
                            </div>
                            {(conv.no_leidos_staff || 0) > 0 && (
                              <Badge className="bg-green-600 text-white text-xs animate-pulse">{conv.no_leidos_staff}</Badge>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Chat privado */}
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-md border overflow-hidden" style={{ height: 'calc(70vh - 100px)' }}>
                    {selectedConversation ? (
                      <div className="flex flex-col h-full">
                        {/* Botón archivar/restaurar */}
                        <div className="bg-slate-50 border-b px-3 py-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveConversationMutation.mutate({ 
                              convId: selectedConversation.id, 
                              archive: !selectedConversation.archivada 
                            })}
                            disabled={archiveConversationMutation.isPending}
                            className={`text-xs gap-1 ${selectedConversation.archivada ? 'text-green-600 hover:text-green-700' : 'text-slate-600 hover:text-slate-700'}`}
                          >
                            {selectedConversation.archivada ? (
                              <>
                                <ArchiveRestore className="w-3 h-3" />
                                Restaurar
                              </>
                            ) : (
                              <>
                                <Archive className="w-3 h-3" />
                                Archivar
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <PrivateChatPanel
                            conversation={selectedConversation}
                            messages={privateMessages}
                            user={user}
                            isStaff={true}
                            onClose={() => setSelectedConversation(null)}
                            onMessageSent={handlePrivateMessageSent}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="text-center">
                          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">Mensajes Privados</p>
                          <p className="text-xs mt-2 max-w-xs mx-auto">
                            Solo tú y la familia ven estos mensajes. Selecciona una conversación de la izquierda.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-md border p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 font-medium">Selecciona una categoría</p>
              <p className="text-sm text-slate-400 mt-2">Elige un equipo de la izquierda para ver sus chats</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}