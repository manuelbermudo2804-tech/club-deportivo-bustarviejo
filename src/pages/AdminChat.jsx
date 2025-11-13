import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Search, Clock, AlertTriangle, AlertCircle, Bell, MessageCircle } from "lucide-react";
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

  const { data: messages } = useQuery({
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
        const groupPlayers = players.filter(p => p.deporte === messageData.deporte);
        
        const parentEmails = [...new Set(groupPlayers.map(p => p.email_padre).filter(Boolean))];
        
        const priorityEmoji = messageData.prioridad === "Urgente" ? "🔴" : "⚠️";
        const priorityColor = messageData.prioridad === "Urgente" ? "#dc2626" : "#ea580c";
        
        const emailPromises = parentEmails.map(email => 
          base44.integrations.Core.SendEmail({
            to: email,
            subject: `${priorityEmoji} [${messageData.prioridad.toUpperCase()}] Mensaje del CD Bustarviejo - ${messageData.deporte}`,
            body: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">
                      ${priorityEmoji} Mensaje ${messageData.prioridad}
                    </h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                      CD Bustarviejo
                    </p>
                  </div>

                  <!-- Priority Banner -->
                  <div style="background-color: ${priorityColor}; color: white; padding: 15px 20px; text-align: center;">
                    <strong style="font-size: 16px;">
                      ${messageData.prioridad === "Urgente" ? "⚠️ ATENCIÓN INMEDIATA REQUERIDA" : "📢 MENSAJE IMPORTANTE"}
                    </strong>
                  </div>

                  <!-- Content -->
                  <div style="padding: 30px 20px;">
                    <!-- Group Info -->
                    <div style="background-color: #f9fafb; border-left: 4px solid #ea580c; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                      <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        GRUPO
                      </p>
                      <p style="margin: 5px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">
                        ⚽ ${messageData.deporte}
                      </p>
                    </div>

                    <!-- Message -->
                    <div style="margin-bottom: 25px;">
                      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        MENSAJE
                      </p>
                      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #111827; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
${messageData.mensaje}
                        </p>
                      </div>
                    </div>

                    ${messageData.archivos_adjuntos && messageData.archivos_adjuntos.length > 0 ? `
                    <!-- Attachments -->
                    <div style="margin-bottom: 25px;">
                      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📎 ARCHIVOS ADJUNTOS
                      </p>
                      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border: 1px solid #bfdbfe;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px;">
                          ${messageData.archivos_adjuntos.length} archivo${messageData.archivos_adjuntos.length !== 1 ? 's' : ''} adjunto${messageData.archivos_adjuntos.length !== 1 ? 's' : ''}
                        </p>
                        <p style="margin: 5px 0 0 0; color: #60a5fa; font-size: 12px;">
                          Accede a la aplicación para ver los archivos
                        </p>
                      </div>
                    </div>
                    ` : ''}

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://tu-app.base44.com" 
                         style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(234, 88, 12, 0.3);">
                        📱 Ver en la Aplicación
                      </a>
                    </div>

                    <!-- Info Box -->
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-top: 20px;">
                      <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                        💡 <strong>Tip:</strong> Puedes responder directamente desde la aplicación o conectar WhatsApp para recibir notificaciones instantáneas.
                      </p>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #111827; color: white; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">
                      CD Bustarviejo
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      📧 CDBUSTARVIEJO@GMAIL.COM
                    </p>
                    <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 11px;">
                      © ${new Date().getFullYear()} CD Bustarviejo. Todos los derechos reservados.
                    </p>
                  </div>

                </div>
              </body>
              </html>
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

  const isBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 20;
  };

  // Función para normalizar y limpiar el deporte/grupo_id
  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    
    let normalized = deporte.trim();
    normalized = normalized.replace(/_undefined$/, '');
    normalized = normalized.replace(/_$/, '');
    
    return normalized;
  };

  // Create groups from players - usando deporte como identificador único
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

  const sortedGroups = Object.values(groups)
    .sort((a, b) => {
      if (!a.lastMessageDate && !b.lastMessageDate) return 0;
      if (!a.lastMessageDate) return 1;
      if (!b.lastMessageDate) return -1;
      return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
    });

  const filteredGroups = sortedGroups.filter(group =>
    (group.deporte || "").toLowerCase().includes(searchTerm.toLowerCase())
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
      categoria: "",
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

  // WhatsApp URL
  const whatsappURL = base44.agents.getWhatsAppConnectURL('club_chat');

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
          Comunícate con los grupos de padres por categoría
        </p>
      </div>

      <div className="px-6 pt-4 space-y-3">
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

        {/* WhatsApp Integration Alert */}
        <Alert className="bg-green-50 border-green-300">
          <MessageCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="flex items-center justify-between">
              <span>
                📱 <strong>Nuevo:</strong> Los padres pueden conectar WhatsApp para recibir notificaciones instantáneas
              </span>
              <a 
                href={whatsappURL}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium whitespace-nowrap"
              >
                Conectar WhatsApp
              </a>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex-1 flex overflow-hidden">
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
                <p className="text-slate-500">No hay grupos disponibles</p>
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
                        <h3 className="font-semibold text-slate-900 text-sm">{group.deporte}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {group.players.length} jugador{group.players.length !== 1 ? 'es' : ''}
                        {group.messages.length > 0 && ` • ${group.messages.length} mensaje${group.messages.length !== 1 ? 's' : ''}`}
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

        <div className="flex-1 flex flex-col bg-slate-50">
          {selectedGroup ? (
            <>
              <div className="bg-white border-b border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sportEmojis[selectedGroup.deporte] || "⚽"}</span>
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">
                      {selectedGroup.deporte}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {selectedGroup.players.length} jugador{selectedGroup.players.length !== 1 ? 'es' : ''} en este grupo
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedGroup.messages.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg mb-2">No hay mensajes aún</p>
                    <p className="text-slate-400 text-sm">Sé el primero en escribir en este grupo</p>
                  </div>
                ) : (
                  <>
                    {selectedGroup.messages
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
                                  {priorityIcons[msg.prioridad]}
                                </span>
                              )}
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                            
                            {msg.archivos_adjuntos && msg.archivos_adjuntos.length > 0 && (
                              <MessageAttachments attachments={msg.archivos_adjuntos} />
                            )}
                            
                            <p className={`text-xs mt-2 ${
                              msg.tipo === "admin_a_grupo" ? 'text-orange-100' : 'text-slate-500'
                            }`}>
                              {format(new Date(msg.created_date), "HH:mm - d 'de' MMM", { locale: es })}
                            </p>
                          </div>
                        </div>
                      ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="bg-white border-t border-slate-200 p-4">
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