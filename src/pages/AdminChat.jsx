
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Search, Clock, AlertTriangle, AlertCircle, Bell } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";

export default function AdminChat() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [attachments, setAttachments] = useState([]);
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
      const newMessage = await base44.entities.ChatMessage.create(messageData);
      
      if (messageData.prioridad === "Importante" || messageData.prioridad === "Urgente") {
        const groupPlayers = players.filter(p => 
          `${p.deporte}_${p.categoria}` === messageData.grupo_id
        );
        
        const parentEmails = [...new Set(groupPlayers.map(p => p.email_padre).filter(Boolean))];
        
        const emailPromises = parentEmails.map(email => 
          base44.integrations.Core.SendEmail({
            to: email,
            subject: `[${messageData.prioridad === "Urgente" ? "🔴 URGENTE" : "⚠️ IMPORTANTE"}] Mensaje del Club - ${messageData.deporte}`,
            body: `
              <h2>Mensaje ${messageData.prioridad} del Club</h2>
              <p><strong>Grupo:</strong> ${messageData.deporte} - ${messageData.categoria}</p>
              <p><strong>De:</strong> ${messageData.remitente_nombre}</p>
              <p><strong>Mensaje:</strong></p>
              <p>${messageData.mensaje}</p>
              ${attachments.length > 0 ? `<p><strong>Archivos adjuntos:</strong> ${attachments.length}</p>` : ''}
              <br>
              <p>Accede a la aplicación para ver el mensaje completo y responder.</p>
            `
          }).catch(err => console.error("Error sending email:", err))
        );
        
        await Promise.all(emailPromises);
      }
      
      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setMessageContent("");
      setAttachments([]);
      setPriority("Normal");
      toast.success("Mensaje enviado al grupo");
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

  // Verificar horario de atención
  const isBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 20;
  };

  const groups = {};
  players.forEach(player => {
    if (!player.deporte || !player.categoria) return;
    const groupId = `${player.deporte}_${player.categoria}`;
    if (!groups[groupId]) {
      groups[groupId] = {
        id: groupId,
        deporte: player.deporte,
        categoria: player.categoria,
        players: [],
        messages: [],
        unreadCount: 0,
        urgentCount: 0,
        lastMessageDate: null
      };
    }
    groups[groupId].players.push(player);
  });

  messages.forEach(msg => {
    if (!msg.deporte || !msg.categoria) return;
    const groupId = msg.grupo_id || `${msg.deporte}_${msg.categoria}`;
    if (groups[groupId]) {
      groups[groupId].messages.push(msg);
      if (!msg.leido && msg.tipo === "padre_a_grupo") {
        groups[groupId].unreadCount++;
        if (msg.prioridad === "Urgente") {
          groups[groupId].urgentCount++;
        }
      }
      const msgDate = new Date(msg.created_date);
      if (!groups[groupId].lastMessageDate || msgDate > groups[groupId].lastMessageDate) {
        groups[groupId].lastMessageDate = msgDate;
      }
    }
  });

  const sortedGroups = Object.values(groups)
    .sort((a, b) => {
      if (!a.lastMessageDate && !b.lastMessageDate) return 0;
      if (!a.lastMessageDate) return 1;
      if (!b.lastMessageDate) return -1;
      return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
    });

  const filteredGroups = sortedGroups.filter(group =>
    (group.deporte || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.categoria || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!user || !selectedGroup) return;
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje o adjunta un archivo");
      return;
    }

    if (!isBusinessHours()) {
      toast.error("Solo puedes enviar mensajes entre las 10:00 y las 20:00");
      return;
    }

    const messageData = {
      remitente_email: user.email,
      remitente_nombre: user.full_name || "Administrador",
      mensaje: messageContent.trim() || "(Archivo adjunto)",
      prioridad: priority,
      tipo: "admin_a_grupo",
      deporte: selectedGroup.deporte,
      categoria: selectedGroup.categoria,
      grupo_id: selectedGroup.id,
      leido: false,
      archivos_adjuntos: attachments
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    
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

  const totalUnread = sortedGroups.reduce((sum, g) => sum + g.unreadCount, 0);
  const totalUrgent = sortedGroups.reduce((sum, g) => sum + g.urgentCount, 0);

  const sportEmojis = {
    "Fútbol": "⚽",
    "Fútbol Masculino": "⚽",
    "Fútbol Femenino": "⚽",
    "Baloncesto": "🏀"
  };

  const priorityColors = {
    "Normal": "text-slate-600",
    "Importante": "text-orange-600",
    "Urgente": "text-red-600"
  };

  const priorityIcons = {
    "Normal": "",
    "Importante": "⚠️",
    "Urgente": "🔴"
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedGroup?.messages]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Chat de Grupos</h1>
          <div className="flex gap-2">
            {totalUrgent > 0 && (
              <Badge className="bg-red-500 text-white shadow-lg animate-pulse">
                🔴 {totalUrgent} Urgente{totalUrgent !== 1 ? 's' : ''}
              </Badge>
            )}
            {totalUnread > 0 && (
              <Badge className="bg-white text-orange-700 shadow-lg">
                {totalUnread} No leído{totalUnread !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-orange-100 text-sm">
          Comunícate con los grupos de padres por deporte y categoría
        </p>
      </div>

      {/* Business Hours Status */}
      <div className="px-6 pt-4">
        <Alert className={isBusinessHours() ? "bg-green-50 border-green-300" : "bg-orange-50 border-orange-300"}>
          <Clock className={`h-4 w-4 ${isBusinessHours() ? "text-green-600" : "text-orange-600"}`} />
          <AlertDescription className={isBusinessHours() ? "text-green-800" : "text-orange-800"}>
            {isBusinessHours() ? (
              <span>✅ <strong>Horario activo</strong> - Puedes enviar mensajes (10:00 - 20:00)</span>
            ) : (
              <span>⏸️ <strong>Fuera de horario</strong> - Solo puedes enviar mensajes entre las 10:00 y las 20:00</span>
            )}
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Groups List */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12 px-4">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No hay grupos con jugadores</p>
                <p className="text-xs text-slate-400 mt-2">Los grupos se crean automáticamente al registrar jugadores</p>
              </div>
            ) : (
              filteredGroups.map(group => (
                <div
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${
                    selectedGroup?.id === group.id
                      ? 'bg-orange-50 border-l-4 border-l-orange-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{sportEmojis[group.deporte] || "⚽"}</span>
                        <h3 className="font-semibold text-slate-900">{group.categoria}</h3>
                      </div>
                      <p className="text-xs text-slate-600">{group.deporte}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {group.players.length} jugador{group.players.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {group.urgentCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs animate-pulse">
                          🔴 {group.urgentCount}
                        </Badge>
                      )}
                      {group.unreadCount > 0 && !group.urgentCount && (
                        <Badge className="bg-green-500 text-white text-xs">
                          {group.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col bg-slate-50">
          {selectedGroup ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sportEmojis[selectedGroup.deporte] || "⚽"}</span>
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">
                      {selectedGroup.deporte} - {selectedGroup.categoria}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {selectedGroup.players.length} jugador{selectedGroup.players.length !== 1 ? 'es' : ''} en este grupo
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedGroup.messages.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg mb-2">No hay mensajes aún</p>
                    <p className="text-slate-400 text-sm">Sé el primero en escribir en este grupo</p>
                  </div>
                ) : (
                  selectedGroup.messages
                    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.tipo === "admin_a_grupo" ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md p-3 rounded-lg ${
                            msg.tipo === "admin_a_grupo"
                              ? 'bg-orange-600 text-white'
                              : 'bg-white border border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold ${msg.tipo === "admin_a_grupo" ? 'text-white/80' : 'text-slate-800'}`}>
                              {msg.remitente_nombre}
                            </span>
                            {msg.prioridad && msg.prioridad !== "Normal" && (
                              <span className={priorityColors[msg.prioridad]}>
                                {priorityIcons[msg.prioridad]} {msg.prioridad}
                              </span>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                          
                          {/* Attachments */}
                          {msg.archivos_adjuntos && msg.archivos_adjuntos.length > 0 && (
                            <MessageAttachments attachments={msg.archivos_adjuntos} />
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            <p className={`text-xs ${
                              msg.tipo === "admin_a_grupo" ? 'text-orange-100' : 'text-slate-500'
                            }`}>
                              {format(new Date(msg.created_date), "HH:mm - d 'de' MMM", { locale: es })}
                            </p>
                            {msg.tipo === "admin_a_grupo" && msg.prioridad && msg.prioridad !== "Normal" && (
                              <Badge className="bg-white/20 text-white text-xs px-2 py-0 ml-2">
                                <Bell className="w-3 h-3 mr-1" />
                                Notificado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  <div ref={messagesEndRef} />
                )}
              </div>

              {/* Input Area */}
              <div className="bg-white border-t border-slate-200 p-4">
                {/* Preview attachments */}
                {attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachments.map((att, index) => (
                      <div key={index} className="bg-slate-100 rounded px-3 py-2 text-sm flex items-center gap-2">
                        <span className="truncate max-w-xs">{att.nombre}</span>
                        <button
                          onClick={() => handleRemoveAttachment(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mb-2">
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">📝 Normal</SelectItem>
                      <SelectItem value="Importante">⚠️ Importante</SelectItem>
                      <SelectItem value="Urgente">🔴 Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <FileAttachmentButton
                    onFileUploaded={handleFileUploaded}
                    disabled={!isBusinessHours() || sendMessageMutation.isPending}
                  />
                  
                  <Textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder={isBusinessHours() ? "Escribe tu mensaje..." : "Chat disponible de 10:00 a 20:00"}
                    className="flex-1 min-h-[80px]"
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
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg mb-2">Selecciona un grupo para empezar a chatear</p>
                <p className="text-sm">📱 Los padres recibirán tus mensajes en tiempo real</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
