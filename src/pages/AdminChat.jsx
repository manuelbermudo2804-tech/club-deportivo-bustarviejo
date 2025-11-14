
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Search, Clock, AlertCircle, X, Users, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";

export default function AdminChat() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
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
    refetchInterval: 3000,
  });

  const { data: players } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
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
    onSuccess: (newMessageOrMessages) => {
      queryClient.setQueryData(['chatMessages'], (oldMessages) => {
        const messagesToPrepend = Array.isArray(newMessageOrMessages) ? newMessageOrMessages : [newMessageOrMessages];
        return [...messagesToPrepend, ...(oldMessages || [])];
      });
      
      setMessageContent("");
      setAttachments([]);
      setPriority("Normal");
      setSendToAll(false);
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

  const groups = {};
  
  players.forEach(player => {
    const deporteNormalizado = normalizeDeporte(player.deporte);
    if (!deporteNormalizado) return;
    
    if (!groups[deporteNormalizado]) {
      groups[deporteNormalizado] = {
        id: deporteNormalizado,
        deporte: deporteNormalizado,
        players: [],
        messages: [],
        unreadCount: 0,
        urgentCount: 0,
        lastMessageDate: null
      };
    }
    groups[deporteNormalizado].players.push(player);
  });

  messages.forEach(msg => {
    let deporteRaw = msg.grupo_id || msg.deporte;
    const deporteNormalizado = normalizeDeporte(deporteRaw);
    
    if (!deporteNormalizado) return;
    
    if (!groups[deporteNormalizado]) {
      groups[deporteNormalizado] = {
        id: deporteNormalizado,
        deporte: deporteNormalizado,
        players: [],
        messages: [],
        unreadCount: 0,
        urgentCount: 0,
        lastMessageDate: null
      };
    }
    
    if (!groups[deporteNormalizado].messages.find(m => m.id === msg.id)) {
      groups[deporteNormalizado].messages.push(msg);
      
      if (!msg.leido && msg.tipo === "padre_a_grupo") {
        groups[deporteNormalizado].unreadCount++;
        if (msg.prioridad === "Urgente") {
          groups[deporteNormalizado].urgentCount++;
        }
      }
      
      const msgDate = new Date(msg.created_date);
      if (!groups[deporteNormalizado].lastMessageDate || msgDate > groups[deporteNormalizado].lastMessageDate) {
        groups[deporteNormalizado].lastMessageDate = msgDate;
      }
    }
  });

  const sortedGroups = Object.values(groups).sort((a, b) => {
    if (!a.lastMessageDate && !b.lastMessageDate) return 0;
    if (!a.lastMessageDate) return 1;
    if (!b.lastMessageDate) return -1;
    return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
  });

  const filteredGroups = sortedGroups.filter(group =>
    (group.deporte || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!user) return;
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje");
      return;
    }

    if (!isBusinessHours()) {
      toast.error("Solo entre 10:00 y 20:00");
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
      deporte: sendToAll ? "Todos" : selectedGroup.deporte,
      categoria: "",
      grupo_id: sendToAll ? "todos" : selectedGroup.id,
      leido: false,
      archivos_adjuntos: attachments,
      sendToAll: sendToAll
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setSendToAll(false);
    const unreadMessageIds = group.messages
      .filter(msg => !msg.leido && msg.tipo === "padre_a_grupo")
      .map(msg => msg.id);
    
    if (unreadMessageIds.length > 0) {
      markAsReadMutation.mutate(unreadMessageIds);
    }
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
  }, [selectedGroup?.messages]);

  const getReadStatus = (msg) => {
    if (msg.tipo !== "admin_a_grupo") return null;
    return msg.leido ? "read" : "sent";
  };

  return (
    <div className="h-screen flex bg-white">
      {/* Lista de Grupos - Estilo WhatsApp */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 text-white">
          <h1 className="text-xl font-bold mb-1">Chats</h1>
          <p className="text-xs text-orange-100">Chat de grupos del club</p>
        </div>

        {/* Search */}
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

        {/* Opción: Enviar a Todos */}
        <div
          onClick={() => {
            setSendToAll(true);
            setSelectedGroup(null);
          }}
          className={`p-4 border-b cursor-pointer transition-all ${
            sendToAll ? 'bg-orange-50' : 'hover:bg-slate-50'
          }`}
        >
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center flex-shrink-0 shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                📢 Anuncio a Todos los Grupos
              </h3>
              <p className="text-xs text-slate-500">
                Enviar mensaje a todos los grupos a la vez
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Grupos */}
        <div className="flex-1 overflow-y-auto">
          {filteredGroups.map(group => {
            const lastMsg = group.messages.sort((a, b) => 
              new Date(b.created_date) - new Date(a.created_date)
            )[0];
            
            return (
              <div
                key={group.id}
                onClick={() => handleSelectGroup(group)}
                className={`p-4 border-b cursor-pointer transition-all ${
                  selectedGroup?.id === group.id && !sendToAll
                    ? 'bg-orange-50'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-2xl">{sportEmojis[group.deporte] || "⚽"}</span>
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
                      <p className="text-xs text-slate-500 truncate">
                        {lastMsg ? lastMsg.mensaje.substring(0, 30) + '...' : 'Sin mensajes'}
                      </p>
                      {group.unreadCount > 0 && (
                        <Badge className="bg-orange-600 text-white text-xs h-5 min-w-5 rounded-full flex items-center justify-center">
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

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col bg-[#e5ddd5] hidden md:flex">
        {sendToAll ? (
          <>
            {/* Header - Anuncio General */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 text-white flex items-center gap-3 shadow-md">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-base">📢 Anuncio a Todos los Grupos</h2>
                <p className="text-xs text-green-100">
                  Enviar a {Object.keys(groups).length} grupos • {players.length} jugadores
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <Alert className="bg-blue-50 border-blue-300">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Modo Anuncio:</strong> Tu mensaje se enviará a todos los grupos del club. 
                  Todos los padres recibirán la notificación.
                </AlertDescription>
              </Alert>
            </div>

            {/* Espacio vacío */}
            <div className="flex-1" />

            {/* Input Area */}
            <div className="bg-white border-t p-3">
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

              <div className="flex gap-2 items-end">
                <FileAttachmentButton
                  onFileUploaded={handleFileUploaded}
                  disabled={!isBusinessHours() || sendMessageMutation.isPending}
                />
                
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Escribe tu anuncio..."
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
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : selectedGroup ? (
          <>
            {/* Header del Chat */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 text-white flex items-center gap-3 shadow-md">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xl">{sportEmojis[selectedGroup.deporte]}</span>
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-base">{selectedGroup.deporte}</h2>
                <p className="text-xs text-orange-100">
                  {selectedGroup.players.length} jugador{selectedGroup.players.length !== 1 ? 'es' : ''}
                </p>
              </div>
              {!isBusinessHours() && (
                <Badge className="bg-white/20 text-white text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Fuera de horario
                </Badge>
              )}
            </div>

            {/* Mensajes */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-2"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            >
              {selectedGroup.messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay mensajes</p>
                  </div>
                </div>
              ) : (
                selectedGroup.messages
                  .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                  .map((msg) => {
                    const readStatus = getReadStatus(msg);
                    const isJugador = msg.tipo === "jugador_a_equipo";
                    const isPadre = msg.tipo === "padre_a_grupo";
                    const isAdmin = msg.tipo === "admin_a_grupo";
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-1`}
                      >
                        <div
                          className={`max-w-[65%] rounded-lg shadow-sm ${
                            isAdmin
                              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-br-none'
                              : isJugador
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-bl-none'
                              : 'bg-white text-slate-900 rounded-bl-none'
                          }`}
                        >
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold ${
                                isAdmin ? 'text-green-100' : isJugador ? 'text-blue-100' : 'text-orange-700'
                              }`}>
                                {isAdmin ? '🎓 ' : isJugador ? '⚽ ' : '👨‍👩‍👧 '}{msg.remitente_nombre}
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

            {/* Input Area */}
            <div className="bg-white border-t p-3">
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
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#e5ddd5]">
            <div className="text-center text-slate-500">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-1">Selecciona un grupo</p>
              <p className="text-sm opacity-70">O usa "Anuncio a Todos" para enviar a todos</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
