import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Search, Clock, AlertCircle, X, Users, Check, CheckCheck, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";
import QuickPollDialog from "../components/chat/QuickPollDialog";
import PollMessage from "../components/chat/PollMessage";

export default function AdminChat() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState("all"); // "all" o email específico
  const [isMobile, setIsMobile] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
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
    refetchInterval: 2000,
  });

  const { data: players } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
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
        await base44.entities.ChatMessage.update(messageId, {
          ...message,
          poll: updatedPoll
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      if (messageData.sendToAll) {
        const allGroups = Object.keys(groups);
        const promises = allGroups.map(grupoId => {
          return base44.entities.ChatMessage.create({
            ...messageData,
            deporte: grupoId,
            grupo_id: grupoId,
            sendToAll: undefined
          });
        });
        
        const newMessages = await Promise.all(promises);
        
        if (messageData.prioridad === "Importante" || messageData.prioridad === "Urgente") {
          const allParentEmails = [...new Set(players.map(p => p.email_padre).filter(Boolean))];
          const priorityEmoji = messageData.prioridad === "Urgente" ? "🔴" : "⚠️";
          
          const emailPromises = allParentEmails.map(email => 
            base44.integrations.Core.SendEmail({
              to: email,
              subject: `${priorityEmoji} [${messageData.prioridad.toUpperCase()}] CD Bustarviejo - Anuncio General`,
              body: `Anuncio ${messageData.prioridad.toLowerCase()} del club para todos los grupos.\n\n${messageData.mensaje}\n\nAccede a la app para ver más detalles.`
            }).catch(err => console.error("Error sending email:", err))
          );
          
          await Promise.all(emailPromises);
        }
        
        return newMessages;
      } else {
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
              descripcion: img.nombre || messageData.mensaje || "",
              jugadores_etiquetados: []
            })),
            visible_para_padres: true,
            destacado: false
          };
          
          await base44.entities.PhotoGallery.create(albumData);
        }
        
        if (messageData.prioridad === "Importante" || messageData.prioridad === "Urgente") {
          const groupPlayers = players.filter(p => p.deporte === messageData.deporte);
          const parentEmails = [...new Set(groupPlayers.map(p => p.email_padre).filter(Boolean))];
          const priorityEmoji = messageData.prioridad === "Urgente" ? "🔴" : "⚠️";
          
          const emailPromises = parentEmails.map(email => 
            base44.integrations.Core.SendEmail({
              to: email,
              subject: `${priorityEmoji} [${messageData.prioridad.toUpperCase()}] CD Bustarviejo - ${messageData.deporte}`,
              body: `Nuevo mensaje ${messageData.prioridad.toLowerCase()} del club.\n\n${messageData.mensaje}\n\nAccede a la app para ver más detalles.`
            }).catch(err => console.error("Error sending email:", err))
          );
          
          await Promise.all(emailPromises);
        }
        
        return newMessage;
      }
    },
    onSuccess: async () => {
      await refetchMessages();
      setMessageContent("");
      setAttachments([]);
      setPriority("Normal");
      setSendToAll(false);
      setSelectedRecipient("all");
      toast.success(sendToAll ? "Anuncio enviado a todos los grupos" : "Mensaje enviado");
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

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) => base44.entities.ChatMessage.delete(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      toast.success("Mensaje eliminado");
    },
  });

  const isBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 20;
  };

  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    let normalized = deporte.trim();
    normalized = normalized.replace(/_undefined$/, '');
    normalized = normalized.replace(/_$/, '');
    return normalized;
  };

  const groups = useMemo(() => {
    const groupsMap = {};
    
    players.forEach(player => {
      const deporteNormalizado = normalizeDeporte(player.deporte);
      if (!deporteNormalizado) return;
      
      if (!groupsMap[deporteNormalizado]) {
        groupsMap[deporteNormalizado] = {
          id: deporteNormalizado,
          deporte: deporteNormalizado,
          players: [],
          messages: [],
          unreadCount: 0,
          urgentCount: 0,
          lastMessageDate: null
        };
      }
      groupsMap[deporteNormalizado].players.push(player);
    });

    messages.forEach(msg => {
      let deporteRaw = msg.grupo_id || msg.deporte;
      const deporteNormalizado = normalizeDeporte(deporteRaw);
      
      if (!deporteNormalizado) return;
      
      // Filtrar grupo de Coordinación Deportiva (es solo para padres)
      if (deporteNormalizado === "Coordinación Deportiva") return;
      
      if (!groupsMap[deporteNormalizado]) {
        groupsMap[deporteNormalizado] = {
          id: deporteNormalizado,
          deporte: deporteNormalizado,
          players: [],
          messages: [],
          unreadCount: 0,
          urgentCount: 0,
          lastMessageDate: null
        };
      }
      
      if (!groupsMap[deporteNormalizado].messages.find(m => m.id === msg.id)) {
        groupsMap[deporteNormalizado].messages.push(msg);
        
        if (!msg.leido && msg.tipo === "padre_a_grupo") {
          groupsMap[deporteNormalizado].unreadCount++;
          if (msg.prioridad === "Urgente") {
            groupsMap[deporteNormalizado].urgentCount++;
          }
        }
        
        const msgDate = new Date(msg.created_date);
        if (!groupsMap[deporteNormalizado].lastMessageDate || msgDate > groupsMap[deporteNormalizado].lastMessageDate) {
          groupsMap[deporteNormalizado].lastMessageDate = msgDate;
        }
      }
    });

    return groupsMap;
  }, [messages, players]);

  const sortedGroups = useMemo(() => {
    return Object.values(groups).sort((a, b) => {
      if (!a.lastMessageDate && !b.lastMessageDate) return 0;
      if (!a.lastMessageDate) return 1;
      if (!b.lastMessageDate) return -1;
      return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
    });
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return sortedGroups.filter(group =>
      (group.deporte || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedGroups, searchTerm]);

  const allGroupsList = useMemo(() => {
    return [
      { id: 'todos', deporte: '📢 Todos los Grupos', isSendToAll: true },
      ...sortedGroups
    ];
  }, [sortedGroups]);

  const currentGroup = useMemo(() => {
    if (sendToAll) return null;
    return selectedGroup ? groups[selectedGroup] : null;
  }, [selectedGroup, sendToAll, groups]);

  const handleSendPoll = async (pollData) => {
    if (!user) return;

    const uniqueParents = new Map();
    
    if (sendToAll) {
      players.forEach(p => {
        if (p.email_padre) uniqueParents.set(p.email_padre, { email: p.email_padre, deporte: p.deporte, playerName: p.nombre });
        if (p.email_tutor_2) uniqueParents.set(p.email_tutor_2, { email: p.email_tutor_2, deporte: p.deporte, playerName: p.nombre });
      });
    } else {
      const groupPlayers = players.filter(p => p.deporte === selectedGroup);
      groupPlayers.forEach(p => {
        if (p.email_padre) uniqueParents.set(p.email_padre, { email: p.email_padre, deporte: p.deporte, playerName: p.nombre });
        if (p.email_tutor_2) uniqueParents.set(p.email_tutor_2, { email: p.email_tutor_2, deporte: p.deporte, playerName: p.nombre });
      });
    }

    for (const parent of uniqueParents.values()) {
      await base44.entities.ChatMessage.create({
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        destinatario_email: parent.email,
        destinatario_nombre: `Padre de ${parent.playerName}`,
        mensaje: `📊 ${pollData.question}`,
        prioridad: priority,
        tipo: "admin_a_grupo",
        deporte: parent.deporte,
        grupo_id: parent.deporte,
        leido: false,
        poll: {
          question: pollData.question,
          options: pollData.options,
          votes: []
        }
      });
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    toast.success("📊 Encuesta enviada");
    queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
  };

  const handleSendMessage = () => {
    if (!user) return;
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje");
      return;
    }

    if (!sendToAll && !selectedGroup) {
      toast.error("Selecciona un grupo");
      return;
    }

    const messageData = {
      remitente_email: user.email,
      remitente_nombre: user.full_name || "Administrador",
      mensaje: messageContent.trim() || "(Archivo adjunto)",
      prioridad: priority,
      tipo: "admin_a_grupo",
      deporte: sendToAll ? "Todos" : selectedGroup,
      categoria: "",
      grupo_id: sendToAll ? "todos" : selectedGroup,
      leido: false,
      archivos_adjuntos: attachments,
      sendToAll: sendToAll,
      destinatario_email: selectedRecipient !== "all" ? selectedRecipient : undefined,
      destinatario_nombre: selectedRecipient !== "all" ? getParentName(selectedRecipient) : undefined
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleSelectGroup = (groupId, isSendAll = false) => {
    if (isSendAll) {
      setSendToAll(true);
      setSelectedGroup(null);
    } else {
      setSelectedGroup(groupId);
      setSendToAll(false);
      const group = groups[groupId];
      if (group) {
        const unreadMessageIds = group.messages
          .filter(msg => !msg.leido && msg.tipo === "padre_a_grupo")
          .map(msg => msg.id);
        
        if (unreadMessageIds.length > 0) {
          markAsReadMutation.mutate(unreadMessageIds);
        }
      }
    }
  };

  const handleFileUploaded = (attachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getGroupParents = () => {
    if (!selectedGroup || sendToAll) return [];
    const groupPlayers = players.filter(p => p.deporte === selectedGroup);
    const parentsMap = new Map();
    
    groupPlayers.forEach(p => {
      if (p.email_padre) {
        if (!parentsMap.has(p.email_padre)) {
          parentsMap.set(p.email_padre, { role: 'Padre', kids: [] });
        }
        parentsMap.get(p.email_padre).kids.push(p.nombre);
      }
      if (p.email_tutor_2) {
        if (!parentsMap.has(p.email_tutor_2)) {
          parentsMap.set(p.email_tutor_2, { role: 'Tutor 2', kids: [] });
        }
        parentsMap.get(p.email_tutor_2).kids.push(p.nombre);
      }
    });
    
    return Array.from(parentsMap.entries()).map(([email, data]) => ({
      email,
      name: `${data.role} de ${data.kids.join(', ')}`
    }));
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
  }, [currentGroup?.messages, sendToAll]);

  const getReadStatus = (msg) => {
    if (msg.tipo !== "admin_a_grupo") return null;
    return msg.leido ? "read" : "sent";
  };

  return (
    <>
      <QuickPollDialog
        isOpen={showPollDialog}
        onClose={() => setShowPollDialog(false)}
        onSend={handleSendPoll}
        groupName={currentGroup?.name || selectedGroup}
      />
      
      <div className="fixed inset-0 flex bg-white" style={{ top: isMobile ? '120px' : '0', left: isMobile ? '0' : '288px' }}>
      {/* Mobile chat list */}
      {isMobile && !selectedGroup && !sendToAll && (
        <div className="fixed inset-0 bg-white overflow-y-auto" style={{ top: '120px', left: 0 }}>
          <div className="p-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white">
            <h2 className="text-xl font-bold">Chats</h2>
            <p className="text-sm text-orange-100">{allGroupsList.length} grupos disponibles</p>
          </div>
          <div className="divide-y">
            {allGroupsList.map(group => {
              const displayGroup = group.isSendToAll ? { ...group, unreadCount: 0, urgentCount: 0 } : groups[group.id] || group;
              return (
                <button
                  key={group.id}
                  onClick={() => handleSelectGroup(group.id, group.isSendToAll)}
                  className="w-full p-4 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                    group.isSendToAll ? 'bg-green-100' : 'bg-orange-100'
                  }`}>
                    <span className="text-2xl">{group.isSendToAll ? '📢' : sportEmojis[group.deporte] || '⚽'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate">{group.isSendToAll ? '📢 Todos los Grupos' : group.deporte}</div>
                    <div className="text-sm text-slate-600 truncate">
                      {group.isSendToAll ? 'Anuncio general' : `${displayGroup.messages?.length || 0} mensajes`}
                    </div>
                  </div>
                  {displayGroup.unreadCount > 0 && (
                    <Badge className={`${
                      displayGroup.urgentCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-orange-600'
                    } text-white text-sm h-7 min-w-7 rounded-full flex items-center justify-center shadow-lg`}>
                      {displayGroup.unreadCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col" style={{ marginTop: isMobile ? '56px' : '0' }}>
        {(selectedGroup || sendToAll) && (
          <>
            <div className={`p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0 min-h-[72px] ${
              sendToAll ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-orange-600 to-orange-700'
            }`}>
            {isMobile && (
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setSendToAll(false);
                }}
                className="mr-2 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              {sendToAll ? <Users className="w-6 h-6" /> : <span className="text-xl">{sportEmojis[currentGroup?.deporte]}</span>}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-base">
                {sendToAll ? '📢 Anuncio a Todos los Grupos' : currentGroup?.deporte}
              </h2>
              <p className="text-xs opacity-90">
                {sendToAll ? `${Object.keys(groups).length} grupos • ${players.length} jugadores` : `${currentGroup?.players.length || 0} jugadores`}
              </p>
            </div>

          </div>

          {sendToAll && (
            <div className="p-4 flex-shrink-0">
              <Alert className="bg-blue-50 border-blue-300">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  Tu mensaje se enviará a todos los grupos del club.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div 
            className="flex-1 overflow-y-auto p-4 space-y-2"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: '#e5ddd5'
            }}
          >
            {sendToAll ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Escribe tu anuncio abajo</p>
                </div>
              </div>
            ) : currentGroup?.messages.length === 0 ? (
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
                  const readStatus = getReadStatus(msg);
                  const isJugador = msg.tipo === "jugador_a_equipo";
                  const isPadre = msg.tipo === "padre_a_grupo";
                  const isAdmin = msg.tipo === "admin_a_grupo";
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-1 group`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg shadow-sm relative ${
                          isAdmin
                            ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-br-none'
                            : isJugador
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-bl-none'
                            : 'bg-white text-slate-900 rounded-bl-none'
                        }`}
                      >
                        <button
                          onClick={() => {
                            if (confirm('¿Eliminar este mensaje?')) {
                              deleteMessageMutation.mutate(msg.id);
                            }
                          }}
                          className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-semibold ${
                              isAdmin ? 'text-green-100' : isJugador ? 'text-blue-100' : 'text-orange-700'
                            }`}>
                              {isAdmin ? '🎓 ' : isJugador ? '⚽ ' : '👨‍👩‍👧 '}{msg.remitente_nombre}
                            </span>
                            {msg.destinatario_nombre && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                isAdmin ? 'bg-green-800 text-green-100' : 'bg-slate-200 text-slate-700'
                              }`}>
                                → {msg.destinatario_nombre}
                              </span>
                            )}
                            {msg.prioridad !== "Normal" && (
                              <span className="text-xs">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed break-words">{msg.mensaje}</p>

                          {msg.poll && (
                            <div className="mt-3">
                              <PollMessage 
                                poll={msg.poll} 
                                onVote={(msgId, optIdx) => voteOnPollMutation.mutate({ messageId: msgId, optionIndex: optIdx })}
                                userEmail={user.email}
                                messageId={msg.id}
                              />
                            </div>
                          )}

                          {msg.archivos_adjuntos?.length > 0 && (
                            <div className="mt-2">
                              <MessageAttachments attachments={msg.archivos_adjuntos} />
                            </div>
                          )}
                          
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className={`text-[10px] ${isAdmin ? 'text-green-100' : isJugador ? 'text-blue-100' : 'text-slate-500'}`}>
                              {format(new Date(msg.created_date), "HH:mm")}
                            </span>
                            {isAdmin && (
                              <span className="ml-1">
                                {readStatus === "read" ? (
                                  <CheckCheck className="w-3 h-3 text-blue-400" />
                                ) : (
                                  <Check className="w-3 h-3 text-green-200" />
                                )}
                              </span>
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
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">📝 Normal</SelectItem>
                  <SelectItem value="Importante">⚠️ Importante</SelectItem>
                  <SelectItem value="Urgente">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
              
              {!sendToAll && selectedGroup && (
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">👥 Todos del grupo</SelectItem>
                    {getGroupParents().map(parent => (
                      <SelectItem key={parent.email} value={parent.email}>
                        👤 {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2 items-end">
              <FileAttachmentButton
                onFileUploaded={handleFileUploaded}
                disabled={sendMessageMutation.isPending}
              />
              
              <Button
                onClick={() => setShowPollDialog(true)}
                disabled={!isBusinessHours()}
                variant="ghost"
                size="icon"
                className="text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                title="Crear encuesta rápida"
              >
                📊
              </Button>
              
              <Input
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 rounded-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              <Button
                onClick={handleSendMessage}
                disabled={(!messageContent.trim() && attachments.length === 0) || sendMessageMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg"
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
            <button
              onClick={() => handleSelectGroup(null, true)}
              className={`w-full p-4 flex items-center gap-3 border-b transition-all text-left ${
                sendToAll
                  ? 'bg-green-100 border-l-4 border-l-green-600'
                  : 'bg-white hover:bg-slate-100 border-l-4 border-l-transparent'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                sendToAll ? 'bg-green-600' : 'bg-slate-200'
              }`}>
                <span className="text-xl">📢</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">Todos los Grupos</div>
                <div className="text-xs text-slate-600 truncate">
                  Anuncio general
                </div>
              </div>
            </button>
            {filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => handleSelectGroup(group.id, false)}
                className={`w-full p-4 flex items-center gap-3 border-b transition-all text-left ${
                  selectedGroup === group.id && !sendToAll
                    ? 'bg-orange-100 border-l-4 border-l-orange-600'
                    : 'bg-white hover:bg-slate-100 border-l-4 border-l-transparent'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedGroup === group.id && !sendToAll ? 'bg-orange-600' : 'bg-slate-200'
                }`}>
                  <span className="text-xl">{sportEmojis[group.deporte]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{group.deporte}</div>
                  <div className="text-xs text-slate-600 truncate">
                    {group.messages.length} mensajes • {group.players.length} jugadores
                  </div>
                </div>
                {group.unreadCount > 0 && (
                  <Badge className={`${
                    group.urgentCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-orange-600'
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
    </>
  );
}