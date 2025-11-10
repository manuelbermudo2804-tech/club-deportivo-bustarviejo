import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Search, Users, Clock, AlertTriangle, AlertCircle, Bell } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AdminChat() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [messagePriority, setMessagePriority] = useState("Normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const newMessage = await base44.entities.ChatMessage.create(messageData);
      
      // Enviar notificaciones por email a los padres del grupo
      if (messageData.prioridad === "Urgente" || messageData.prioridad === "Importante") {
        const groupPlayers = players.filter(p => 
          p.deporte === messageData.deporte && 
          p.categoria === messageData.categoria &&
          p.email_padre
        );
        
        const uniqueEmails = [...new Set(groupPlayers.map(p => p.email_padre))];
        
        for (const email of uniqueEmails) {
          try {
            await base44.integrations.Core.SendEmail({
              to: email,
              subject: `[${messageData.prioridad}] Nuevo mensaje en ${messageData.deporte} - ${messageData.categoria}`,
              body: `
                <h2>📬 Nuevo mensaje ${messageData.prioridad === "Urgente" ? "🔴 URGENTE" : "⚠️ IMPORTANTE"}</h2>
                <p><strong>Grupo:</strong> ${messageData.deporte} - ${messageData.categoria}</p>
                <p><strong>De:</strong> ${messageData.remitente_nombre}</p>
                <p><strong>Mensaje:</strong></p>
                <p style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
                  ${messageData.mensaje}
                </p>
                <p style="margin-top: 20px;">
                  <a href="${window.location.origin}" style="background-color: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Ver en la aplicación
                  </a>
                </p>
                <hr style="margin-top: 20px;">
                <p style="color: #666; font-size: 12px;">
                  Este mensaje se envió desde el chat del grupo de CF Bustarviejo.
                </p>
              `
            });
          } catch (error) {
            console.error("Error sending email:", error);
          }
        }
      }
      
      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setMessageText("");
      setMessagePriority("Normal");
      toast.success("Mensaje enviado al grupo");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, messageData }) => base44.entities.ChatMessage.update(id, messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  // Verificar horario de atención
  const isWithinBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 20;
  };

  // Crear grupos automáticamente basándose en los jugadores registrados
  const allGroups = {};
  players.forEach(player => {
    if (!player.deporte || !player.categoria) return;
    
    const groupId = `${player.deporte}_${player.categoria}`;
    if (!allGroups[groupId]) {
      allGroups[groupId] = {
        id: groupId,
        deporte: player.deporte,
        categoria: player.categoria,
        messages: [],
        unreadCount: 0,
        urgentCount: 0,
        lastMessage: null,
        playerCount: 0
      };
    }
    allGroups[groupId].playerCount++;
  });

  // Agregar mensajes a los grupos
  messages.forEach(msg => {
    if (!msg.deporte || !msg.categoria) return;
    
    const groupId = msg.grupo_id || `${msg.deporte}_${msg.categoria}`;
    if (allGroups[groupId]) {
      allGroups[groupId].messages.push(msg);
      if (!msg.leido && msg.tipo === "padre_a_grupo") {
        allGroups[groupId].unreadCount++;
        if (msg.prioridad === "Urgente") {
          allGroups[groupId].urgentCount++;
        }
      }
      if (!allGroups[groupId].lastMessage || 
          new Date(msg.created_date) > new Date(allGroups[groupId].lastMessage.created_date)) {
        allGroups[groupId].lastMessage = msg;
      }
    }
  });

  const groupsList = Object.values(allGroups).sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return 0;
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date);
  });

  const filteredGroups = groupsList.filter(group =>
    (group.deporte || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.categoria || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedGroup || !currentUser) return;

    if (!isWithinBusinessHours()) {
      toast.error("El chat está disponible de 10:00 a 20:00");
      return;
    }

    sendMessageMutation.mutate({
      remitente_email: currentUser.email,
      remitente_nombre: currentUser.full_name,
      mensaje: messageText,
      prioridad: messagePriority,
      tipo: "admin_a_grupo",
      deporte: selectedGroup.deporte,
      categoria: selectedGroup.categoria,
      grupo_id: selectedGroup.id,
      leido: false,
      notificacion_enviada: messagePriority !== "Normal"
    });
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    
    // Marcar mensajes no leídos como leídos
    group.messages.forEach(msg => {
      if (!msg.leido && msg.tipo === "padre_a_grupo") {
        markAsReadMutation.mutate({
          id: msg.id,
          messageData: { ...msg, leido: true }
        });
      }
    });
  };

  const totalUnread = groupsList.reduce((sum, group) => sum + group.unreadCount, 0);
  const totalUrgent = groupsList.reduce((sum, group) => sum + group.urgentCount, 0);

  const deporteEmojis = {
    "Fútbol": "⚽",
    "Baloncesto": "🏀"
  };

  const priorityColors = {
    "Normal": "bg-slate-100 text-slate-700",
    "Importante": "bg-orange-100 text-orange-700 border-l-4 border-orange-500",
    "Urgente": "bg-red-100 text-red-700 border-l-4 border-red-500"
  };

  const priorityIcons = {
    "Normal": null,
    "Importante": <AlertTriangle className="w-4 h-4" />,
    "Urgente": <AlertCircle className="w-4 h-4" />
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chat por Grupos</h1>
          <p className="text-slate-600 mt-1">Comunicación por deporte y categoría</p>
        </div>
        <div className="flex gap-2">
          {totalUrgent > 0 && (
            <Badge className="bg-red-500 text-white text-lg px-4 py-2">
              🔴 {totalUrgent} urgente{totalUrgent !== 1 ? 's' : ''}
            </Badge>
          )}
          {totalUnread > 0 && (
            <Badge className="bg-orange-500 text-white text-lg px-4 py-2">
              {totalUnread} sin leer
            </Badge>
          )}
        </div>
      </div>

      {/* Horario de Atención */}
      <Card className={`border-none shadow-lg ${isWithinBusinessHours() ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Clock className={`w-5 h-5 ${isWithinBusinessHours() ? 'text-green-600' : 'text-orange-600'}`} />
            <div>
              <p className="font-medium text-slate-900">
                {isWithinBusinessHours() ? '🟢 Chat Activo' : '🟠 Fuera de Horario'}
              </p>
              <p className="text-sm text-slate-600">
                Horario de atención: 10:00 - 20:00 • Notificaciones automáticas para mensajes Importantes/Urgentes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
        {/* Lista de Grupos */}
        <Card className="border-none shadow-lg lg:col-span-1">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-600" />
              Grupos de Chat ({groupsList.length})
            </CardTitle>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                placeholder="Buscar grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-140px)]">
            <CardContent className="p-0">
              {filteredGroups.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay grupos con jugadores</p>
                  <p className="text-xs text-slate-400 mt-2">Los grupos se crean automáticamente al registrar jugadores</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleSelectGroup(group)}
                      className={`w-full p-4 hover:bg-slate-50 transition-colors text-left ${
                        selectedGroup?.id === group.id ? 'bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                            {deporteEmojis[group.deporte] || "⚽"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900">{group.deporte}</p>
                            <p className="text-sm text-slate-600">{group.categoria}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {group.playerCount} jugador{group.playerCount !== 1 ? 'es' : ''}
                            </p>
                            {group.lastMessage && (
                              <p className="text-xs text-slate-500 truncate mt-1">
                                {group.lastMessage.mensaje}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {group.lastMessage && (
                            <p className="text-xs text-slate-400">
                              {format(new Date(group.lastMessage.created_date), 'HH:mm')}
                            </p>
                          )}
                          {group.urgentCount > 0 && (
                            <Badge className="bg-red-600 text-white h-5 min-w-5 flex items-center justify-center px-2 text-xs">
                              🔴 {group.urgentCount}
                            </Badge>
                          )}
                          {group.unreadCount > 0 && (
                            <Badge className="bg-orange-600 text-white h-5 min-w-5 flex items-center justify-center px-2 text-xs">
                              {group.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Ventana de Chat */}
        <Card className="border-none shadow-lg lg:col-span-2 flex flex-col">
          {!selectedGroup ? (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Selecciona un grupo</p>
                <p className="text-slate-400 text-sm mt-2">Elige un grupo de deporte/categoría para ver los mensajes</p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-2xl">
                    {deporteEmojis[selectedGroup.deporte] || "⚽"}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selectedGroup.deporte} - {selectedGroup.categoria}</CardTitle>
                    <p className="text-sm text-slate-500">
                      {selectedGroup.playerCount} jugador{selectedGroup.playerCount !== 1 ? 'es' : ''} en este grupo
                    </p>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-6">
                {selectedGroup.messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg mb-2">No hay mensajes aún</p>
                    <p className="text-slate-400 text-sm">Sé el primero en escribir en este grupo</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedGroup.messages
                      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.tipo === "admin_a_grupo" ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${
                            msg.tipo === "admin_a_grupo" 
                              ? 'bg-orange-600 text-white' 
                              : priorityColors[msg.prioridad || "Normal"]
                          } rounded-2xl px-4 py-3 shadow-sm`}>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-medium opacity-70">
                                {msg.remitente_nombre || "Usuario"}
                              </p>
                              {msg.prioridad && msg.prioridad !== "Normal" && msg.tipo === "padre_a_grupo" && (
                                <Badge className={`${
                                  msg.prioridad === "Urgente" ? "bg-red-600" : "bg-orange-600"
                                } text-white text-xs px-2 py-0`}>
                                  {priorityIcons[msg.prioridad]}
                                  <span className="ml-1">{msg.prioridad}</span>
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{msg.mensaje}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className={`text-xs ${
                                msg.tipo === "admin_a_grupo" ? 'text-orange-200' : 'text-slate-500'
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
                  </div>
                )}
              </ScrollArea>

              <CardContent className="border-t border-slate-100 p-4">
                {!isWithinBusinessHours() && (
                  <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      El chat está disponible de 10:00 a 20:00
                    </p>
                  </div>
                )}
                
                {/* Selector de Prioridad */}
                <div className="mb-3">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Prioridad del mensaje:
                  </label>
                  <Select value={messagePriority} onValueChange={setMessagePriority}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">
                        📝 Normal
                      </SelectItem>
                      <SelectItem value="Importante">
                        ⚠️ Importante (notifica por email)
                      </SelectItem>
                      <SelectItem value="Urgente">
                        🔴 Urgente (notifica por email)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Textarea
                    placeholder={isWithinBusinessHours() ? "Escribe tu mensaje al grupo..." : "Chat disponible de 10:00 a 20:00"}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={!isWithinBusinessHours()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="resize-none"
                    rows={3}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessageMutation.isPending || !isWithinBusinessHours()}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Los mensajes Importantes/Urgentes enviarán notificación por email automáticamente
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}