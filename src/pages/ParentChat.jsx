import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, AlertCircle, X, ArrowLeft, Users, MessageCircle, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import PrivateChatPanel from "../components/chat/PrivateChatPanel";
import StartPrivateConversationDialog from "../components/chat/StartPrivateConversationDialog";

export default function ParentChat() {
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [chatSubMode, setChatSubMode] = useState("anuncios"); // "anuncios" o "privado"
  const [messageContent, setMessageContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    refetchOnWindowFocus: false,
  });

  const { data: players = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: privateConversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['myPrivateConversations', user?.email],
    queryFn: () => user ? base44.entities.PrivateConversation.filter({ participante_familia_email: user.email }, '-ultimo_mensaje_fecha') : [],
    enabled: !!user?.email,
  });

  const { data: privateMessages = [], refetch: refetchPrivateMessages } = useQuery({
    queryKey: ['privateMessages', selectedConversation?.id],
    queryFn: () => selectedConversation 
      ? base44.entities.PrivateMessage.filter({ conversacion_id: selectedConversation.id }, '-created_date')
      : [],
    enabled: !!selectedConversation?.id,
  });

  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    return deporte.trim().replace(/_undefined$/, '').replace(/_$/, '');
  };

  // Mis jugadores y sus categorías
  const myPlayers = user ? players.filter(p => 
    p.email_padre === user.email || p.email_tutor_2 === user.email
  ) : [];

  const myCategories = [...new Set(myPlayers.map(p => normalizeDeporte(p.deporte)).filter(Boolean))];

  // Conversaciones privadas de la categoría seleccionada
  const categoryPrivateConversations = useMemo(() => {
    if (!selectedCategory) return [];
    return privateConversations.filter(conv => conv.categoria === selectedCategory && !conv.archivada);
  }, [privateConversations, selectedCategory]);

  // Contador no leídos por categoría (privados)
  const getUnreadCountForCategory = (categoria) => {
    return privateConversations.filter(c => 
      c.categoria === categoria && !c.archivada && (c.no_leidos_familia || 0) > 0
    ).reduce((sum, c) => sum + (c.no_leidos_familia || 0), 0);
  };

  // Mensajes del grupo (anuncios del staff)
  const currentGroupMessages = useMemo(() => {
    if (!selectedCategory) return [];
    return messages.filter(msg => {
      const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
      if (msgDeporte !== selectedCategory) return false;
      // Solo mostrar anuncios del staff
      if (msg.tipo === "admin_a_grupo") return true;
      return false;
    });
  }, [messages, selectedCategory]);

  // Contador anuncios no leídos por categoría
  const getUnreadAnnouncementsForCategory = (categoria) => {
    return messages.filter(msg => {
      const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
      return msgDeporte === categoria && !msg.leido && msg.tipo === "admin_a_grupo";
    }).length;
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      await Promise.all(messageIds.map(id => 
        base44.entities.ChatMessage.update(id, { leido: true })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatMessages'] }),
  });

  // Marcar anuncios como leídos al seleccionar categoría
  useEffect(() => {
    if (selectedCategory && chatSubMode === "anuncios") {
      const unreadIds = currentGroupMessages.filter(msg => !msg.leido).map(msg => msg.id);
      if (unreadIds.length > 0) {
        markAsReadMutation.mutate(unreadIds);
      }
    }
  }, [selectedCategory, chatSubMode, currentGroupMessages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentGroupMessages, privateMessages]);

  const handlePrivateMessageSent = () => {
    refetchPrivateMessages();
    refetchConversations();
  };

  const handleConversationCreated = (conversation) => {
    refetchConversations();
    setSelectedConversation(conversation);
  };

  const sportEmojis = {
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

  if (loadingMessages || loadingPlayers || !user) {
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

  return (
    <>
      <StartPrivateConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        user={user}
        myPlayers={myPlayers.filter(p => normalizeDeporte(p.deporte) === selectedCategory)}
        existingConversations={privateConversations}
        onConversationCreated={handleConversationCreated}
      />

      <div className="p-4 lg:p-6 min-h-screen bg-slate-50">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Chat del Club</h1>
          <p className="text-slate-600 text-sm">Selecciona el equipo de tu hijo para ver anuncios y mensajes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Lista de equipos/categorías */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-md border overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white">
              <h3 className="font-bold">Equipos de mis hijos</h3>
              <p className="text-xs text-orange-100">{myCategories.length} categorías</p>
            </div>
            <div className="divide-y max-h-[60vh] overflow-y-auto">
              {myCategories.map(cat => {
                const unreadAnnouncements = getUnreadAnnouncementsForCategory(cat);
                const unreadPrivate = getUnreadCountForCategory(cat);
                const totalUnread = unreadAnnouncements + unreadPrivate;
                
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setChatSubMode("anuncios");
                      setSelectedConversation(null);
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
                        {myPlayers.filter(p => normalizeDeporte(p.deporte) === cat).map(p => p.nombre.split(' ')[0]).join(', ')}
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

          {/* Panel principal */}
          <div className="lg:col-span-3 space-y-4">
            {selectedCategory ? (
              <>
                {/* Sub-tabs */}
                <div className="bg-white rounded-xl shadow-md border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-bold text-lg text-slate-900">
                      {sportEmojis[selectedCategory] || "⚽"} {selectedCategory}
                    </h2>
                  </div>
                  <Tabs value={chatSubMode} onValueChange={(v) => { setChatSubMode(v); setSelectedConversation(null); }}>
                    <TabsList className="w-full">
                      <TabsTrigger value="anuncios" className="flex-1 gap-2">
                        <Users className="w-4 h-4" />
                        📢 Anuncios
                        <span className="text-[10px] text-slate-500 hidden md:inline">(del entrenador)</span>
                        {getUnreadAnnouncementsForCategory(selectedCategory) > 0 && (
                          <Badge className="bg-orange-500 text-white text-xs ml-1">{getUnreadAnnouncementsForCategory(selectedCategory)}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="privado" className="flex-1 gap-2">
                        <MessageCircle className="w-4 h-4" />
                        🔒 Privado
                        <span className="text-[10px] text-slate-500 hidden md:inline">(con entrenador)</span>
                        {getUnreadCountForCategory(selectedCategory) > 0 && (
                          <Badge className="bg-green-500 text-white text-xs ml-1">{getUnreadCountForCategory(selectedCategory)}</Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {chatSubMode === "anuncios" ? (
                  /* ANUNCIOS */
                  <div className="bg-white rounded-xl shadow-md border overflow-hidden flex flex-col" style={{ height: 'calc(70vh - 100px)' }}>
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 text-white flex items-center gap-3 flex-shrink-0">
                      <Users className="w-5 h-5" />
                      <div>
                        <h3 className="font-bold text-sm">Anuncios del entrenador</h3>
                        <p className="text-xs text-blue-100">Todos los padres del grupo ven estos mensajes</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ backgroundColor: '#e5ddd5' }}>
                      {currentGroupMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center text-slate-500 bg-white/80 rounded-xl p-6">
                            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay anuncios del entrenador</p>
                          </div>
                        </div>
                      ) : (
                        currentGroupMessages
                          .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                          .map((msg) => (
                            <div key={msg.id} className="flex justify-start mb-1">
                              <div className="max-w-[85%] rounded-lg shadow-sm bg-white text-slate-900 rounded-bl-none">
                                <div className="px-3 py-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-orange-700">
                                      🎓 {msg.remitente_nombre}
                                    </span>
                                    {msg.prioridad !== "Normal" && (
                                      <span className="text-xs">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                                    )}
                                  </div>
                                  <p className="text-sm leading-relaxed">{msg.mensaje}</p>
                                  {msg.archivos_adjuntos?.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {msg.archivos_adjuntos.map((att, idx) => (
                                        <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline block">
                                          📎 {att.nombre}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                  <div className="text-right mt-1">
                                    <span className="text-[10px] text-slate-500">{format(new Date(msg.created_date), "HH:mm")}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Info - los padres no envían en anuncios */}
                    <div className="bg-slate-100 border-t p-3 text-center text-xs text-slate-500">
                      📢 Este es el tablón de anuncios del equipo. Para escribir al entrenador usa la pestaña "Privado"
                    </div>
                  </div>
                ) : (
                  /* PRIVADO */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Lista de conversaciones */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-md border overflow-hidden" style={{ height: 'calc(70vh - 100px)' }}>
                      <div className="bg-gradient-to-r from-green-600 to-green-700 p-3 text-white">
                        <h3 className="font-bold text-sm">Mis conversaciones</h3>
                        <p className="text-xs text-green-100">Solo tú y el entrenador las ven</p>
                      </div>
                      <div className="p-2 border-b">
                        <Button
                          onClick={() => setShowNewConversation(true)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Nueva conversación
                        </Button>
                      </div>
                      <div className="divide-y overflow-y-auto" style={{ maxHeight: 'calc(100% - 110px)' }}>
                        {categoryPrivateConversations.length === 0 ? (
                          <div className="p-6 text-center text-slate-500">
                            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">Sin conversaciones</p>
                            <p className="text-xs mt-1">Pulsa "Nueva conversación" para escribir al entrenador</p>
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
                                (conv.no_leidos_familia || 0) > 0 ? 'bg-green-600 text-white' : 'bg-slate-200'
                              }`}>
                                <User className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 truncate text-sm">
                                  {conv.participante_staff_nombre}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {conv.participante_staff_rol === 'entrenador' ? '🎓 Entrenador' : '📋 Coordinador'}
                                </div>
                                {conv.ultimo_mensaje && (
                                  <div className="text-xs text-slate-400 truncate">
                                    {conv.ultimo_mensaje_de === 'familia' ? '↩️ ' : '📩 '}{conv.ultimo_mensaje}
                                  </div>
                                )}
                              </div>
                              {(conv.no_leidos_familia || 0) > 0 && (
                                <Badge className="bg-green-600 text-white text-xs animate-pulse">{conv.no_leidos_familia}</Badge>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Chat privado */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-md border overflow-hidden" style={{ height: 'calc(70vh - 100px)' }}>
                      {selectedConversation ? (
                        <PrivateChatPanel
                          conversation={selectedConversation}
                          messages={privateMessages}
                          user={user}
                          isStaff={false}
                          onClose={() => setSelectedConversation(null)}
                          onMessageSent={handlePrivateMessageSent}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-500">
                          <div className="text-center">
                            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">Chat Privado</p>
                            <p className="text-xs mt-2 max-w-xs mx-auto">
                              Solo tú y el entrenador ven estos mensajes. Ideal para temas personales de tu hijo.
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
                <p className="text-slate-600 font-medium">Selecciona un equipo</p>
                <p className="text-sm text-slate-400 mt-2">Elige el equipo de tu hijo de la izquierda</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}