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
  const [selectedRecipient, setSelectedRecipient] = useState("all");
  const [isMobile, setIsMobile] = useState(false);
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

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 30000,
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
      setSelectedRecipient("all");
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
    const isCoordinator = user.es_coordinador;
    
    // Si es coordinador, agregar chat de "Coordinación Deportiva" (familias -> coordinador)
    if (isCoordinator) {
      const chatCoordinacionMessages = messages.filter(msg => 
        normalizeDeporte(msg.grupo_id || msg.deporte) === "Coordinación Deportiva"
      );
      
      const unreadCount = chatCoordinacionMessages.filter(msg => 
        !msg.leido && msg.tipo === "padre_a_grupo"
      ).length;
      
      const urgentCount = chatCoordinacionMessages.filter(msg =>
        !msg.leido && msg.tipo === "padre_a_grupo" && msg.prioridad === "Urgente"
      ).length;
      
      groups.push({
        id: "Coordinación Deportiva",
        deporte: "Coordinación Deportiva",
        tipo: 'coordinacion',
        messages: chatCoordinacionMessages,
        unreadCount,
        urgentCount
      });
    }
    
    // Chat interno para todos los entrenadores y coordinadores
    if (isCoordinator || user.es_entrenador) {
      const chatInternoMessages = messages.filter(msg => 
        normalizeDeporte(msg.grupo_id || msg.deporte) === "Chat Interno Entrenadores"
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
      return;
    }
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje");
      return;
    }

    if (!isBusinessHours() && currentGroup?.tipo !== 'interno' && currentGroup?.tipo !== 'coordinacion') {
      toast.error("Solo entre 10:00 y 20:00");
      return;
    }
    
    const tipoMensaje = currentGroup?.tipo === 'entrenador' ? "admin_a_grupo" 
      : currentGroup?.tipo === 'interno' ? "interno_entrenadores"
      : currentGroup?.tipo === 'coordinacion' ? "coordinador_a_familia"
      : "padre_a_grupo";
    
    const messageData = {
      remitente_email: user.email,
      remitente_nombre: user.full_name || "Entrenador",
      mensaje: messageContent || "(Archivo adjunto)",
      prioridad: priority,
      tipo: tipoMensaje,
      deporte: selectedTab,
      categoria: "",
      grupo_id: selectedTab,
      leido: false,
      archivos_adjuntos: attachments,
      destinatario_email: selectedRecipient !== "all" ? selectedRecipient : undefined,
      destinatario_nombre: selectedRecipient !== "all" ? getInternalChatParticipants().find(p => p.email === selectedRecipient)?.name : undefined
    };

    console.log('📤 Enviando mensaje coordinación:', messageData);
    sendMessageMutation.mutate(messageData);
  };

  const handleFileUploaded = (attachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getInternalChatParticipants = () => {
    if (!user) return [];
    
    const trainers = allPlayers.reduce((acc, player) => {
      if (player.email_padre && (acc.find(t => t.email === player.email_padre)?.es_entrenador || allPlayers.find(p => p.email_padre === player.email_padre && (user.categorias_entrena || []).includes(p.deporte)))) {
        // Skip - logic handled below
      }
      return acc;
    }, []);

    const allTrainers = new Set();
    const result = [];

    // Add current user if coordinator/trainer
    if (user.es_coordinador || user.es_entrenador) {
      allTrainers.add(user.email);
    }

    // Collect all unique trainer/coordinator emails from User entity would be ideal
    // For now, we'll use a simpler approach based on messages in the internal chat
    messages.forEach(msg => {
      if (msg.grupo_id === "Chat Interno Entrenadores" && msg.remitente_email !== user.email) {
        if (!allTrainers.has(msg.remitente_email)) {
          allTrainers.add(msg.remitente_email);
          result.push({
            email: msg.remitente_email,
            name: msg.remitente_nombre
          });
        }
      }
    });

    return result;
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
    "Coordinación Deportiva": "🎓",
    "Chat Interno Entrenadores": "💼"
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
    <div className="fixed inset-0 flex bg-white overflow-x-hidden" style={{ top: isMobile ? '120px' : '0', left: isMobile ? '0' : '288px' }}>
      {/* Mobile chat list */}
      {isMobile && !selectedTab && (
        <div className="fixed inset-0 bg-white overflow-y-auto" style={{ top: '120px', left: 0 }}>
          <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <h2 className="text-xl font-bold">Chats</h2>
            <p className="text-sm text-blue-100">{filteredGroups.length} grupos disponibles</p>
          </div>
          <div className="divide-y">
            {filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedTab(group.id)}
                className="w-full p-4 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors text-left"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                  group.tipo === 'coordinacion' ? 'bg-cyan-100' : group.tipo === 'interno' ? 'bg-purple-100' : group.tipo === 'entrenador' ? 'bg-blue-100' : 'bg-orange-100'
                }`}>
                  <span className="text-2xl">
                    {group.tipo === 'coordinacion' ? '🎓' : group.tipo === 'interno' ? '💼' : group.tipo === 'entrenador' ? '🎓' : sportEmojis[group.deporte]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">{group.deporte}</div>
                  <div className="text-sm text-slate-600 truncate">
                    {group.tipo === 'coordinacion' ? 'Consultas familias' : group.tipo === 'interno' ? 'Chat privado' : `${group.messages.length} mensajes`}
                  </div>
                </div>
                {group.unreadCount > 0 && (
                  <Badge className={`${
                    group.urgentCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-blue-600'
                  } text-white text-sm h-7 min-w-7 rounded-full flex items-center justify-center shadow-lg`}>
                    {group.unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">

        {currentGroup && (
          <>
            <div className={`p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0 min-h-[72px] ${
              currentGroup.tipo === 'coordinacion'
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-700'
                : currentGroup.tipo === 'interno'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700'
                : currentGroup.tipo === 'entrenador'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                : 'bg-gradient-to-r from-orange-600 to-orange-700'
            }`}>
            {isMobile && (
              <button
                onClick={() => setSelectedTab(null)}
                className="mr-2 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xl">{currentGroup.tipo === 'coordinacion' ? '🎓' : currentGroup.tipo === 'interno' ? '💼' : currentGroup.tipo === 'entrenador' ? '🎓' : sportEmojis[currentGroup.deporte]}</span>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-base">{currentGroup.deporte}</h2>
              <p className="text-xs opacity-90">
                {currentGroup.tipo === 'coordinacion' ? '🎓 Consultas de familias al coordinador'
                  : currentGroup.tipo === 'interno' ? '💼 Chat privado entre entrenadores' 
                  : currentGroup.tipo === 'entrenador' ? '🎓 Entrenas este equipo' 
                  : '👨‍👩‍👧 Chat de tus hijos'}
              </p>
            </div>
            {!isBusinessHours() && currentGroup.tipo !== 'interno' && currentGroup.tipo !== 'coordinacion' && (
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
                .map((msg) => {
                  const esGrupoCoordinacion = currentGroup.tipo === 'coordinacion';
                  const esGrupoInterno = currentGroup.tipo === 'interno';
                  const esGrupoEntrenador = currentGroup.tipo === 'entrenador';
                  
                  let messageColor;
                  let isMyMessage;
                  
                  if (esGrupoCoordinacion) {
                    // En chat de coordinación: padres escriben, coordinador responde
                    if (msg.tipo === "coordinador_a_familia") {
                      messageColor = 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-br-none';
                      isMyMessage = true;
                    } else {
                      messageColor = 'bg-white text-slate-900 rounded-bl-none';
                      isMyMessage = false;
                    }
                  } else if (esGrupoInterno) {
                    // En chat interno, todos los mensajes son de entrenadores
                    isMyMessage = msg.remitente_email === user?.email;
                    messageColor = isMyMessage 
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-br-none'
                      : 'bg-white text-slate-900 rounded-bl-none';
                  } else if (esGrupoEntrenador && msg.tipo === "admin_a_grupo") {
                    messageColor = 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-none';
                    isMyMessage = true;
                  } else if (!esGrupoEntrenador && msg.tipo === "padre_a_grupo") {
                    messageColor = 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-br-none';
                    isMyMessage = true;
                  } else if (msg.tipo === "admin_a_grupo") {
                    messageColor = 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-bl-none';
                    isMyMessage = false;
                  } else {
                    messageColor = 'bg-white text-slate-900 rounded-bl-none';
                    isMyMessage = false;
                  }
                  
                  return (
                    <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-1 w-full px-1`}>
                      <div className={`max-w-[85%] lg:max-w-[75%] rounded-lg shadow-sm ${messageColor} overflow-hidden`}>
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold truncate ${
                              messageColor.includes('blue') ? 'text-blue-100' 
                              : messageColor.includes('purple') ? 'text-purple-100'
                              : messageColor.includes('green') ? 'text-green-100' 
                              : 'text-orange-700'
                            }`}>
                              {isMyMessage && esGrupoEntrenador ? '🎓 ' 
                                : isMyMessage && !esGrupoEntrenador ? '👨‍👩‍👧 '
                                : msg.tipo === "admin_a_grupo" ? '📢 ' 
                                : '👨‍👩‍👧 '}{msg.remitente_nombre}
                            </span>
                            {msg.prioridad !== "Normal" && (
                              <span className="text-xs flex-shrink-0">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">{msg.mensaje}</p>
                          
                          {msg.archivos_adjuntos?.length > 0 && (
                            <div className="mt-2">
                              <MessageAttachments attachments={msg.archivos_adjuntos} />
                            </div>
                          )}
                          
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className={`text-[10px] ${
                              messageColor.includes('blue') ? 'text-blue-100'
                              : messageColor.includes('purple') ? 'text-purple-100'
                              : messageColor.includes('green') ? 'text-green-100' 
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

            <div className="grid grid-cols-2 gap-2 mb-2">
              {currentGroup.tipo === 'entrenador' && (
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
              )}
              
              {currentGroup.tipo === 'interno' && (
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger className={`h-9 text-sm ${currentGroup.tipo === 'entrenador' ? '' : 'col-span-2'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">👥 Todos los entrenadores</SelectItem>
                    {getInternalChatParticipants().map(trainer => (
                      <SelectItem key={trainer.email} value={trainer.email}>
                        👤 {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2 items-end">
              <FileAttachmentButton
                onFileUploaded={handleFileUploaded}
                disabled={(!isBusinessHours() && currentGroup?.tipo !== 'interno' && currentGroup?.tipo !== 'coordinacion') || sendMessageMutation.isPending}
              />
              
              <Input
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder={isBusinessHours() || currentGroup?.tipo === 'interno' ? "Escribe un mensaje..." : "Horario: 10:00 - 20:00"}
                className="flex-1 rounded-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!isBusinessHours() && currentGroup?.tipo !== 'interno' && currentGroup?.tipo !== 'coordinacion'}
              />
              
              <Button
                onClick={handleSendMessage}
                disabled={(!messageContent.trim() && attachments.length === 0) || sendMessageMutation.isPending || (!isBusinessHours() && currentGroup?.tipo !== 'interno' && currentGroup?.tipo !== 'coordinacion')}
                className={`rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg ${
                  currentGroup.tipo === 'coordinacion'
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800'
                    : currentGroup.tipo === 'interno'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                    : currentGroup.tipo === 'entrenador'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                }`}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Sidebar with chat list - Desktop only */}
      {!isMobile && (
        <div className="hidden lg:flex w-80 border-l bg-slate-50 flex-col overflow-hidden">
          <div className="p-4 bg-white border-b">
            <h3 className="font-bold text-slate-900">Chats</h3>
            <p className="text-xs text-slate-600 mt-1">{filteredGroups.length} grupos disponibles</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedTab(group.id)}
                className={`w-full p-4 flex items-center gap-3 border-b transition-all text-left ${
                  selectedTab === group.id
                    ? 'bg-blue-100 border-l-4 border-l-blue-600'
                    : 'bg-white hover:bg-slate-100 border-l-4 border-l-transparent'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedTab === group.id ? 'bg-blue-600' : 'bg-slate-200'
                }`}>
                  <span className="text-xl">
                    {group.tipo === 'coordinacion' ? '🎓' : group.tipo === 'interno' ? '💼' : group.tipo === 'entrenador' ? '🎓' : sportEmojis[group.deporte]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{group.deporte}</div>
                  <div className="text-xs text-slate-600 truncate">
                    {group.messages.length} mensajes
                  </div>
                </div>
                {group.unreadCount > 0 && (
                  <Badge className={`${
                    group.urgentCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-blue-600'
                  } text-white text-xs h-6 min-w-6 rounded-full flex items-center justify-center`}>
                    {group.unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}