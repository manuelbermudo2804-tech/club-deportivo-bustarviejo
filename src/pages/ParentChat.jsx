import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Clock, AlertCircle, X, ArrowLeft, Users, MessageCircle, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import PrivateChatPanel from "../components/chat/PrivateChatPanel";
import StartPrivateConversationDialog from "../components/chat/StartPrivateConversationDialog";

export default function ParentChat() {
  const location = useLocation();
  const [messageContent, setMessageContent] = useState("");
  const [selectedTab, setSelectedTab] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [chatMode, setChatMode] = useState("anuncios"); // "anuncios" o "privado"
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

  // Conversaciones privadas del padre
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

  // Total mensajes privados sin leer
  const totalPrivateUnread = useMemo(() => 
    privateConversations.reduce((sum, c) => sum + (c.no_leidos_familia || 0), 0),
    [privateConversations]
  );

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const newMessage = await base44.entities.ChatMessage.create(messageData);
      
      const imageAttachments = messageData.archivos_adjuntos.filter(att => att.tipo === "imagen");
      if (imageAttachments.length > 0) {
        const albumData = {
          titulo: `Chat - ${messageData.deporte} (${format(new Date(), "d MMM yyyy")})`,
          descripcion: messageData.mensaje || "Fotos del chat",
          fecha_evento: new Date().toISOString().split('T')[0],
          categoria: messageData.deporte,
          tipo_evento: "Otro",
          fotos: imageAttachments.map(img => ({
            url: img.url,
            descripcion: messageData.mensaje || "",
            jugadores_etiquetados: []
          })),
          visible_para_padres: true,
          destacado: false
        };
        
        await base44.entities.PhotoGallery.create(albumData);
      }
      
      return newMessage;
    },
    onSuccess: async () => {
      await refetchMessages();
      setMessageContent("");
      setAttachments([]);
      toast.success("Mensaje enviado");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      await Promise.all(messageIds.map(id => 
        base44.entities.ChatMessage.update(id, { leido: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    return deporte.trim().replace(/_undefined$/, '').replace(/_$/, '');
  };

  const myPlayers = user ? players.filter(p => 
    p.email_padre === user.email || p.email_tutor_2 === user.email
  ) : [];

  const myGroupSports = [...new Set(myPlayers.map(p => normalizeDeporte(p.deporte)).filter(Boolean))];

  // Filtrar mensajes: solo los del staff (admin/coordinador) + los propios del usuario
  const filterMessagesForFamily = (msgs, deporte) => {
    return msgs.filter(msg => {
      const matchesGroup = normalizeDeporte(msg.grupo_id || msg.deporte) === deporte;
      if (!matchesGroup) return false;
      
      // Siempre mostrar mensajes del staff
      if (msg.tipo === "admin_a_grupo" || msg.tipo === "coordinador_a_familia") return true;
      
      // Solo mostrar mensajes propios del padre (no de otras familias)
      if (msg.tipo === "padre_a_grupo" && msg.remitente_email === user?.email) return true;
      
      return false;
    });
  };

  const groups = [{
    id: "Coordinación Deportiva",
    deporte: "Coordinación Deportiva",
    messages: filterMessagesForFamily(messages, "Coordinación Deportiva"),
    unreadCount: messages.filter(msg => 
      !msg.leido && 
      (msg.tipo === "coordinador_a_familia" || msg.tipo === "admin_a_grupo") && 
      normalizeDeporte(msg.grupo_id || msg.deporte) === "Coordinación Deportiva"
    ).length
  }];

  myGroupSports.forEach(deporte => {
    const groupMessages = filterMessagesForFamily(messages, deporte);
    groups.push({
      id: deporte,
      deporte,
      messages: groupMessages,
      unreadCount: groupMessages.filter(msg => !msg.leido && msg.tipo === "admin_a_grupo").length
    });
  });

  const currentGroup = groups.find(g => g.id === selectedTab);

  useEffect(() => {
    if (groups.length > 0 && !selectedTab) {
      const params = new URLSearchParams(location.search);
      const groupParam = params.get('group');
      
      if (groupParam) {
        const targetGroup = groups.find(g => g.deporte === decodeURIComponent(groupParam));
        if (targetGroup) {
          setSelectedTab(targetGroup.id);
          return;
        }
      }
      
      if (!isMobile) {
        setSelectedTab(groups[0].id);
      }
    }
  }, [groups.length, isMobile]);

  useEffect(() => {
    if (selectedTab && currentGroup?.messages) {
      const unreadMessageIds = currentGroup.messages
        .filter(msg => !msg.leido && (msg.tipo === "admin_a_grupo" || msg.tipo === "coordinador_a_familia"))
        .map(msg => msg.id);
      
      if (unreadMessageIds.length > 0) {
        markAsReadMutation.mutate(unreadMessageIds);
      }
    }
  }, [selectedTab, currentGroup?.messages?.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentGroup?.messages]);

  const isBusinessHours = () => {
    const hour = new Date().getHours();
    return hour >= 10 && hour < 20;
  };

  const handleSendMessage = () => {
    if (!user || !selectedTab) return;
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje");
      return;
    }
    if (!isBusinessHours()) {
      toast.error("Solo entre 10:00 y 20:00");
      return;
    }

    sendMessageMutation.mutate({
      remitente_email: user.email,
      remitente_nombre: user.full_name,
      mensaje: messageContent || "(Archivo adjunto)",
      prioridad: "Normal",
      tipo: "padre_a_grupo",
      deporte: selectedTab,
      categoria: "",
      grupo_id: selectedTab,
      leido: false,
      archivos_adjuntos: attachments
    });
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

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 text-xl font-semibold mb-2">No hay grupos disponibles</p>
          <p className="text-sm text-slate-500 mt-2">Tus jugadores aparecerán aquí cuando estén registrados en el club</p>
        </div>
      </div>
    );
  }

  const handlePrivateMessageSent = () => {
    refetchPrivateMessages();
    refetchConversations();
  };

  const handleConversationCreated = (conversation) => {
    refetchConversations();
    setSelectedConversation(conversation);
  };

  return (
    <>
      <StartPrivateConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        user={user}
        myPlayers={myPlayers}
        existingConversations={privateConversations}
        onConversationCreated={handleConversationCreated}
      />
      <div className="p-4 lg:p-6 min-h-screen bg-slate-50">
      {/* Header con tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Chats</h2>
          <p className="text-sm text-slate-600">
            {chatMode === "anuncios" ? "Anuncios del equipo" : "Conversaciones privadas"}
          </p>
        </div>
        
        <Tabs value={chatMode} onValueChange={(v) => { setChatMode(v); setSelectedTab(null); setSelectedConversation(null); }} className="w-full md:w-auto">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="anuncios" className="flex-1 md:flex-none gap-2">
              <Users className="w-4 h-4" />
              Anuncios
            </TabsTrigger>
            <TabsTrigger value="privado" className="flex-1 md:flex-none gap-2">
              <MessageCircle className="w-4 h-4" />
              Privado
              {totalPrivateUnread > 0 && (
                <Badge className="bg-red-500 text-white text-xs ml-1">{totalPrivateUnread}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {chatMode === "privado" ? (
        /* MODO PRIVADO */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lista de conversaciones privadas */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-md border overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-green-600 to-green-700 text-white">
              <h3 className="font-bold">Conversaciones</h3>
              <p className="text-xs text-green-100">{privateConversations.length} chats privados</p>
            </div>
            <div className="divide-y max-h-[60vh] overflow-y-auto">
              <div className="p-3 border-b">
                <Button
                  onClick={() => setShowNewConversation(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Nueva conversación
                </Button>
              </div>
              {privateConversations.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tienes conversaciones privadas</p>
                  <p className="text-xs mt-2">Inicia una conversación con el entrenador</p>
                </div>
              ) : (
                privateConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 flex items-center gap-3 transition-colors text-left ${
                      selectedConversation?.id === conv.id ? 'bg-green-50 border-l-4 border-l-green-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      conv.no_leidos_familia > 0 ? 'bg-green-600 text-white' : 'bg-slate-200'
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {conv.participante_staff_nombre}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {conv.participante_staff_rol === 'entrenador' ? '🎓 Entrenador' : conv.participante_staff_rol === 'coordinador' ? '📋 Coordinador' : '👤 Admin'} • {conv.categoria}
                      </div>
                      {conv.ultimo_mensaje && (
                        <div className="text-xs text-slate-400 truncate mt-1">
                          {conv.ultimo_mensaje_de === 'familia' ? '↩️ ' : ''}{conv.ultimo_mensaje}
                        </div>
                      )}
                    </div>
                    {conv.no_leidos_familia > 0 && (
                      <Badge className="bg-green-600 text-white">{conv.no_leidos_familia}</Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat privado */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md border overflow-hidden" style={{ height: '70vh' }}>
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
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">Chats Privados</p>
                  <p className="text-sm mt-2">Selecciona una conversación</p>
                  <p className="text-xs text-slate-400 mt-4 max-w-xs mx-auto">
                    Aquí puedes hablar directamente con el entrenador o coordinador de tu hijo
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : isMobile ? (
        /* MODO ANUNCIOS - Mobile */
        <>
          {!selectedTab ? (
            <div>
              <div className="space-y-2">
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedTab(group.id)}
                    className="w-full p-4 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors text-left rounded-xl shadow-md border border-slate-200"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                      group.deporte === "Coordinación Deportiva" ? 'bg-cyan-100' : 'bg-orange-100'
                    }`}>
                      <span className="text-2xl">{sportEmojis[group.deporte]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{group.deporte}</div>
                      <div className="text-sm text-slate-600 truncate">
                        {group.messages.length} mensajes
                      </div>
                    </div>
                    {group.unreadCount > 0 && (
                      <Badge className="bg-orange-600 text-white text-sm h-7 min-w-7 rounded-full flex items-center justify-center shadow-lg">
                        {group.unreadCount}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : currentGroup && (
            <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ top: '120px' }}>
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0">
                <button
                  onClick={() => setSelectedTab(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-xl">{sportEmojis[currentGroup.deporte]}</span>
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-base">{currentGroup.deporte}</h2>
                  <p className="text-xs text-orange-100">Chat del grupo</p>
                </div>
              </div>

              <div 
                className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundColor: '#e5ddd5'
                }}
              >
                {currentGroup.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-slate-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay mensajes</p>
                    </div>
                  </div>
                ) : (
                  currentGroup.messages
                    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.tipo === "padre_a_grupo" ? 'justify-end' : 'justify-start'} mb-1 w-full px-1`}
                      >
                        <div
                          className={`max-w-[85%] lg:max-w-[75%] rounded-lg shadow-sm overflow-hidden ${
                            msg.tipo === "padre_a_grupo"
                              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-br-none'
                              : msg.tipo === "coordinador_a_familia"
                              ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-bl-none'
                              : 'bg-white text-slate-900 rounded-bl-none'
                          }`}
                        >
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold truncate ${
                                msg.tipo === "padre_a_grupo" ? 'text-green-100' 
                                : msg.tipo === "coordinador_a_familia" ? 'text-cyan-100'
                                : 'text-orange-700'
                              }`}>
                                {msg.tipo === "coordinador_a_familia" ? "🎓 " : ""}{msg.remitente_nombre}
                              </span>
                              {msg.prioridad !== "Normal" && (
                                <span className="text-xs flex-shrink-0">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">{msg.mensaje}</p>
                            
                            {msg.archivos_adjuntos?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.archivos_adjuntos.map((att, idx) => (
                                  <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs underline block">
                                    📎 {att.nombre}
                                  </a>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className={`text-[10px] ${
                                msg.tipo === "padre_a_grupo" ? 'text-green-100' 
                                : msg.tipo === "coordinador_a_familia" ? 'text-cyan-100'
                                : 'text-slate-500'
                              }`}>
                                {format(new Date(msg.created_date), "HH:mm")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="bg-white border-t p-3 flex-shrink-0">
                {attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachments.map((att, index) => (
                      <div key={index} className="bg-slate-100 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                        <span className="text-xs truncate max-w-[150px]">{att.nombre}</span>
                        <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))} className="text-slate-500 hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  <Input
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder={isBusinessHours() ? "Escribe un mensaje..." : "Horario: 10:00 - 20:00"}
                    className="flex-1 rounded-full"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={!isBusinessHours()}
                  />
                  
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageContent.trim() || sendMessageMutation.isPending || !isBusinessHours()}
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* MODO ANUNCIOS - Desktop */
        <div className="flex gap-4" style={{ height: '70vh' }}>
          <div className="flex-1 flex flex-col">
            {groups.length > 1 && (
              <div className="bg-white border-b overflow-x-auto flex-shrink-0 rounded-t-xl mb-4">
                <div className="flex">
                  {groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedTab(group.id)}
                      className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all flex-shrink-0 ${
                        selectedTab === group.id
                          ? 'border-orange-600 text-orange-600 bg-orange-50'
                          : 'border-transparent text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{sportEmojis[group.deporte]}</span>
                      <span>{group.deporte}</span>
                      {group.unreadCount > 0 && (
                        <Badge className="bg-orange-600 text-white text-xs h-5 min-w-5 rounded-full">
                          {group.unreadCount}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedTab && currentGroup ? (
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col flex-1">
                <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xl">{sportEmojis[currentGroup.deporte]}</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold text-base">{currentGroup.deporte}</h2>
                    <p className="text-xs text-orange-100">Chat del grupo</p>
                  </div>
                  {!isBusinessHours() && (
                    <Badge className="bg-white/20 text-white text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Fuera de horario
                    </Badge>
                  )}
                </div>

                <div 
                  className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundColor: '#e5ddd5'
                  }}
                >
                  {currentGroup.messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-slate-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay mensajes</p>
                      </div>
                    </div>
                  ) : (
                    currentGroup.messages
                      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.tipo === "padre_a_grupo" ? 'justify-end' : 'justify-start'} mb-1 w-full px-1`}
                        >
                          <div
                            className={`max-w-[85%] lg:max-w-[75%] rounded-lg shadow-sm overflow-hidden ${
                              msg.tipo === "padre_a_grupo"
                                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-br-none'
                                : msg.tipo === "coordinador_a_familia"
                                ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-bl-none'
                                : 'bg-white text-slate-900 rounded-bl-none'
                            }`}
                          >
                            <div className="px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-semibold truncate ${
                                  msg.tipo === "padre_a_grupo" ? 'text-green-100' 
                                  : msg.tipo === "coordinador_a_familia" ? 'text-cyan-100'
                                  : 'text-orange-700'
                                }`}>
                                  {msg.tipo === "coordinador_a_familia" ? "🎓 " : ""}{msg.remitente_nombre}
                                </span>
                                {msg.prioridad !== "Normal" && (
                                  <span className="text-xs flex-shrink-0">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                                )}
                              </div>
                              <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">{msg.mensaje}</p>
                              
                              {msg.archivos_adjuntos?.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {msg.archivos_adjuntos.map((att, idx) => (
                                    <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs underline block">
                                      📎 {att.nombre}
                                    </a>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className={`text-[10px] ${
                                  msg.tipo === "padre_a_grupo" ? 'text-green-100' 
                                  : msg.tipo === "coordinador_a_familia" ? 'text-cyan-100'
                                  : 'text-slate-500'
                                }`}>
                                  {format(new Date(msg.created_date), "HH:mm")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="bg-white border-t p-3 flex-shrink-0">
                  {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {attachments.map((att, index) => (
                        <div key={index} className="bg-slate-100 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                          <span className="text-xs truncate max-w-[150px]">{att.nombre}</span>
                          <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))} className="text-slate-500 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 items-end">
                    <Input
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder={isBusinessHours() ? "Escribe un mensaje..." : "Horario: 10:00 - 20:00"}
                      className="flex-1 rounded-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={!isBusinessHours()}
                    />
                    
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageContent.trim() || sendMessageMutation.isPending || !isBusinessHours()}
                      className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 bg-white rounded-xl shadow-md">
                <div className="text-center text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecciona un chat</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}