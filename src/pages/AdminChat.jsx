import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Search, Users, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AdminChat() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messageText, setMessageText] = useState("");
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
    mutationFn: (messageData) => base44.entities.ChatMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setMessageText("");
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
    const groupId = `${player.deporte}_${player.categoria}`;
    if (!allGroups[groupId]) {
      allGroups[groupId] = {
        id: groupId,
        deporte: player.deporte,
        categoria: player.categoria,
        messages: [],
        unreadCount: 0,
        lastMessage: null,
        playerCount: 0
      };
    }
    allGroups[groupId].playerCount++;
  });

  // Agregar mensajes a los grupos
  messages.forEach(msg => {
    const groupId = msg.grupo_id || `${msg.deporte}_${msg.categoria}`;
    if (allGroups[groupId]) {
      allGroups[groupId].messages.push(msg);
      if (!msg.leido && msg.tipo === "padre_a_grupo") {
        allGroups[groupId].unreadCount++;
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
    group.deporte.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.categoria.toLowerCase().includes(searchTerm.toLowerCase())
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
      tipo: "admin_a_grupo",
      deporte: selectedGroup.deporte,
      categoria: selectedGroup.categoria,
      grupo_id: selectedGroup.id,
      leido: false
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

  const deporteEmojis = {
    "Fútbol": "⚽",
    "Baloncesto": "🏀"
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chat por Grupos</h1>
          <p className="text-slate-600 mt-1">Comunicación por deporte y categoría</p>
        </div>
        {totalUnread > 0 && (
          <Badge className="bg-red-500 text-white text-lg px-4 py-2">
            {totalUnread} sin leer
          </Badge>
        )}
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
                Horario de atención: 10:00 - 20:00
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
                            {deporteEmojis[group.deporte]}
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
                    {deporteEmojis[selectedGroup.deporte]}
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
                              : 'bg-slate-100 text-slate-900'
                          } rounded-2xl px-4 py-3 shadow-sm`}>
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {msg.remitente_nombre}
                            </p>
                            <p className="text-sm">{msg.mensaje}</p>
                            <p className={`text-xs mt-2 ${
                              msg.tipo === "admin_a_grupo" ? 'text-orange-200' : 'text-slate-500'
                            }`}>
                              {format(new Date(msg.created_date), "HH:mm - d 'de' MMM", { locale: es })}
                            </p>
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
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}