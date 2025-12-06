import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, AlertCircle, Users, MessageCircle, User, Archive, ArrowLeft, BarChart3, Pin, Search, Image, ArchiveRestore, Trash2 } from "lucide-react";
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
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [chatSubMode, setChatSubMode] = useState("anuncios");
  const [attachments, setAttachments] = useState([]);
  const [priority, setPriority] = useState("Normal");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showPinnedDialog, setShowPinnedDialog] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [fullscreenChat, setFullscreenChat] = useState(false);
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
    staleTime: 5000,
    gcTime: 30000,
    refetchInterval: 10000,
  });

  const { data: allPlayers = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: privateConversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['privateConversations'],
    queryFn: () => base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha'),
    staleTime: 5000,
    gcTime: 30000,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: privateMessages = [], refetch: refetchPrivateMessages } = useQuery({
    queryKey: ['privateMessages', selectedConversation?.id],
    queryFn: () => selectedConversation 
      ? base44.entities.PrivateMessage.filter({ conversacion_id: selectedConversation.id }, '-created_date')
      : [],
    enabled: !!selectedConversation?.id,
    staleTime: 5000,
    gcTime: 30000,
    refetchInterval: 10000,
  });

  const isAdmin = user?.role === "admin";
  const isCoordinator = user?.es_coordinador === true;
  const isCoach = user?.es_entrenador === true;

  const myCategories = useMemo(() => {
    if (!user) return [];
    
    let categories = [];
    
    if (isAdmin || isCoordinator || isCoach) {
      categories.push("Chat Interno Staff");
    }
    
    if (isAdmin || isCoordinator) {
      categories.push("Coordinación Deportiva");
    }
    
    if (isAdmin || isCoordinator) {
      categories = [...categories, ...new Set(allPlayers.map(p => p.deporte).filter(Boolean))];
    } else {
      categories = [...categories, ...(user.categorias_entrena || [])];
    }
    
    return [...new Set(categories)];
  }, [user, allPlayers, isAdmin, isCoordinator, isCoach]);

  const categoryPrivateConversations = useMemo(() => {
    if (!selectedCategory) return [];
    return privateConversations.filter(conv => {
      // Solo mostrar conversaciones donde el usuario es participante staff
      if (!isAdmin && !isCoordinator && conv.participante_staff_email !== user?.email) return false;
      
      // Filtro por categoría - hay que matchear
      if (conv.categoria !== selectedCategory) return false;
      
      // Auto-desarchivar si tiene mensajes no leídos
      const hasUnread = (conv.no_leidos_staff || 0) > 0;
      if (hasUnread && conv.archivada === true) {
        base44.entities.PrivateConversation.update(conv.id, { archivada: false })
          .then(() => refetchConversations());
      }
      
      // Filtrar por archivadas o activas
      if (showArchived) return conv.archivada === true;
      return !conv.archivada;
    });
  }, [privateConversations, selectedCategory, isAdmin, isCoordinator, user, showArchived]);

  const archiveConversationMutation = useMutation({
    mutationFn: async ({ convId, archive }) => {
      await base44.entities.PrivateConversation.update(convId, { archivada: archive });
    },
    onSuccess: (_, { archive }) => {
      refetchConversations();
      setSelectedConversation(null);
      setFullscreenChat(false);
      toast.success(archive ? "📁 Archivada" : "✅ Restaurada");
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (convId) => {
      // Borrar todos los mensajes de la conversación primero
      const msgs = await base44.entities.PrivateMessage.filter({ conversacion_id: convId });
      await Promise.all(msgs.map(m => base44.entities.PrivateMessage.delete(m.id)));
      // Borrar la conversación
      await base44.entities.PrivateConversation.delete(convId);
    },
    onSuccess: () => {
      refetchConversations();
      setSelectedConversation(null);
      setFullscreenChat(false);
      toast.success("🗑️ Conversación eliminada");
    },
  });

  const getUnreadCountForCategory = (categoria) => {
    return privateConversations.filter(c => 
      c.categoria === categoria && 
      (c.no_leidos_staff || 0) > 0 &&
      (isAdmin || isCoordinator || c.participante_staff_email === user?.email)
    ).reduce((sum, c) => sum + (c.no_leidos_staff || 0), 0);
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      return await base44.entities.ChatMessage.create(messageData);
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

  const currentGroupMessages = useMemo(() => {
    if (!selectedCategory) return [];
    if (selectedCategory === "Coordinación Deportiva") return [];
    return messages.filter(msg => {
      const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
      return msgDeporte === selectedCategory && msg.tipo === "admin_a_grupo";
    });
  }, [messages, selectedCategory]);

  const isCoordinationChat = selectedCategory === "Coordinación Deportiva";
  const isStaffChat = selectedCategory === "Chat Interno Staff";
  const effectiveChatMode = isStaffChat ? "anuncios" : chatSubMode;

  const handleSendGroupMessage = () => {
    if (!user || !selectedCategory) return;
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje");
      return;
    }
    if (isSending) return;

    const msgText = messageContent || "(Archivo adjunto)";
    
    const senderName = isCoordinator 
      ? "Coordinación Deportiva" 
      : isCoach 
        ? `${user.full_name} (Entrenador)` 
        : user.full_name || "Staff";
    
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
    
    const tempMessage = msgText;
    const tempAttachments = [...attachments];
    setMessageContent("");
    setAttachments([]);
    setIsSending(true);
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
    
    sendMessageMutation.mutate({
      remitente_email: user.email,
      remitente_nombre: senderName,
      mensaje: tempMessage,
      prioridad: priority,
      tipo: "admin_a_grupo",
      deporte: selectedCategory,
      categoria: "",
      grupo_id: selectedCategory,
      leido: false,
      archivos_adjuntos: tempAttachments,
    });
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
      
      <div className={`${isMobile ? 'fixed inset-0 flex flex-col overflow-hidden bg-white' : 'p-4 lg:p-6'}`} style={isMobile ? { top: '120px' } : {}}>
        {/* MÓVIL: Lista de categorías */}
        {isMobile && !selectedCategory && !fullscreenChat && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
              <h2 className="text-xl font-bold">💬 Mis Equipos</h2>
              <p className="text-sm text-blue-100">{myCategories.length} categorías</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {myCategories.map(cat => {
                const unread = getUnreadCountForCategory(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (cat === "Chat Interno Staff") {
                        setChatSubMode("anuncios");
                      } else if (cat === "Coordinación Deportiva" || (isCoordinator && !isCoach)) {
                        setChatSubMode("privado");
                      } else {
                        setChatSubMode("anuncios");
                      }
                      setSelectedConversation(null);
                      // Scroll al final al abrir
                      setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
                      }, 150);
                    }}
                    className="w-full p-4 flex items-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-100 flex-shrink-0">
                      <span className="text-2xl">{sportEmojis[cat] || "⚽"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate text-base">{cat}</div>
                      <div className="text-sm text-slate-500 truncate">
                        {allPlayers.filter(p => p.deporte === cat && p.activo).length} jugadores
                      </div>
                    </div>
                    {unread > 0 && (
                      <Badge className="bg-red-500 text-white text-sm h-8 min-w-8 rounded-full animate-pulse font-bold">{unread}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MÓVIL: Chat a pantalla completa */}
        {isMobile && selectedCategory && !fullscreenChat && selectedCategory !== "Coordinación Deportiva" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0 ${
              isStaffChat ? 'bg-gradient-to-r from-purple-600 to-purple-700' 
              : 'bg-gradient-to-r from-blue-600 to-blue-700'
            }`}>
              <button
                onClick={() => setSelectedCategory(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors -ml-1"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">{sportEmojis[selectedCategory]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg truncate">{selectedCategory}</h2>
                <p className="text-xs opacity-90 truncate">
                  {isStaffChat ? "Chat interno" : "Anuncios grupo"}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ backgroundColor: '#e5ddd5' }}>
              {currentGroupMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-500 bg-white/80 rounded-xl p-6">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay mensajes</p>
                  </div>
                </div>
              ) : (
                currentGroupMessages.map((msg) => (
                  <div key={msg.id} className="flex justify-end mb-2">
                    <div className="max-w-[85%] rounded-2xl shadow-md bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm">
                      <div className="px-3 py-2">
                        <p className="text-sm leading-relaxed">{msg.mensaje}</p>
                        <span className="text-[10px] opacity-70">
                          {format(new Date(msg.created_date), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t p-3 flex-shrink-0 safe-area-bottom">
              <div className="flex gap-2 items-end">
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Escribe..."
                  className="flex-1 rounded-full text-base"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendGroupMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendGroupMessage}
                  disabled={!messageContent.trim() || isSending}
                  className="rounded-full w-12 h-12 p-0 flex-shrink-0 bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MÓVIL: Coordinación Deportiva - Solo lista de chats privados */}
        {isMobile && selectedCategory === "Coordinación Deportiva" && !fullscreenChat && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white flex items-center gap-3 shadow-md flex-shrink-0">
              <button
                onClick={() => setSelectedCategory(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors -ml-1"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🎓</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg">Coordinación</h2>
                <p className="text-xs opacity-90">Chats privados con familias</p>
              </div>
            </div>

            <div className="p-3 bg-cyan-50 border-b flex items-center justify-between flex-shrink-0">
              <p className="text-sm text-cyan-800 font-medium">
                {showArchived ? "📦 Archivadas" : "💬 Conversaciones Activas"}
                {categoryPrivateConversations.length > 0 && (
                  <span className="ml-2 text-cyan-600">({categoryPrivateConversations.length})</span>
                )}
              </p>
              <div className="flex gap-2">
                {categoryPrivateConversations.length > 0 && showArchived && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (window.confirm(`⚠️ ¿ELIMINAR PERMANENTEMENTE todas las conversaciones archivadas (${categoryPrivateConversations.length})? Esta acción no se puede deshacer.`)) {
                        for (const conv of categoryPrivateConversations) {
                          const msgs = await base44.entities.PrivateMessage.filter({ conversacion_id: conv.id });
                          await Promise.all(msgs.map(m => base44.entities.PrivateMessage.delete(m.id)));
                          await base44.entities.PrivateConversation.delete(conv.id);
                        }
                        refetchConversations();
                        toast.success(`🗑️ ${categoryPrivateConversations.length} conversaciones eliminadas`);
                      }
                    }}
                    className="text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar todas
                  </Button>
                )}
                {categoryPrivateConversations.length > 0 && !showArchived && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (window.confirm(`¿Archivar todas (${categoryPrivateConversations.length})?`)) {
                        for (const conv of categoryPrivateConversations) {
                          await base44.entities.PrivateConversation.update(conv.id, { archivada: true });
                        }
                        refetchConversations();
                        toast.success(`✅ ${categoryPrivateConversations.length} conversaciones archivadas`);
                      }
                    }}
                    className="text-orange-700 hover:bg-orange-100"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archivar todas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-cyan-700 hover:bg-cyan-100"
                >
                  {showArchived ? "Ver Activas" : "Ver Archivadas"}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50">
              {categoryPrivateConversations.length === 0 ? (
                <div className="flex items-center justify-center h-full p-6">
                  <div className="text-center text-slate-500 bg-white rounded-xl p-6">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{showArchived ? "No hay conversaciones archivadas" : "No hay conversaciones activas"}</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {categoryPrivateConversations.map(conv => (
                    <div key={conv.id} className="flex items-center bg-white hover:bg-slate-50">
                      <button
                        onClick={() => {
                          setSelectedConversation(conv);
                          setFullscreenChat(true);
                        }}
                        className="flex-1 p-4 flex items-center gap-3 transition-colors text-left"
                      >
                        <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-cyan-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {conv.participante_familia_nombre}
                          </p>
                          <p className="text-sm text-slate-500 truncate">
                            {conv.ultimo_mensaje || "Sin mensajes"}
                          </p>
                        </div>
                        {(conv.no_leidos_staff || 0) > 0 && (
                          <Badge className="bg-cyan-500 text-white">{conv.no_leidos_staff}</Badge>
                        )}
                        {conv.archivada && (
                          <Badge className="bg-slate-400 text-white text-xs">📦</Badge>
                        )}
                      </button>
                      <div className="flex">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveConversationMutation.mutate({ convId: conv.id, archive: !conv.archivada });
                          }}
                          className="p-3 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                          title={conv.archivada ? "Desarchivar" : "Archivar"}
                        >
                          {conv.archivada ? (
                            <ArchiveRestore className="w-5 h-5" />
                          ) : (
                            <Archive className="w-5 h-5" />
                          )}
                        </button>
                        {conv.archivada && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`¿Eliminar permanentemente el chat con ${conv.participante_familia_nombre}?`)) {
                                deleteConversationMutation.mutate(conv.id);
                              }
                            }}
                            className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar conversación"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DESKTOP */}
        {!isMobile && (
          <>
            <div className="mb-4">
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                {isAdmin ? "Chat del Club" : isCoordinator ? "Chat Coordinación" : "Chat de Equipos"}
              </h1>
              <p className="text-slate-600 text-sm">Selecciona una categoría</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1 bg-white rounded-xl shadow-md border overflow-hidden h-fit">
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
                            setSelectedConversation(null);
                            // Scroll al final al abrir
                            setTimeout(() => {
                              messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
                            }, 150);
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

              <div className="lg:col-span-3">
                {!selectedCategory ? (
                  <div className="bg-white rounded-xl shadow-md border p-12 text-center">
                    <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-600 font-medium">Selecciona una categoría</p>
                  </div>
                ) : selectedCategory === "Coordinación Deportiva" ? (
                  selectedConversation ? (
                    <div className="bg-white rounded-xl shadow-md border overflow-hidden" style={{ height: '70vh' }}>
                      <PrivateChatPanel
                        conversation={selectedConversation}
                        messages={privateMessages}
                        user={user}
                        isStaff={true}
                        hideHeader={false}
                        onClose={() => setSelectedConversation(null)}
                        onMessageSent={handlePrivateMessageSent}
                        onArchive={(convId, archive) => {
                          archiveConversationMutation.mutate({ convId, archive });
                        }}
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-md border overflow-hidden" style={{ height: '70vh' }}>
                      <div className="p-4 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white flex items-center justify-between">
                        <div>
                          <h3 className="font-bold">Coordinación Deportiva</h3>
                          <p className="text-xs text-cyan-100">
                            {categoryPrivateConversations.length} {showArchived ? 'archivadas' : 'activas'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {categoryPrivateConversations.length > 0 && showArchived && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (window.confirm(`⚠️ ¿ELIMINAR PERMANENTEMENTE todas las conversaciones archivadas (${categoryPrivateConversations.length})? Esta acción no se puede deshacer.`)) {
                                  for (const conv of categoryPrivateConversations) {
                                    const msgs = await base44.entities.PrivateMessage.filter({ conversacion_id: conv.id });
                                    await Promise.all(msgs.map(m => base44.entities.PrivateMessage.delete(m.id)));
                                    await base44.entities.PrivateConversation.delete(conv.id);
                                  }
                                  refetchConversations();
                                  toast.success(`🗑️ ${categoryPrivateConversations.length} conversaciones eliminadas`);
                                }
                              }}
                              className="text-white hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar todas
                            </Button>
                          )}
                          {categoryPrivateConversations.length > 0 && !showArchived && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (window.confirm(`¿Archivar todas (${categoryPrivateConversations.length})?`)) {
                                  for (const conv of categoryPrivateConversations) {
                                    await base44.entities.PrivateConversation.update(conv.id, { archivada: true });
                                  }
                                  refetchConversations();
                                  toast.success(`✅ ${categoryPrivateConversations.length} conversaciones archivadas`);
                                }
                              }}
                              className="text-white hover:bg-white/20"
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Archivar todas
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowArchived(!showArchived)}
                            className="text-white hover:bg-white/20"
                          >
                            {showArchived ? "Ver Activas" : "Ver Archivadas"}
                          </Button>
                        </div>
                      </div>
                      <div className="h-[calc(100%-4rem)] overflow-y-auto divide-y">
                        {categoryPrivateConversations.length === 0 ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center text-slate-500">
                              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">
                                {showArchived ? "No hay conversaciones archivadas" : "No hay conversaciones activas"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          categoryPrivateConversations.map(conv => (
                            <button
                              key={conv.id}
                              onClick={() => setSelectedConversation(conv)}
                              className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                            >
                              <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-6 h-6 text-cyan-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">
                                  {conv.participante_familia_nombre}
                                </p>
                                <p className="text-sm text-slate-500 truncate">
                                  {conv.ultimo_mensaje || "Sin mensajes"}
                                </p>
                              </div>
                              {(conv.no_leidos_staff || 0) > 0 && (
                                <Badge className="bg-cyan-500 text-white">{conv.no_leidos_staff}</Badge>
                              )}
                              {conv.archivada && (
                                <Badge className="bg-slate-400 text-white text-xs">Archivada</Badge>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="bg-white rounded-xl shadow-md border p-4 text-center">
                    <p className="text-slate-600">Chat de {selectedCategory}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Fullscreen chat móvil */}
        {fullscreenChat && selectedConversation && (
          <div className="fixed inset-0 z-50 bg-white">
            <PrivateChatPanel
              conversation={selectedConversation}
              messages={privateMessages}
              user={user}
              isStaff={true}
              onClose={() => {
                setSelectedConversation(null);
                setFullscreenChat(false);
              }}
              onMessageSent={handlePrivateMessageSent}
              onArchive={(convId, archive) => {
                archiveConversationMutation.mutate({ convId, archive });
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}