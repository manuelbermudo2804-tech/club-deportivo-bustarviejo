import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, MessageCircle, User, ArrowLeft, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import PrivateChatPanel from "../components/chat/PrivateChatPanel";
import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";
import PollMessage from "../components/chat/PollMessage";
import DateSeparator, { groupMessagesByDate } from "../components/chat/DateSeparator";
import useChatSound from "../components/chat/useChatSound";

const FAMILIES_CAN_SEND_ATTACHMENTS = true;

export default function ParentChat() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activePrivateChat, setActivePrivateChat] = useState(null);
  const [coordinationTab, setCoordinationTab] = useState("chat");
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef(null);
  const coordinationMessagesEndRef = useRef(null);
  const prevMessagesCountRef = useRef(0);
  const queryClient = useQueryClient();
  const { playNotificationSound } = useChatSound();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    staleTime: 5000,
    gcTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

  const { data: players = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const COORDINATOR_EMAIL = "manuel.bermudo@gvcgaesco.es";
  const COORDINATOR_NAME = "Manuel Bermudo";
  
  const coordinator = useMemo(() => ({
    email: COORDINATOR_EMAIL,
    full_name: COORDINATOR_NAME,
    es_coordinador: true
  }), []);

  const { data: privateConversations = [], refetch: refetchConversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['myPrivateConversations', user?.email],
    queryFn: () => user ? base44.entities.PrivateConversation.filter({ participante_familia_email: user.email }, '-ultimo_mensaje_fecha') : [],
    enabled: !!user?.email,
    staleTime: 5000,
    gcTime: 30000,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: privateMessages = [], refetch: refetchPrivateMessages } = useQuery({
    queryKey: ['privateMessages', activePrivateChat?.id],
    queryFn: () => activePrivateChat 
      ? base44.entities.PrivateMessage.filter({ conversacion_id: activePrivateChat.id }, '-created_date')
      : [],
    enabled: !!activePrivateChat?.id,
    staleTime: 5000,
    gcTime: 30000,
    refetchInterval: 10000,
  });

  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    return deporte.trim().replace(/_undefined$/, '').replace(/_$/, '');
  };

  const myPlayers = user ? players.filter(p => 
    p.email_padre === user.email || p.email_tutor_2 === user.email
  ) : [];

  const myCategories = [
    "Coordinación Deportiva",
    ...new Set(myPlayers.map(p => normalizeDeporte(p.deporte)).filter(Boolean))
  ];

  const currentAnnouncements = useMemo(() => {
    if (!selectedCategory || selectedCategory === "Coordinación Deportiva") return [];
    return messages.filter(msg => {
      const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
      return msgDeporte === selectedCategory && msg.tipo === "admin_a_grupo";
    });
  }, [messages, selectedCategory]);

  const getUnreadCount = (categoria) => {
    if (categoria === "Coordinación Deportiva") return 0;
    return messages.filter(msg => {
      const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
      return msgDeporte === categoria && !msg.leido && msg.tipo === "admin_a_grupo";
    }).length;
  };

  const getPrivateUnreadCount = (categoria) => {
    const convs = privateConversations.filter(c => 
      c.participante_familia_email === user?.email &&
      c.categoria === categoria && 
      !c.archivada
    );
    return convs.reduce((sum, c) => sum + (c.no_leidos_familia || 0), 0);
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      await Promise.all(messageIds.map(async (id) => {
        const msg = messages.find(m => m.id === id);
        const leido_por = msg?.leido_por || [];
        
        if (!leido_por.find(r => r.email === user?.email)) {
          leido_por.push({
            email: user.email,
            nombre: user.full_name,
            fecha: new Date().toISOString()
          });
        }
        
        await base44.entities.ChatMessage.update(id, { 
          leido: true,
          leido_por: leido_por
        });
      }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatMessages'] }),
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
        toast.success("✅ Voto registrado");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  const createOrOpenPrivateChat = useMutation({
    mutationFn: async ({ staffEmail, categoria }) => {
      const existing = privateConversations.find(c => 
        c.participante_staff_email === staffEmail && 
        c.categoria === categoria
      );
      
      if (existing) return existing;

      const staffName = staffEmail === COORDINATOR_EMAIL ? COORDINATOR_NAME : staffEmail.split('@')[0];
      const staffRole = staffEmail === COORDINATOR_EMAIL ? 'coordinador' : 'entrenador';

      const newConv = await base44.entities.PrivateConversation.create({
        participante_familia_email: user.email,
        participante_familia_nombre: user.full_name,
        participante_staff_email: staffEmail,
        participante_staff_nombre: staffName,
        participante_staff_rol: staffRole,
        categoria: categoria,
        jugadores_relacionados: myPlayers
          .filter(p => normalizeDeporte(p.deporte) === categoria || categoria === "Coordinación Deportiva")
          .map(p => ({ jugador_id: p.id, jugador_nombre: p.nombre })),
        archivada: false
      });

      return newConv;
    },
    onSuccess: (conversation) => {
      refetchConversations();
      setActivePrivateChat(conversation);
    },
  });

  const sendPrivateMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message, attachments }) => {
      const newMessage = await base44.entities.PrivateMessage.create({
        conversacion_id: conversationId,
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        remitente_tipo: "familia",
        mensaje: message,
        leido: false,
        archivos_adjuntos: attachments
      });

      const conv = privateConversations.find(c => c.id === conversationId);
      await base44.entities.PrivateConversation.update(conversationId, {
        ultimo_mensaje: message.substring(0, 100),
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_de: "familia",
        no_leidos_staff: (conv?.no_leidos_staff || 0) + 1
      });

      return newMessage;
    },
    onSuccess: () => {
      refetchPrivateMessages();
      refetchConversations();
      toast.success("✅ Mensaje enviado al entrenador");
    },
    onError: () => {
      toast.error("Error al enviar");
    }
  });

  useEffect(() => {
    if (loadingConversations || !user) return;
    
    if (selectedCategory === "Coordinación Deportiva" && coordinator) {
      if (activePrivateChat && 
          activePrivateChat.participante_staff_email === coordinator.email && 
          activePrivateChat.categoria === "Coordinación Deportiva") {
        return;
      }
      
      const existingConv = privateConversations.find(c => 
        c.participante_staff_email === coordinator.email && 
        c.categoria === "Coordinación Deportiva"
      );
      
      if (existingConv) {
        setActivePrivateChat(existingConv);
      } else if (!createOrOpenPrivateChat.isPending) {
        createOrOpenPrivateChat.mutate({ staffEmail: coordinator.email, categoria: "Coordinación Deportiva" });
      }
    }
  }, [selectedCategory, user, coordinator, privateConversations, loadingConversations]);

  const handleReplyPrivate = (staffEmail) => {
    createOrOpenPrivateChat.mutate({ staffEmail, categoria: selectedCategory });
  };

  const handlePrivateMessageSent = () => {
    refetchPrivateMessages();
    refetchConversations();
  };

  const isCoachSender = (msg) => msg.tipo === "admin_a_grupo";

  const isAutomaticMessage = (msg) => {
    const mensaje = msg.mensaje?.toLowerCase() || "";
    if (mensaje.includes("🏆 nueva convocatoria") || mensaje.includes("convocatoria")) return true;
    if (mensaje.includes("📢 nuevo anuncio") || mensaje.includes("nuevo anuncio")) return true;
    if (mensaje.includes("📋 nueva encuesta") || mensaje.includes("encuesta disponible")) return true;
    if (mensaje.includes("confirma tu asistencia")) return true;
    if (mensaje.includes("⚠️ importante:")) return true;
    return false;
  };

  const sportEmojis = {
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
    if (selectedCategory && !activePrivateChat) {
      const unreadIds = currentAnnouncements.filter(msg => !msg.leido).map(msg => msg.id);
      if (unreadIds.length > 0) {
        markAsReadMutation.mutate(unreadIds);
      }
    }
  }, [selectedCategory, currentAnnouncements.length, activePrivateChat]);

  useEffect(() => {
    const currentCount = currentAnnouncements.length + privateMessages.length;
    
    if (prevMessagesCountRef.current > 0 && currentCount > prevMessagesCountRef.current) {
      playNotificationSound();
      
      const container = messagesEndRef.current?.parentElement;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        
        if (isNearBottom) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
          }, 100);
        }
      }
    }
    
    prevMessagesCountRef.current = currentCount;
  }, [currentAnnouncements.length, privateMessages.length, playNotificationSound]);

  if (loadingMessages || loadingPlayers || loadingConversations || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-6">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600 font-medium">Cargando chat...</p>
        </div>
      </div>
    );
  }

  if (myCategories.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 text-xl font-semibold mb-2">No hay equipos disponibles</p>
          <p className="text-sm text-slate-500 mt-2">Tus jugadores aparecerán aquí cuando estén registrados</p>
        </div>
      </div>
    );
  }

  // Vista de chat privado cuando NO es Coordinación Deportiva
  if (activePrivateChat && selectedCategory !== "Coordinación Deportiva") {
    return (
      <div className="p-4 lg:p-6 min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="mb-4">
            <Button 
              variant="ghost" 
              onClick={() => setActivePrivateChat(null)}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a anuncios
            </Button>
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <Lock className="w-4 h-4" />
              <span className="font-medium">Chat privado</span>
              <span className="text-green-600">- Solo tú y {activePrivateChat.participante_staff_nombre} ven estos mensajes</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md border overflow-hidden" style={{ height: '70vh' }}>
            <PrivateChatPanel
              conversation={activePrivateChat}
              messages={privateMessages}
              user={user}
              isStaff={false}
              onClose={() => setActivePrivateChat(null)}
              onMessageSent={handlePrivateMessageSent}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'fixed inset-0 flex flex-col overflow-hidden bg-white' : 'p-4 lg:p-6 min-h-screen bg-slate-50'}`} style={isMobile ? { top: '120px' } : {}}>
      {/* MÓVIL: Lista de equipos */}
      {isMobile && !selectedCategory && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white flex-shrink-0">
            <h2 className="text-xl font-bold">💬 Chat del Club</h2>
            <p className="text-sm text-orange-100">{myCategories.length} equipos</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {myCategories.map(cat => {
              const unread = getUnreadCount(cat);
              const privateUnread = getPrivateUnreadCount(cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActivePrivateChat(null);
                    setSelectedCategory(cat);
                    // Scroll al final al abrir
                    setTimeout(() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
                    }, 150);
                  }}
                  className="w-full p-4 flex items-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-orange-100 flex-shrink-0">
                    <span className="text-2xl">{sportEmojis[cat] || "⚽"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate text-base">{cat}</div>
                    <div className="text-sm text-slate-500 truncate">
                      {cat === "Coordinación Deportiva" 
                        ? "Chat con el coordinador"
                        : myPlayers.filter(p => normalizeDeporte(p.deporte) === cat).map(p => p.nombre.split(' ')[0]).join(', ')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {unread > 0 && (
                      <Badge className="bg-blue-500 text-white text-xs px-2 py-1 animate-pulse font-bold">
                        📢 {unread}
                      </Badge>
                    )}
                    {privateUnread > 0 && (
                      <Badge className="bg-green-500 text-white text-sm px-3 py-1.5 animate-bounce font-bold shadow-lg ring-2 ring-green-300">
                        🔒 {privateUnread}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MÓVIL: Coordinación Deportiva */}
      {isMobile && selectedCategory === "Coordinación Deportiva" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white flex-shrink-0">
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setActivePrivateChat(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors -ml-1"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🎓</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg">Coordinación</h2>
                <p className="text-xs text-cyan-100">Chat con el coordinador</p>
              </div>
            </div>
          </div>

          {activePrivateChat ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <PrivateChatPanel
                conversation={activePrivateChat}
                messages={privateMessages}
                user={user}
                isStaff={false}
                onClose={() => {
                  setActivePrivateChat(null);
                  setSelectedCategory(null);
                }}
                onMessageSent={handlePrivateMessageSent}
                hideHeader={true}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 bg-slate-50">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-600 border-r-transparent mb-4"></div>
                <p className="text-slate-600">Abriendo chat...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MÓVIL: Chat de equipos normal - VISTA UNIFICADA */}
      {isMobile && selectedCategory && selectedCategory !== "Coordinación Deportiva" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors -ml-1"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">{sportEmojis[selectedCategory] || "⚽"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">{selectedCategory}</h2>
              <p className="text-xs text-blue-100 truncate">💬 Chat con entrenador</p>
            </div>
            {getPrivateUnreadCount(selectedCategory) > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                {getPrivateUnreadCount(selectedCategory)}
              </Badge>
            )}
          </div>

          <ParentThreadedView
            category={selectedCategory}
            groupMessages={currentAnnouncements}
            myPrivateConversation={privateConversations.find(c => c.categoria === selectedCategory && !c.archivada)}
            myPrivateMessages={privateMessages}
            user={user}
            onReplyPrivate={handleReplyPrivate}
            onSendPrivateMessage={({ conversationId, message, attachments }) => {
              sendPrivateMessageMutation.mutate({ conversationId, message, attachments });
            }}
            onVotePoll={(msgId, optIdx) => voteOnPollMutation.mutate({ messageId: msgId, optionIndex: optIdx })}
            isSending={sendPrivateMessageMutation.isPending}
            sportEmoji={sportEmojis[selectedCategory]}
          />
        </div>
      )}

      {/* DESKTOP */}
      {!isMobile && (
        <>
          <div className="mb-4 flex-shrink-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">💬 Chat del Club</h1>
            <p className="text-slate-600 text-sm">Comunicación con entrenadores y coordinación</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 bg-white rounded-xl shadow-md border overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white">
                <h3 className="font-bold">Equipos de mis hijos</h3>
                <p className="text-xs text-orange-100">{myCategories.length} categorías</p>
              </div>
              <div className="divide-y max-h-[60vh] overflow-y-auto">
                {myCategories.map(cat => {
                  const unread = getUnreadCount(cat);
                  const privateUnread = getPrivateUnreadCount(cat);

                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        if (selectedCategory !== cat) {
                          setActivePrivateChat(null);
                          setSelectedCategory(cat);
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
                          {cat === "Coordinación Deportiva" 
                            ? (privateUnread > 0 ? `💬 ${privateUnread} respuesta(s)` : "Chat con el coordinador")
                            : myPlayers.filter(p => normalizeDeporte(p.deporte) === cat).map(p => p.nombre.split(' ')[0]).join(', ')}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {unread > 0 && (
                          <Badge className="bg-blue-500 text-white text-[10px] px-2 py-0.5 animate-pulse">
                            📢 {unread}
                          </Badge>
                        )}
                        {privateUnread > 0 && (
                          <Badge className="bg-green-500 text-white text-xs px-2.5 py-1 animate-bounce font-bold shadow-lg ring-2 ring-green-300">
                            🔒 {privateUnread}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-3">
              {!selectedCategory ? (
                <div className="bg-white rounded-xl shadow-md border p-12 text-center" style={{ height: '70vh' }}>
                  <div className="flex flex-col items-center justify-center h-full">
                    <Users className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-slate-600 font-medium">Selecciona un equipo</p>
                    <p className="text-sm text-slate-400 mt-2">Elige el equipo de tu hijo para ver los anuncios</p>
                  </div>
                </div>
              ) : selectedCategory === "Coordinación Deportiva" ? (
                <div className="bg-white rounded-xl shadow-md border overflow-hidden flex flex-col" style={{ height: '70vh' }}>
                  {activePrivateChat ? (
                    <PrivateChatPanel
                      conversation={activePrivateChat}
                      messages={privateMessages}
                      user={user}
                      isStaff={false}
                      onClose={() => setActivePrivateChat(null)}
                      onMessageSent={handlePrivateMessageSent}
                      hideHeader={false}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-600 border-r-transparent"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-md border overflow-hidden flex flex-col" style={{ height: '70vh' }}>
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white flex items-center gap-3 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-xl">{sportEmojis[selectedCategory] || "⚽"}</span>
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold">{selectedCategory}</h2>
                      <p className="text-xs text-blue-100">💬 Chat con entrenador</p>
                    </div>
                    {getPrivateUnreadCount(selectedCategory) > 0 && (
                      <Badge className="bg-red-500 text-white animate-pulse">
                        {getPrivateUnreadCount(selectedCategory)} nuevas
                      </Badge>
                    )}
                  </div>

                  <ParentThreadedView
                    category={selectedCategory}
                    groupMessages={currentAnnouncements}
                    myPrivateConversation={privateConversations.find(c => c.categoria === selectedCategory && !c.archivada)}
                    myPrivateMessages={privateMessages}
                    user={user}
                    onReplyPrivate={handleReplyPrivate}
                    onSendPrivateMessage={({ conversationId, message, attachments }) => {
                      sendPrivateMessageMutation.mutate({ conversationId, message, attachments });
                    }}
                    onVotePoll={(msgId, optIdx) => voteOnPollMutation.mutate({ messageId: msgId, optionIndex: optIdx })}
                    isSending={sendPrivateMessageMutation?.isPending || false}
                    sportEmoji={sportEmojis[selectedCategory]}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}