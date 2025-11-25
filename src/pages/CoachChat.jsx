import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Clock, AlertCircle, X, Search, ArrowLeft, Users, MessageCircle, User, Archive, Filter, Inbox } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";
import FamilyListPanel from "../components/chat/FamilyListPanel";
import PrivateChatPanel from "../components/chat/PrivateChatPanel";

export default function CoachChat() {
  const [messageContent, setMessageContent] = useState("");
  const [selectedTab, setSelectedTab] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [priority, setPriority] = useState("Normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState("all");
  const [isMobile, setIsMobile] = useState(false);
  const [chatMode, setChatMode] = useState("grupos"); // "grupos" o "privados"
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [privateFilter, setPrivateFilter] = useState("activas"); // "activas", "no_leidas", "archivadas"
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
    refetchOnWindowFocus: false,
  });

  const { data: allPlayers = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: privateConversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['privateConversations'],
    queryFn: () => base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha'),
  });

  const { data: privateMessages = [], refetch: refetchPrivateMessages } = useQuery({
    queryKey: ['privateMessages', selectedConversation?.id],
    queryFn: () => selectedConversation 
      ? base44.entities.PrivateMessage.filter({ conversacion_id: selectedConversation.id }, '-created_date')
      : [],
    enabled: !!selectedConversation?.id,
  });

  const isAdmin = user?.role === "admin";
  const isCoordinator = user?.es_coordinador === true;
  const isCoach = user?.es_entrenador === true;

  // Categorías que este usuario puede ver
  const myCategories = useMemo(() => {
    if (!user) return [];
    if (isAdmin) {
      return [...new Set(allPlayers.map(p => p.deporte).filter(Boolean))];
    }
    return user.categorias_entrena || [];
  }, [user, allPlayers, isAdmin]);

  // Conversaciones privadas filtradas - SOLO las que tienen mensajes (activas)
  const filteredPrivateConversations = useMemo(() => {
    let convs = privateConversations.filter(conv => {
      // Filtrar por staff
      if (!isAdmin && conv.participante_staff_email !== user?.email) return false;
      // Filtrar por categoría si está seleccionada
      if (selectedCategory && conv.categoria !== selectedCategory) return false;
      return true;
    });
    
    // Aplicar filtro de estado
    if (privateFilter === "activas") {
      convs = convs.filter(c => !c.archivada);
    } else if (privateFilter === "no_leidas") {
      convs = convs.filter(c => !c.archivada && (c.no_leidos_staff || 0) > 0);
    } else if (privateFilter === "archivadas") {
      convs = convs.filter(c => c.archivada);
    }
    
    return convs;
  }, [privateConversations, selectedCategory, isAdmin, user, privateFilter]);

  // Contadores para badges
  const privateStats = useMemo(() => {
    const myConvs = privateConversations.filter(conv => 
      isAdmin || conv.participante_staff_email === user?.email
    );
    return {
      activas: myConvs.filter(c => !c.archivada).length,
      noLeidas: myConvs.filter(c => !c.archivada && (c.no_leidos_staff || 0) > 0).length,
      archivadas: myConvs.filter(c => c.archivada).length
    };
  }, [privateConversations, isAdmin, user]);

  // Mutation para archivar/desarchivar
  const archiveConversationMutation = useMutation({
    mutationFn: async ({ convId, archive }) => {
      await base44.entities.PrivateConversation.update(convId, { archivada: archive });
    },
    onSuccess: () => {
      refetchConversations();
      toast.success(selectedConversation?.archivada ? "Conversación restaurada" : "Conversación archivada");
      setSelectedConversation(null);
    }
  });

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
      await refetchMessages();
      setMessageContent("");
      setAttachments([]);
      setPriority("Normal");
      toast.success("Mensaje enviado al grupo");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      await Promise.all(messageIds.map(id => 
        base44.entities.ChatMessage.update(id, { leido: true })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatMessages'] }),
  });

  const createConversationMutation = useMutation({
    mutationFn: async (family) => {
      const jugadoresRelacionados = family.jugadores?.map(j => ({
        jugador_id: j.id || j.jugador_id,
        jugador_nombre: j.nombre || j.jugador_nombre
      })) || [];

      return base44.entities.PrivateConversation.create({
        participante_familia_email: family.email,
        participante_familia_nombre: family.nombre || family.email.split('@')[0],
        participante_staff_email: user.email,
        participante_staff_nombre: user.full_name,
        participante_staff_rol: isAdmin ? "admin" : isCoordinator ? "coordinador" : "entrenador",
        categoria: selectedCategory,
        jugadores_relacionados: jugadoresRelacionados,
        no_leidos_familia: 0,
        no_leidos_staff: 0
      });
    },
    onSuccess: (newConv) => {
      refetchConversations();
      setSelectedConversation(newConv);
    },
  });

  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    return deporte.trim().replace(/_undefined$/, '').replace(/_$/, '');
  };

  // Grupos de chat (anuncios grupales)
  const getGroups = () => {
    if (!user) return [];
    const groups = [];
    
    // Chat Interno Entrenadores (para coordinadores, entrenadores y admins)
    if (isAdmin || isCoordinator || isCoach) {
      const chatInternoMessages = messages.filter(msg => 
        normalizeDeporte(msg.grupo_id) === "Chat Interno Entrenadores"
      );
      const unreadCount = chatInternoMessages.filter(msg => 
        !msg.leido && msg.remitente_email !== user.email
      ).length;
      
      groups.push({
        id: "Chat Interno Entrenadores",
        deporte: "Chat Interno Entrenadores",
        tipo: 'interno',
        messages: chatInternoMessages,
        unreadCount,
        urgentCount: 0
      });
    }
    
    // Grupos por categoría
    myCategories.forEach(categoria => {
      const deporteNormalizado = normalizeDeporte(categoria);
      if (deporteNormalizado && deporteNormalizado !== "Chat Interno Entrenadores") {
        const groupMessages = messages.filter(msg => {
          const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
          return msgDeporte === deporteNormalizado && msg.tipo === "admin_a_grupo";
        });
        
        groups.push({
          id: deporteNormalizado,
          deporte: deporteNormalizado,
          tipo: 'grupo',
          messages: groupMessages,
          unreadCount: 0,
          urgentCount: 0
        });
      }
    });
    
    return groups;
  };

  const myGroups = useMemo(() => getGroups(), [messages, user, myCategories]);
  const currentGroup = useMemo(() => myGroups.find(g => g.id === selectedTab), [myGroups, selectedTab]);

  useEffect(() => {
    if (selectedTab && currentGroup) {
      const unreadIds = currentGroup.messages.filter(msg => 
        !msg.leido && msg.remitente_email !== user?.email
      ).map(msg => msg.id);
      
      if (unreadIds.length > 0) {
        markAsReadMutation.mutate(unreadIds);
      }
    }
  }, [selectedTab, currentGroup?.messages?.length]);

  const isBusinessHours = () => {
    const hour = new Date().getHours();
    return hour >= 10 && hour < 20;
  };

  const handleSendGroupMessage = () => {
    if (!user || !selectedTab) return;
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje");
      return;
    }

    const tipoMensaje = currentGroup?.tipo === 'interno' ? "interno_entrenadores" : "admin_a_grupo";
    
    sendMessageMutation.mutate({
      remitente_email: user.email,
      remitente_nombre: user.full_name || "Staff",
      mensaje: messageContent || "(Archivo adjunto)",
      prioridad: priority,
      tipo: tipoMensaje,
      deporte: selectedTab,
      categoria: "",
      grupo_id: selectedTab,
      leido: false,
      archivos_adjuntos: attachments,
    });
  };

  const handleStartNewConversation = (family) => {
    createConversationMutation.mutate(family);
  };

  const handlePrivateMessageSent = () => {
    refetchPrivateMessages();
    refetchConversations();
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
    "Baloncesto (Mixto)": "🏀",
    "Chat Interno Entrenadores": "💼"
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentGroup?.messages, privateMessages]);

  // Total mensajes privados sin leer
  const totalPrivateUnread = privateConversations.reduce((sum, c) => sum + (c.no_leidos_staff || 0), 0);

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
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header con tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {isAdmin ? "Chat del Club" : "Chat de Equipos"}
          </h1>
          <p className="text-slate-600 text-sm">
            {chatMode === "grupos" ? "Anuncios a grupos" : "Conversaciones privadas con familias"}
          </p>
        </div>
        
        <Tabs value={chatMode} onValueChange={setChatMode} className="w-full md:w-auto">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="grupos" className="flex-1 md:flex-none gap-2">
              <Users className="w-4 h-4" />
              Grupos
            </TabsTrigger>
            <TabsTrigger value="privados" className="flex-1 md:flex-none gap-2">
              <MessageCircle className="w-4 h-4" />
              Privados
              {totalPrivateUnread > 0 && (
                <Badge className="bg-red-500 text-white text-xs ml-1">{totalPrivateUnread}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {chatMode === "grupos" ? (
        /* MODO GRUPOS - Anuncios */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Lista de grupos */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-md border overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h3 className="font-bold">Grupos</h3>
              <p className="text-xs text-blue-100">{myGroups.length} disponibles</p>
            </div>
            <div className="divide-y max-h-[60vh] overflow-y-auto">
              {myGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedTab(group.id)}
                  className={`w-full p-3 flex items-center gap-3 transition-colors text-left ${
                    selectedTab === group.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    group.tipo === 'interno' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    <span className="text-lg">{sportEmojis[group.deporte] || "📢"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate text-sm">{group.deporte}</div>
                    <div className="text-xs text-slate-500">{group.messages.length} anuncios</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat del grupo */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-md border overflow-hidden flex flex-col" style={{ height: '70vh' }}>
            {currentGroup ? (
              <>
                <div className={`p-4 text-white flex items-center gap-3 flex-shrink-0 ${
                  currentGroup.tipo === 'interno' ? 'bg-gradient-to-r from-purple-600 to-purple-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'
                }`}>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xl">{sportEmojis[currentGroup.deporte] || "📢"}</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold">{currentGroup.deporte}</h2>
                    <p className="text-xs opacity-90">
                      {currentGroup.tipo === 'interno' ? 'Chat privado entre entrenadores' : 'Anuncios al grupo (todos ven)'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ backgroundColor: '#e5ddd5' }}>
                  {currentGroup.messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-slate-500 bg-white/80 rounded-xl p-6">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay anuncios</p>
                      </div>
                    </div>
                  ) : (
                    currentGroup.messages
                      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                      .map((msg) => (
                        <div key={msg.id} className="flex justify-end mb-1">
                          <div className={`max-w-[80%] rounded-lg shadow-sm overflow-hidden ${
                            currentGroup.tipo === 'interno' 
                              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' 
                              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                          } rounded-br-none`}>
                            <div className="px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold opacity-80">{msg.remitente_nombre}</span>
                                {msg.prioridad !== "Normal" && (
                                  <span className="text-xs">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                                )}
                              </div>
                              <p className="text-sm leading-relaxed">{msg.mensaje}</p>
                              {msg.archivos_adjuntos?.length > 0 && (
                                <div className="mt-2">
                                  <MessageAttachments attachments={msg.archivos_adjuntos} />
                                </div>
                              )}
                              <div className="text-right mt-1">
                                <span className="text-[10px] opacity-70">{format(new Date(msg.created_date), "HH:mm")}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="bg-white border-t p-3 flex-shrink-0">
                  {currentGroup.tipo !== 'interno' && (
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
                  )}
                  <div className="flex gap-2 items-end">
                    <FileAttachmentButton
                      onFileUploaded={(att) => setAttachments(prev => [...prev, att])}
                      disabled={sendMessageMutation.isPending}
                    />
                    <Input
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Escribe un anuncio para el grupo..."
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
                      disabled={(!messageContent.trim() && attachments.length === 0) || sendMessageMutation.isPending}
                      className={`rounded-full w-10 h-10 p-0 ${
                        currentGroup.tipo === 'interno' 
                          ? 'bg-purple-600 hover:bg-purple-700' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Selecciona un grupo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MODO PRIVADOS - Conversaciones 1 a 1 */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Filtros y lista de conversaciones */}
          <div className="lg:col-span-1 space-y-4">
            {/* Filtros rápidos */}
            <div className="bg-white rounded-xl shadow-md border overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-green-600 to-green-700 text-white">
                <h3 className="font-bold">Conversaciones</h3>
                <p className="text-xs text-green-100">{privateStats.activas} activas • {privateStats.noLeidas} sin leer</p>
              </div>
              <div className="p-2 border-b bg-slate-50">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={privateFilter === "no_leidas" ? "default" : "ghost"}
                    onClick={() => setPrivateFilter("no_leidas")}
                    className={`flex-1 text-xs ${privateFilter === "no_leidas" ? "bg-red-600 hover:bg-red-700" : ""}`}
                  >
                    <Inbox className="w-3 h-3 mr-1" />
                    Sin leer
                    {privateStats.noLeidas > 0 && (
                      <Badge className="ml-1 bg-white text-red-600 text-[10px] h-4 px-1">{privateStats.noLeidas}</Badge>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={privateFilter === "activas" ? "default" : "ghost"}
                    onClick={() => setPrivateFilter("activas")}
                    className={`flex-1 text-xs ${privateFilter === "activas" ? "bg-green-600 hover:bg-green-700" : ""}`}
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    Activas
                  </Button>
                  <Button
                    size="sm"
                    variant={privateFilter === "archivadas" ? "default" : "ghost"}
                    onClick={() => setPrivateFilter("archivadas")}
                    className={`flex-1 text-xs ${privateFilter === "archivadas" ? "bg-slate-600 hover:bg-slate-700" : ""}`}
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    Archivo
                  </Button>
                </div>
              </div>
              
              {/* Filtro por categoría opcional */}
              <div className="p-2 border-b">
                <Select value={selectedCategory || "todas"} onValueChange={(v) => setSelectedCategory(v === "todas" ? null : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">📋 Todas las categorías</SelectItem>
                    {myCategories.filter(c => c !== "Chat Interno Entrenadores").map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {sportEmojis[cat] || "📋"} {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de conversaciones */}
              <div className="divide-y max-h-[calc(70vh-220px)] overflow-y-auto">
                {filteredPrivateConversations.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">
                      {privateFilter === "no_leidas" ? "No hay mensajes sin leer" :
                       privateFilter === "archivadas" ? "No hay conversaciones archivadas" :
                       "No hay conversaciones activas"}
                    </p>
                    <p className="text-xs mt-1">Las familias aparecerán aquí cuando te escriban</p>
                  </div>
                ) : (
                  filteredPrivateConversations.map(conv => (
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
                        <div className="text-[10px] text-slate-500 truncate">
                          {sportEmojis[conv.categoria] || "📋"} {conv.categoria}
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
          </div>

          {/* Chat privado */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-md border overflow-hidden" style={{ height: '70vh' }}>
            {selectedConversation ? (
              <PrivateChatPanel
                conversation={selectedConversation}
                messages={privateMessages}
                user={user}
                isStaff={true}
                onClose={() => setSelectedConversation(null)}
                onMessageSent={handlePrivateMessageSent}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">Chats Privados</p>
                  <p className="text-sm mt-2">
                    {selectedCategory 
                      ? "Selecciona una familia para chatear" 
                      : "Selecciona una categoría primero"}
                  </p>
                  <p className="text-xs text-slate-400 mt-4 max-w-xs mx-auto">
                    Los mensajes privados solo los ve la familia seleccionada, no el resto del grupo
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}