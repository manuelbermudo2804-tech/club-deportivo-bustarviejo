import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Users, Clock, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ParentChat() {
  const [messageText, setMessageText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: players } = useQuery({
    queryKey: ['myPlayers', currentUser?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        p.email_padre === currentUser?.email || p.email === currentUser?.email
      );
    },
    enabled: !!currentUser?.email,
    initialData: [],
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 5000,
  });

  // Crear grupos automáticamente basándose en mis jugadores
  useEffect(() => {
    if (players.length > 0) {
      const groups = {};
      players.forEach(player => {
        if (!player.deporte || !player.categoria) return;
        
        const groupId = `${player.deporte}_${player.categoria}`;
        if (!groups[groupId]) {
          groups[groupId] = {
            id: groupId,
            deporte: player.deporte,
            categoria: player.categoria,
            messages: [],
            unreadCount: 0,
            urgentCount: 0
          };
        }
      });

      // Agregar mensajes a los grupos
      messages.forEach(msg => {
        if (!msg.deporte || !msg.categoria) return;
        
        const groupId = msg.grupo_id || `${msg.deporte}_${msg.categoria}`;
        if (groups[groupId]) {
          groups[groupId].messages.push(msg);
          if (!msg.leido && msg.tipo === "admin_a_grupo") {
            groups[groupId].unreadCount++;
            if (msg.prioridad === "Urgente") {
              groups[groupId].urgentCount++;
            }
          }
        }
      });

      // Ordenar mensajes por fecha
      Object.values(groups).forEach(group => {
        group.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      });

      const groupsList = Object.values(groups);
      setMyGroups(groupsList);
      
      if (groupsList.length > 0 && !selectedGroup) {
        setSelectedGroup(groupsList[0]);
      } else if (selectedGroup && !groupsList.find(g => g.id === selectedGroup.id)) {
        setSelectedGroup(groupsList[0]);
      } else if (selectedGroup) {
        const updatedGroup = groupsList.find(g => g.id === selectedGroup.id);
        if (updatedGroup) {
          setSelectedGroup(updatedGroup);
        }
      }
    } else {
      setMyGroups([]);
      setSelectedGroup(null);
    }
  }, [players, messages]);

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

  useEffect(() => {
    // Marcar mensajes del admin como leídos en el grupo seleccionado
    if (selectedGroup && currentUser) {
      selectedGroup.messages.forEach(msg => {
        if (!msg.leido && msg.tipo === "admin_a_grupo") {
          markAsReadMutation.mutate({
            id: msg.id,
            messageData: { ...msg, leido: true }
          });
        }
      });
    }
  }, [selectedGroup?.id, currentUser]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !currentUser || !selectedGroup) return;

    if (!isWithinBusinessHours()) {
      toast.error("El chat está disponible de 10:00 a 20:00");
      return;
    }

    sendMessageMutation.mutate({
      remitente_email: currentUser.email,
      remitente_nombre: currentUser.full_name,
      mensaje: messageText,
      prioridad: "Normal",
      tipo: "padre_a_grupo",
      deporte: selectedGroup.deporte,
      categoria: selectedGroup.categoria,
      grupo_id: selectedGroup.id,
      leido: false
    });
  };

  const deporteEmojis = {
    "Fútbol Masculino": "⚽",
    "Fútbol Femenino": "⚽",
    "Baloncesto": "🏀"
  };

  const priorityColors = {
    "Normal": "bg-blue-600",
    "Importante": "bg-orange-600",
    "Urgente": "bg-red-600"
  };

  const priorityIcons = {
    "Normal": null,
    "Importante": <AlertTriangle className="w-3 h-3" />,
    "Urgente": <AlertCircle className="w-3 h-3" />
  };

  if (myGroups.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Chat del Club</h1>
        <Card className="border-none shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-orange-400 mb-4" />
            <p className="text-slate-600 text-lg mb-2">No tienes jugadores registrados</p>
            <p className="text-slate-500 text-sm">Registra a tus jugadores para acceder al chat del grupo</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUnread = myGroups.reduce((sum, group) => sum + group.unreadCount, 0);
  const totalUrgent = myGroups.reduce((sum, group) => sum + group.urgentCount, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chat del Grupo</h1>
          <p className="text-slate-600 mt-1">Comunícate con el club</p>
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
                {isWithinBusinessHours() ? '🟢 Chat Activo' : '🟠 Chat Fuera de Horario'}
              </p>
              <p className="text-sm text-slate-600">
                {isWithinBusinessHours() 
                  ? 'Puedes enviar mensajes hasta las 20:00' 
                  : 'El chat estará disponible mañana de 10:00 a 20:00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para Múltiples Grupos */}
      {myGroups.length > 1 ? (
        <Tabs value={selectedGroup?.id} onValueChange={(value) => {
          const group = myGroups.find(g => g.id === value);
          setSelectedGroup(group);
        }}>
          <TabsList className="bg-white border">
            {myGroups.map(group => (
              <TabsTrigger key={group.id} value={group.id} className="relative">
                <span className="mr-2">{deporteEmojis[group.deporte] || "⚽"}</span>
                {group.categoria}
                {group.urgentCount > 0 && (
                  <Badge className="ml-2 bg-red-600 text-white h-5 min-w-5 flex items-center justify-center px-1.5 text-xs">
                    🔴 {group.urgentCount}
                  </Badge>
                )}
                {group.unreadCount > 0 && (
                  <Badge className="ml-2 bg-orange-500 text-white h-5 min-w-5 flex items-center justify-center px-1.5 text-xs">
                    {group.unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        <Card className="border-none shadow-lg bg-gradient-to-r from-orange-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-2xl">
                {deporteEmojis[selectedGroup?.deporte] || "⚽"}
              </div>
              <div>
                <p className="font-bold text-slate-900">{selectedGroup?.deporte || "Deporte"}</p>
                <p className="text-sm text-slate-600">{selectedGroup?.categoria || "Categoría"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat */}
      <Card className="border-none shadow-lg h-[calc(100vh-450px)] flex flex-col">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-orange-600" />
              <div>
                <CardTitle className="text-lg">
                  {selectedGroup?.deporte || "Deporte"} - {selectedGroup?.categoria || "Categoría"}
                </CardTitle>
                <p className="text-sm text-slate-500">Chat grupal</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 p-6">
          {loadingMessages ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
              <p className="text-slate-500 mt-4">Cargando mensajes...</p>
            </div>
          ) : !selectedGroup || selectedGroup.messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg mb-2">No hay mensajes aún en este grupo</p>
              <p className="text-slate-400 text-sm">Los mensajes aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedGroup.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.tipo === "padre_a_grupo" && msg.remitente_email === currentUser?.email ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${
                    msg.tipo === "padre_a_grupo" && msg.remitente_email === currentUser?.email
                      ? 'bg-orange-600 text-white' 
                      : msg.tipo === "admin_a_grupo"
                      ? `${priorityColors[msg.prioridad || "Normal"]} text-white`
                      : 'bg-slate-100 text-slate-900'
                  } rounded-2xl px-4 py-3 shadow-sm`}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium opacity-70">
                        {msg.tipo === "admin_a_grupo" ? "👤 Club" : msg.remitente_nombre || "Usuario"}
                      </p>
                      {msg.tipo === "admin_a_grupo" && msg.prioridad && msg.prioridad !== "Normal" && (
                        <Badge className="bg-white/30 text-white text-xs px-2 py-0 flex items-center gap-1">
                          {priorityIcons[msg.prioridad]}
                          <span>{msg.prioridad}</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                    <p className={`text-xs mt-2 ${
                      ((msg.tipo === "padre_a_grupo" && msg.remitente_email === currentUser?.email) || msg.tipo === "admin_a_grupo")
                        ? 'text-white/70' 
                        : 'text-slate-500'
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
            <div className="mb-3 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
              <p className="text-sm text-orange-800 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Chat disponible de 10:00 a 20:00
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Textarea
              placeholder={isWithinBusinessHours() ? "Escribe tu mensaje..." : "Chat disponible de 10:00 a 20:00"}
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
            Presiona Enter para enviar
          </p>
        </CardContent>
      </Card>

      {/* Info Card - Simplificada */}
      <Card className="border-none shadow-lg bg-blue-50 border-l-4 border-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-slate-700">
                <strong>Chat grupal:</strong> Todos los padres de {selectedGroup?.deporte} - {selectedGroup?.categoria} pueden participar • 
                Horario: 10:00-20:00 • Los mensajes importantes se notifican por email
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}