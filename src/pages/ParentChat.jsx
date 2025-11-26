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

export default function ParentChat() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activePrivateChat, setActivePrivateChat] = useState(null); // conversación privada activa
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [messageContent, setMessageContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

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
    refetchOnWindowFocus: false,
  });

  const { data: players = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  // Para padres: no podemos listar usuarios por permisos, usamos email hardcoded del coordinador
  // o buscamos en conversaciones existentes
  const COORDINATOR_EMAIL = "manuel.bermudo@gvcgaesco.es";
  const COORDINATOR_NAME = "Manuel Bermudo";
  
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Coordinador hardcodeado ya que los padres no pueden listar usuarios
  const coordinator = useMemo(() => {
    return {
      email: COORDINATOR_EMAIL,
      full_name: COORDINATOR_NAME,
      es_coordinador: true
    };
  }, []);

  const { data: privateConversations = [], refetch: refetchConversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['myPrivateConversations', user?.email],
    queryFn: () => user ? base44.entities.PrivateConversation.filter({ participante_familia_email: user.email }, '-ultimo_mensaje_fecha') : [],
    enabled: !!user?.email,
  });

  const { data: privateMessages = [], refetch: refetchPrivateMessages } = useQuery({
    queryKey: ['privateMessages', activePrivateChat?.id],
    queryFn: () => activePrivateChat 
      ? base44.entities.PrivateMessage.filter({ conversacion_id: activePrivateChat.id }, '-created_date')
      : [],
    enabled: !!activePrivateChat?.id,
  });

  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    return deporte.trim().replace(/_undefined$/, '').replace(/_$/, '');
  };

  // Mis jugadores y categorías
  const myPlayers = user ? players.filter(p => 
    p.email_padre === user.email || p.email_tutor_2 === user.email
  ) : [];

  // Añadir "Coordinación Deportiva" siempre + las categorías de mis hijos
  const myCategories = [
    "Coordinación Deportiva",
    ...new Set(myPlayers.map(p => normalizeDeporte(p.deporte)).filter(Boolean))
  ];

  // Mensajes del grupo seleccionado
  const currentAnnouncements = useMemo(() => {
    if (!selectedCategory) return [];
    return messages.filter(msg => {
      const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
      // En coordinación mostrar todos los mensajes, en equipos solo admin_a_grupo
      if (selectedCategory === "Coordinación Deportiva") {
        return msgDeporte === selectedCategory;
      }
      return msgDeporte === selectedCategory && msg.tipo === "admin_a_grupo";
    });
  }, [messages, selectedCategory]);

  // Contador no leídos
  const getUnreadCount = (categoria) => {
    return messages.filter(msg => {
      const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
      return msgDeporte === categoria && !msg.leido && msg.tipo === "admin_a_grupo";
    }).length;
  };

  // Contador privados no leídos para familias
  const getPrivateUnreadCount = (categoria) => {
    const convs = privateConversations.filter(c => c.categoria === categoria && !c.archivada);
    return convs.reduce((sum, c) => sum + (c.no_leidos_familia || 0), 0);
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      await Promise.all(messageIds.map(id => 
        base44.entities.ChatMessage.update(id, { leido: true })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatMessages'] }),
  });



  // Marcar como leídos al ver
  useEffect(() => {
    if (selectedCategory && !activePrivateChat) {
      const unreadIds = currentAnnouncements.filter(msg => !msg.leido).map(msg => msg.id);
      if (unreadIds.length > 0) {
        markAsReadMutation.mutate(unreadIds);
      }
    }
  }, [selectedCategory, currentAnnouncements.length, activePrivateChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentAnnouncements, privateMessages]);

  // Verificar si el remitente es entrenador (siempre true para mensajes admin_a_grupo ya que vienen de entrenadores)
  const isCoachSender = (msg) => {
    // Todos los mensajes admin_a_grupo en equipos son de entrenadores/coordinadores
    return msg.tipo === "admin_a_grupo";
  };

  // Crear o abrir chat privado con el remitente de un anuncio
  const createOrOpenPrivateChat = useMutation({
    mutationFn: async ({ staffEmail, categoria }) => {
      // Buscar si ya existe conversación
      const existing = privateConversations.find(c => 
        c.participante_staff_email === staffEmail && 
        c.categoria === categoria
      );
      
      if (existing) return existing;

      // Buscar info del staff
      const staffUser = allUsers.find(u => u.email === staffEmail);
      const staffName = staffUser?.full_name || staffEmail.split('@')[0];
      const staffRole = staffUser?.es_coordinador ? 'coordinador' : 'entrenador';

      // Crear nueva conversación
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

  // Cuando se selecciona Coordinación Deportiva, abrir chat privado con coordinador
  useEffect(() => {
    // Esperar a que todo esté cargado
    if (loadingUsers || loadingConversations || !user) return;
    
    if (selectedCategory === "Coordinación Deportiva" && coordinator) {
      // Si ya tenemos un chat activo con el coordinador en esta categoría, no hacer nada
      if (activePrivateChat && 
          activePrivateChat.participante_staff_email === coordinator.email && 
          activePrivateChat.categoria === "Coordinación Deportiva") {
        return;
      }
      
      // Buscar si ya existe conversación privada con coordinador
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
  }, [selectedCategory, user, coordinator, privateConversations, loadingUsers, loadingConversations]);

  const handleReplyPrivate = (staffEmail) => {
    createOrOpenPrivateChat.mutate({ staffEmail, categoria: selectedCategory });
  };

  const handlePrivateMessageSent = () => {
    refetchPrivateMessages();
    refetchConversations();
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

  // Si hay chat privado activo (NO coordinación), mostrar solo eso
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
    <div className="p-4 lg:p-6 min-h-screen bg-slate-50">
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">💬 Chat del Club</h1>
        <p className="text-slate-600 text-sm">Comunicación con entrenadores y coordinación</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Lista de equipos */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-md border overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white">
            <h3 className="font-bold">Equipos de mis hijos</h3>
            <p className="text-xs text-orange-100">{myCategories.length} categorías</p>
          </div>
          <div className="divide-y max-h-[60vh] overflow-y-auto">
            {myCategories.map(cat => {
              const unread = getUnreadCount(cat);
              const privateUnread = getPrivateUnreadCount(cat);
              const totalUnread = unread + privateUnread;
              
              return (
                <button
                  key={cat}
                  onClick={() => {
                    if (selectedCategory !== cat) {
                      setActivePrivateChat(null); // Limpiar chat privado al cambiar categoría
                      setSelectedCategory(cat);
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
                      {cat === "Coordinación Deportiva" 
                        ? "Chat con el coordinador" 
                        : myPlayers.filter(p => normalizeDeporte(p.deporte) === cat).map(p => p.nombre.split(' ')[0]).join(', ')}
                    </div>
                  </div>
                  {totalUnread > 0 && (
                    <Badge className="bg-red-500 text-white text-xs animate-pulse">{totalUnread}</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel de anuncios */}
        <div className="lg:col-span-3">
          {selectedCategory ? (
            selectedCategory === "Coordinación Deportiva" ? (
              /* Chat con coordinador - siempre abierto para escribir */
              activePrivateChat ? (
                <div className="bg-white rounded-xl shadow-md border overflow-hidden" style={{ height: '70vh' }}>
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
                  />
                </div>
              ) : (
                /* Cargando chat con coordinador */
                <div className="bg-white rounded-xl shadow-md border overflow-hidden flex items-center justify-center" style={{ height: '70vh' }}>
                  <div className="text-center">
                    {coordinator ? (
                      <>
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent mb-4"></div>
                        <p className="text-slate-600">Abriendo chat con coordinación...</p>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">No hay coordinador disponible</p>
                        <p className="text-sm text-slate-400 mt-2">Contacta con el club para más información</p>
                      </>
                    )}
                  </div>
                </div>
              )
            ) : (
              /* Chat de equipos normal */
              <div className="bg-white rounded-xl shadow-md border overflow-hidden flex flex-col" style={{ height: '70vh' }}>
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white flex items-center gap-3 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xl">{sportEmojis[selectedCategory] || "⚽"}</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold">{selectedCategory}</h2>
                    <p className="text-xs text-blue-100">📢 Mensajes del entrenador</p>
                  </div>
                  {/* Indicador de mensajes privados sin leer */}
                  {getPrivateUnreadCount(selectedCategory) > 0 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const conv = privateConversations.find(c => 
                          c.categoria === selectedCategory && 
                          !c.archivada && 
                          (c.no_leidos_familia || 0) > 0
                        );
                        if (conv) setActivePrivateChat(conv);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white gap-2 animate-pulse"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {getPrivateUnreadCount(selectedCategory)} respuesta(s) privada(s)
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: '#e5ddd5' }}>
                  {currentAnnouncements.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-slate-500 bg-white/80 rounded-xl p-6">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay mensajes del entrenador</p>
                      </div>
                    </div>
                  ) : (
                    currentAnnouncements
                      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                      .map((msg) => (
                        <div key={msg.id} className="flex justify-start">
                          <div className="max-w-[90%] rounded-xl shadow-sm overflow-hidden bg-white">
                            <div className="px-4 py-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-orange-700">
                                  🏃 {msg.remitente_nombre || "Entrenador"}
                                </span>
                                {msg.prioridad !== "Normal" && (
                                  <Badge className={msg.prioridad === "Urgente" ? "bg-red-500" : "bg-yellow-500"}>
                                    {msg.prioridad}
                                  </Badge>
                                )}
                                <span className="text-[10px] ml-auto text-slate-400">
                                  {format(new Date(msg.created_date), "d MMM HH:mm", { locale: es })}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">{msg.mensaje}</p>
                              
                              {msg.archivos_adjuntos?.length > 0 && (
                                <div className="mt-2">
                                  <MessageAttachments attachments={msg.archivos_adjuntos} />
                                </div>
                              )}
                            </div>
                            
                            {/* Botón responder en privado - siempre mostrar para mensajes de grupo */}
                            {isCoachSender(msg) && (
                              <div className="bg-slate-50 px-4 py-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReplyPrivate(msg.remitente_email)}
                                  disabled={createOrOpenPrivateChat.isPending}
                                  className="text-green-700 hover:text-green-800 hover:bg-green-50 w-full justify-center gap-2"
                                >
                                  <Lock className="w-3 h-3" />
                                  💬 Responder en privado
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="bg-blue-50 border-t px-4 py-3 flex-shrink-0">
                  {getPrivateUnreadCount(selectedCategory) > 0 ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const conv = privateConversations.find(c => 
                          c.categoria === selectedCategory && 
                          !c.archivada && 
                          (c.no_leidos_familia || 0) > 0
                        );
                        if (conv) setActivePrivateChat(conv);
                      }}
                      className="w-full text-green-700 hover:bg-green-100 gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      ✉️ Tienes {getPrivateUnreadCount(selectedCategory)} respuesta(s) del entrenador - Pulsa para ver
                    </Button>
                  ) : (
                    <p className="text-xs text-blue-700 text-center">
                      💬 Usa "Responder en privado" para hablar directamente con el entrenador
                    </p>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="bg-white rounded-xl shadow-md border p-12 text-center" style={{ height: '70vh' }}>
              <div className="flex flex-col items-center justify-center h-full">
                <Users className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-slate-600 font-medium">Selecciona un equipo</p>
                <p className="text-sm text-slate-400 mt-2">Elige el equipo de tu hijo para ver los anuncios</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}