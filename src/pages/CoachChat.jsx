import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Clock, AlertCircle, X, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";

export default function CoachChat() {
  const [messageContent, setMessageContent] = useState("");
  const [selectedTab, setSelectedTab] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [priority, setPriority] = useState("Normal");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 2000,
  });

  const { data: allPlayers, isLoading: loadingPlayers } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const newMessage = await base44.entities.ChatMessage.create(messageData);
      
      const imageAttachments = messageData.archivos_adjuntos.filter(att => att.tipo === "imagen");
      if (imageAttachments.length > 0) {
        const albumData = {
          titulo: `Chat - ${messageData.deporte} (${format(new Date(), "d MMM yyyy", { locale: es })})`,
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

      if ((messageData.prioridad === "Importante" || messageData.prioridad === "Urgente") && messageData.tipo === "admin_a_grupo") {
        const groupPlayers = allPlayers.filter(p => p.deporte === messageData.deporte);
        const parentEmails = [...new Set(groupPlayers.map(p => p.email_padre).filter(Boolean))];
        const priorityEmoji = messageData.prioridad === "Urgente" ? "🔴" : "⚠️";
        
        const emailPromises = parentEmails.map(email => 
          base44.integrations.Core.SendEmail({
            to: email,
            subject: `${priorityEmoji} [${messageData.prioridad.toUpperCase()}] CD Bustarviejo - ${messageData.deporte}`,
            body: `Nuevo mensaje ${messageData.prioridad.toLowerCase()} del entrenador.\n\n${messageData.mensaje}\n\nAccede a la app para ver más detalles.`
          }).catch(err => console.error("Error sending email:", err))
        );
        
        await Promise.all(emailPromises);
      }
      
      return newMessage;
    },
    onSuccess: async () => {
      await refetchMessages();
      setMessageContent("");
      setAttachments([]);
      setPriority("Normal");
      toast.success("Mensaje enviado");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      const updatePromises = messageIds.map(id => 
        base44.entities.ChatMessage.update(id, { leido: true })
      );
      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    let normalized = deporte.trim();
    normalized = normalized.replace(/_undefined$/, '');
    normalized = normalized.replace(/_$/, '');
    return normalized;
  };

  const getCoachGroups = () => {
    if (!user) return [];
    
    const groups = [];
    const categoriesCoached = user.categorias_entrena || [];
    
    categoriesCoached.forEach(categoria => {
      const deporteNormalizado = normalizeDeporte(categoria);
      if (deporteNormalizado) {
        const groupMessages = messages.filter(msg => {
          const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
          return msgDeporte === deporteNormalizado;
        });
        
        const unreadCount = groupMessages.filter(msg => 
          !msg.leido && msg.tipo === "padre_a_grupo"
        ).length;
        
        const urgentCount = groupMessages.filter(msg =>
          !msg.leido && msg.tipo === "padre_a_grupo" && msg.prioridad === "Urgente"
        ).length;
        
        groups.push({
          id: deporteNormalizado,
          deporte: deporteNormalizado,
          tipo: 'entrenador',
          messages: groupMessages,
          unreadCount,
          urgentCount
        });
      }
    });
    
    const myKids = allPlayers.filter(p => 
      p.email_padre === user.email || p.email_tutor_2 === user.email
    );
    
    myKids.forEach(kid => {
      const deporteNormalizado = normalizeDeporte(kid.deporte);
      if (deporteNormalizado && !groups.find(g => g.id === deporteNormalizado)) {
        const groupMessages = messages.filter(msg => {
          const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
          return msgDeporte === deporteNormalizado;
        });
        
        const unreadCount = groupMessages.filter(msg => 
          !msg.leido && msg.tipo === "admin_a_grupo"
        ).length;
        
        const urgentCount = groupMessages.filter(msg =>
          !msg.leido && msg.tipo === "admin_a_grupo" && msg.prioridad === "Urgente"
        ).length;
        
        groups.push({
          id: deporteNormalizado,
          deporte: deporteNormalizado,
          tipo: 'hijo',
          messages: groupMessages,
          unreadCount,
          urgentCount
        });
      }
    });
    
    return groups;
  };

  const myGroups = useMemo(() => {
    return getCoachGroups();
  }, [messages, allPlayers, user]);

  const filteredGroups = useMemo(() => {
    return myGroups.filter(group =>
      group.deporte.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [myGroups, searchTerm]);

  const currentGroup = useMemo(() => {
    return myGroups.find(g => g.id === selectedTab);
  }, [myGroups, selectedTab]);

  useEffect(() => {
    if (filteredGroups.length > 0 && !selectedTab) {
      setSelectedTab(filteredGroups[0].id);
    }
  }, [filteredGroups.length, selectedTab]);

  useEffect(() => {
    if (selectedTab && currentGroup) {
      const unreadMessageIds = currentGroup.messages
        .filter(msg => {
          if (currentGroup.tipo === 'entrenador') {
            return !msg.leido && msg.tipo === "padre_a_grupo";
          } else {
            return !msg.leido && msg.tipo === "admin_a_grupo";
          }
        })
        .map(msg => msg.id);
      
      if (unreadMessageIds.length > 0) {
        markAsReadMutation.mutate(unreadMessageIds);
      }
    }
  }, [selectedTab, currentGroup?.messages?.length]);

  const isBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 20;
  };

  const handleSendMessage = () => {
    if (!user || !selectedTab) {
      alert("ERROR: No hay usuario o tab seleccionado");
      return;
    }
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje");
      return;
    }

    if (!isBusinessHours()) {
      toast.error("Solo entre 10:00 y 20:00");
      return;
    }
    
    // ALERT SIEMPRE VISIBLE
    const tipoGrupo = currentGroup?.tipo || "UNDEFINED";
    const tipoMensaje = tipoGrupo === 'entrenador' ? "admin_a_grupo (AZUL)" : "padre_a_grupo (MORADO)";
    alert(`🔍 DEBUG:\n\nTipo de grupo: ${tipoGrupo}\nTipo de mensaje: ${tipoMensaje}\n\nSi eres entrenador debería ser AZUL, si es hijo MORADO`);
    
    const messageData = {
      remitente_email: user.email,
      remitente_nombre: user.full_name || "Entrenador",
      mensaje: messageContent || "(Archivo adjunto)",
      prioridad: priority,
      tipo: currentGroup?.tipo === 'entrenador' ? "admin_a_grupo" : "padre_a_grupo",
      deporte: selectedTab,
      categoria: "",
      grupo_id: selectedTab,
      leido: false,
      archivos_adjuntos: attachments
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleFileUploaded = (attachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentGroup?.messages]);

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

  if (myGroups.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No hay grupos disponibles</p>
          <p className="text-sm text-slate-400 mt-2">Contacta con el administrador para asignar categorías</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-white">
      <div className={`w-full md:w-96 bg-white border-r border-slate-200 flex flex-col ${selectedTab ? 'hidden md:flex' : 'flex'}`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
          <h1 className="text-xl font-bold mb-1">🎓 Chats Entrenador</h1>
          <p className="text-xs text-blue-100">Tus equipos y grupos familiares</p>
        </div>

        <div className="p-3 bg-slate-50 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredGroups.map(group => {
            const lastMsg = group.messages.sort((a, b) => 
              new Date(b.created_date) - new Date(a.created_date)
            )[0];
            
            return (
              <div
                key={group.id}
                onClick={() => setSelectedTab(group.id)}
                className={`p-4 border-b cursor-pointer transition-all ${
                  selectedTab === group.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex gap-3">
                  <div className={`w-12 h-12 rounded-full ${
                    group.tipo === 'entrenador' 
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                      : 'bg-gradient-to-br from-orange-600 to-orange-700'
                  } flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <span className="text-2xl">{group.tipo === 'entrenador' ? '🎓' : sportEmojis[group.deporte]}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {group.deporte}
                      </h3>
                      {lastMsg && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(lastMsg.created_date), "HH:mm")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {group.tipo === 'entrenador' ? '🎓 Mis equipos' : '👨‍👩‍👧 Mis hijos'}
                        </Badge>
                        <p className="text-xs text-slate-500 truncate">
                          {lastMsg ? lastMsg.mensaje.substring(0, 20) + '...' : 'Sin mensajes'}
                        </p>
                      </div>
                      {group.unreadCount > 0 && (
                        <Badge className="bg-blue-600 text-white text-xs h-5 min-w-5 rounded-full">
                          {group.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${!selectedTab ? 'hidden md:flex' : 'flex'} min-h-0`}>
        {currentGroup ? (
          <>
            <div className={`p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0 ${
              currentGroup.tipo === 'entrenador'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                : 'bg-gradient-to-r from-orange-600 to-orange-700'
            }`}>
              <button onClick={() => setSelectedTab(null)} className="md:hidden p-2 hover:bg-white/20 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xl">{currentGroup.tipo === 'entrenador' ? '🎓' : sportEmojis[currentGroup.deporte]}</span>
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-base">{currentGroup.deporte}</h2>
                <p className="text-xs opacity-90">
                  {currentGroup.tipo === 'entrenador' ? '🎓 Entrenas este equipo' : '👨‍👩‍👧 Chat de tus hijos'}
                </p>
              </div>
              {!isBusinessHours() && (
                <Badge className="bg-white/20 text-white text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Fuera de horario
                </Badge>
              )}
            </div>

            <div 
              className="flex-1 overflow-y-auto p-4 space-y-2"
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
                  .map((msg) => {
                    const isMyMessage = msg.remitente_email === user?.email;
                    const isOtherAdmin = msg.tipo === "admin_a_grupo" && msg.remitente_email !== user?.email;
                    
                    return (
                      <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-1`}>
                        <div className={`max-w-[75%] rounded-lg shadow-sm ${
                          isMyMessage && currentGroup.tipo === 'entrenador'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-none'
                            : isMyMessage && currentGroup.tipo === 'hijo'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-br-none'
                            : isOtherAdmin
                            ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-bl-none'
                            : 'bg-white text-slate-900 rounded-bl-none'
                        }`}>
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold ${
                                isMyMessage && currentGroup.tipo === 'entrenador' ? 'text-blue-100' 
                                : isMyMessage && currentGroup.tipo === 'hijo' ? 'text-purple-100'
                                : isOtherAdmin ? 'text-green-100' 
                                : 'text-orange-700'
                              }`}>
                                {isMyMessage && currentGroup.tipo === 'entrenador' ? '🎓 ' 
                                  : isMyMessage && currentGroup.tipo === 'hijo' ? '👨‍👩‍👧 '
                                  : isOtherAdmin ? '📢 ' 
                                  : '👨‍👩‍👧 '}{msg.remitente_nombre}
                              </span>
                              {msg.prioridad !== "Normal" && (
                                <span className="text-xs">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed break-words">{msg.mensaje}</p>
                            
                            {msg.archivos_adjuntos?.length > 0 && (
                              <div className="mt-2">
                                <MessageAttachments attachments={msg.archivos_adjuntos} />
                              </div>
                            )}
                            
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className={`text-[10px] ${
                                isMyMessage && currentGroup.tipo === 'entrenador' ? 'text-blue-100'
                                : isMyMessage && currentGroup.tipo === 'hijo' ? 'text-purple-100'
                                : isOtherAdmin ? 'text-green-100' 
                                : 'text-slate-500'
                              }`}>
                                {format(new Date(msg.created_date), "HH:mm")}
                              </span>
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
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((att, index) => (
                    <div key={index} className="bg-slate-100 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                      <span className="text-xs truncate max-w-[150px]">{att.nombre}</span>
                      <button onClick={() => handleRemoveAttachment(index)} className="text-slate-500 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {currentGroup.tipo === 'entrenador' && (
                <div className="mb-2">
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-full h-9 text-sm">
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
                  onFileUploaded={handleFileUploaded}
                  disabled={!isBusinessHours() || sendMessageMutation.isPending}
                />
                
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
                  disabled={(!messageContent.trim() && attachments.length === 0) || sendMessageMutation.isPending || !isBusinessHours()}
                  className={`rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg flex-shrink-0 ${
                    currentGroup.tipo === 'entrenador'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                      : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {currentGroup.tipo === 'hijo' && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  👨‍👩‍👧 Escribiendo como padre en el chat de tus hijos
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#e5ddd5]">
            <div className="text-center text-slate-500">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-1">Selecciona un grupo</p>
              <p className="text-sm opacity-70">Chats de tus equipos y grupos familiares</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}