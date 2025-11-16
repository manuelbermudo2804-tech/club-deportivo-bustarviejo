import React, { useState, useEffect, useRef, useMemo } from "react";
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
    refetchInterval: 2000,
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
    onSuccess: async () => {
      await refetchMessages();
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
      deporte: sendToAll ? "Todos" : selectedGroup,
      categoria: "",
      grupo_id: sendToAll ? "todos" : selectedGroup,
      leido: false,
      archivos_adjuntos: attachments,
      sendToAll: sendToAll
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
    <div className="fixed inset-0 flex flex-col bg-white" style={{ top: isMobile ? '120px' : '0', left: isMobile ? '0' : '288px' }}>
      {isMobile && (
        <div className="fixed top-[120px] left-0 right-0 z-20 bg-white border-b p-2 shadow-sm">
          <select
            value={sendToAll ? 'todos' : selectedGroup || ''}
            onChange={(e) => handleSelectGroup(e.target.value, e.target.value === 'todos')}
            className="w-full p-3 rounded-lg border-2 border-orange-300 bg-white text-slate-900 font-semibold"
          >
            <option value="">Selecciona un grupo...</option>
            {allGroupsList.map(group => (
              <option key={group.id} value={group.id}>
                {group.isSendToAll ? '📢 Todos los Grupos' : `${sportEmojis[group.deporte] || '⚽'} ${group.deporte}`}
                {group.unreadCount > 0 ? ` (${group.unreadCount})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isMobile && (
        <div className="bg-white border-b overflow-x-auto flex-shrink-0">
          <div className="flex">
            <button
              onClick={() => handleSelectGroup(null, true)}
              className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all flex-shrink-0 ${
                sendToAll
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>📢 Todos</span>
            </button>
            {sortedGroups.map(group => (
              <button
                key={group.id}
                onClick={() => handleSelectGroup(group.id, false)}
                className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all flex-shrink-0 ${
                  selectedGroup === group.id && !sendToAll
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

      {(selectedGroup || sendToAll) && (
        <>
          <div className={`p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0 ${
            sendToAll ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-orange-600 to-orange-700'
          }`} style={{ marginTop: isMobile ? '56px' : '0' }}>
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
            {!isBusinessHours() && (
              <Badge className="bg-white/20 text-white text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Fuera de horario
              </Badge>
            )}
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
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-1`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg shadow-sm ${
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
      )}
    </div>
  );
}