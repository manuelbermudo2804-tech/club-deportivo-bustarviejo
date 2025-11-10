import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Users, Clock, AlertCircle, AlertTriangle, Info } from "lucide-react";
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
        p.email_padre === currentUser?.email
      );
    },
    enabled: !!currentUser?.email,
    initialData: [],
  });

  const { data: allMessages, isLoading: loadingMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 5000,
  });

  // Crear grupos y asignar mensajes
  useEffect(() => {
    if (players.length > 0) {
      const groups = {};
      
      // Crear grupos basados en jugadores
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

      // Agregar TODOS los mensajes del grupo
      allMessages.forEach(msg => {
        if (!msg.deporte || !msg.categoria) return;
        
        const groupId = `${msg.deporte}_${msg.categoria}`;
        
        if (groups[groupId]) {
          groups[groupId].messages.push(msg);
          
          // Contar no leídos de admin
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
      
      // Seleccionar grupo
      if (groupsList.length > 0) {
        if (!selectedGroup) {
          setSelectedGroup(groupsList[0]);
        } else {
          const updatedGroup = groupsList.find(g => g.id === selectedGroup.id);
          if (updatedGroup) {
            setSelectedGroup(updatedGroup);
          }
        }
      }
    }
  }, [players, allMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.ChatMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setMessageText("");
      toast.success("Mensaje enviado");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, messageData }) => base44.entities.ChatMessage.update(id, messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  const isWithinBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 20;
  };

  useEffect(() => {
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
  }, [selectedGroup?.id]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !currentUser || !selectedGroup) return;

    if (!isWithinBusinessHours()) {
      toast.error("Chat disponible de 10:00 a 20:00");
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

  if (loadingMessages) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (myGroups.length === 0 && players.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Chat del Club</h1>
        <Card className="border-none shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-orange-400 mb-4" />
            <p className="text-slate-600 text-lg mb-2">No tienes jugadores registrados</p>
            <p className="text-slate-500 text-sm">Registra a tus jugadores para acceder al chat</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUnread = myGroups.reduce((sum, group) => sum + group.unreadCount, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chat del Grupo</h1>
          <p className="text-slate-600 mt-1">Comunícate con el club</p>
        </div>
        {totalUnread > 0 && (
          <Badge className="bg-orange-500 text-white text-lg px-4 py-2">
            {totalUnread} nuevos
          </Badge>
        )}
      </div>

      <Card className={`border-none shadow-lg ${isWithinBusinessHours() ? 'bg-green-50' : 'bg-orange-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Clock className={`w-5 h-5 ${isWithinBusinessHours() ? 'text-green-600' : 'text-orange-600'}`} />
            <div>
              <p className="font-medium text-slate-900">
                {isWithinBusinessHours() ? '🟢 Chat Activo' : '🟠 Fuera de Horario'}
              </p>
              <p className="text-sm text-slate-600">
                Horario: 10:00 - 20:00
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {myGroups.length > 1 ? (
        <Tabs value={selectedGroup?.id} onValueChange={(value) => {
          const group = myGroups.find(g => g.id === value);
          setSelectedGroup(group);
        }}>
          <TabsList className="bg-white border">
            {myGroups.map(group => (
              <TabsTrigger key={group.id} value={group.id}>
                <span className="mr-2">{deporteEmojis[group.deporte]}</span>
                {group.categoria}
                {group.unreadCount > 0 && (
                  <Badge className="ml-2 bg-orange-500 text-white h-5 px-1.5 text-xs">
                    {group.unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : selectedGroup && (
        <Card className="border-none shadow-lg bg-gradient-to-r from-orange-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center text-2xl">
                {deporteEmojis[selectedGroup.deporte]}
              </div>
              <div>
                <p className="font-bold text-slate-900">{selectedGroup.deporte}</p>
                <p className="text-sm text-slate-600">{selectedGroup.categoria}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-orange-600" />
            <div>
              <CardTitle className="text-lg">
                {selectedGroup?.deporte} - {selectedGroup?.categoria}
              </CardTitle>
              <p className="text-sm text-slate-500">
                {selectedGroup?.messages?.length || 0} mensajes
              </p>
            </div>
          </div>
        </CardHeader>

        <div className="p-6 space-y-4 min-h-[400px] max-h-[600px] overflow-y-auto">
          {!selectedGroup || selectedGroup.messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg mb-2">No hay mensajes</p>
              <p className="text-slate-400 text-sm">Sé el primero en escribir</p>
            </div>
          ) : (
            selectedGroup.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.tipo === "padre_a_grupo" && msg.remitente_email === currentUser?.email
                    ? 'justify-end' 
                    : 'justify-start'
                }`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.tipo === "padre_a_grupo" && msg.remitente_email === currentUser?.email
                    ? 'bg-orange-600 text-white' 
                    : msg.tipo === "admin_a_grupo"
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                }`}>
                  <p className="text-xs font-medium opacity-70 mb-1">
                    {msg.tipo === "admin_a_grupo" ? "👤 Club" : msg.remitente_nombre}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                  <p className={`text-xs mt-2 ${
                    msg.tipo === "padre_a_grupo" && msg.remitente_email === currentUser?.email || msg.tipo === "admin_a_grupo"
                      ? 'text-white/70' 
                      : 'text-slate-500'
                  }`}>
                    {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <CardContent className="border-t border-slate-100 p-4">
          {!isWithinBusinessHours() && (
            <div className="mb-3 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
              <p className="text-sm text-orange-800">
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
              rows={2}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || !isWithinBusinessHours()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <p className="text-sm text-slate-700">
              <strong>Chat grupal:</strong> Todos los padres de {selectedGroup?.deporte} - {selectedGroup?.categoria} participan. 
              Horario: 10:00-20:00.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}