
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";
import ContactCard from "../components/ContactCard";

export default function ParentChat() {
  const [messageContent, setMessageContent] = useState("");
  const [selectedTab, setSelectedTab] = useState(null);
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

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 3000,
  });

  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p =>
        p.email_padre === user?.email || p.email_tutor_2 === user?.email
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.ChatMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setMessageContent("");
      setAttachments([]);
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

  const myGroupIds = [...new Set(players.map(p => `${p.deporte}_${p.categoria}`))];

  const myGroups = myGroupIds.map(groupId => {
    const [deporte, categoria] = groupId.split('_');
    const groupMessages = messages.filter(msg => msg.grupo_id === groupId);
    const unreadCount = groupMessages.filter(msg =>
      !msg.leido && msg.tipo === "admin_a_grupo"
    ).length;
    const urgentCount = groupMessages.filter(msg =>
      !msg.leido && msg.tipo === "admin_a_grupo" && msg.prioridad === "Urgente"
    ).length;

    return {
      id: groupId,
      deporte,
      categoria,
      messages: groupMessages,
      unreadCount,
      urgentCount
    };
  });

  useEffect(() => {
    if (myGroups.length > 0 && !selectedTab) {
      setSelectedTab(myGroups[0].id);
    }
  }, [myGroups.length, selectedTab]);

  useEffect(() => {
    if (selectedTab) {
      const group = myGroups.find(g => g.id === selectedTab);
      if (group) {
        const unreadMessageIds = group.messages
          .filter(msg => !msg.leido && msg.tipo === "admin_a_grupo")
          .map(msg => msg.id);

        if (unreadMessageIds.length > 0) {
          markAsReadMutation.mutate(unreadMessageIds);
        }
      }
    }
  }, [selectedTab, messages, myGroups, markAsReadMutation]);

  const isBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 20;
  };

  const handleSendMessage = () => {
    if (!user || !selectedTab) return;
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje o adjunta un archivo");
      return;
    }

    if (!isBusinessHours()) {
      toast.error("Solo puedes enviar mensajes entre las 10:00 y las 20:00");
      return;
    }

    const [deporte, categoria] = selectedTab.split('_');

    const messageData = {
      remitente_email: user.email,
      remitente_nombre: user.full_name || "Padre/Tutor",
      mensaje: messageContent || "(Archivo adjunto)",
      prioridad: "Normal",
      tipo: "padre_a_grupo",
      deporte,
      categoria,
      grupo_id: selectedTab,
      leido: false,
      archivos_adjuntos: attachments
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleFileUploaded = (attachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  const sportEmojis = {
    "Fútbol Masculino": "⚽",
    "Fútbol Femenino": "⚽",
    "Baloncesto": "🏀"
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTab, messages]);

  const totalUnread = myGroups.reduce((sum, g) => sum + g.unreadCount, 0);
  const totalUrgent = myGroups.reduce((sum, g) => sum + g.urgentCount, 0);

  if (loadingPlayers || loadingMessages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Cargando chat...</p>
        </div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 text-lg">No tienes jugadores registrados</p>
            <p className="text-sm text-slate-400 mt-2">Registra un jugador para acceder al chat del grupo</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (myGroups.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 text-lg">No hay grupos disponibles</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Chat del Grupo</h1>
          <div className="flex gap-2">
            {totalUrgent > 0 && (
              <Badge className="bg-red-500 text-white shadow-lg animate-pulse">
                🔴 {totalUrgent} Urgentes
              </Badge>
            )}
            {totalUnread > 0 && (
              <Badge className="bg-white text-orange-700 shadow-lg">
                {totalUnread} No leídos
              </Badge>
            )}
          </div>
        </div>
        <p className="text-orange-100 text-sm">
          Comunícate con el club sobre tus jugadores
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

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden p-6">
        <Card className="h-full flex flex-col">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start border-b rounded-none bg-slate-50 p-0 h-auto">
              {myGroups.map(group => (
                <TabsTrigger
                  key={group.id}
                  value={group.id}
                  className="relative data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none px-6 py-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{sportEmojis[group.deporte]}</span>
                    <div className="text-left">
                      <div className="font-semibold">{group.categoria}</div>
                      <div className="text-xs text-slate-600">{group.deporte}</div>
                    </div>
                    {group.urgentCount > 0 && (
                      <Badge className="ml-2 bg-red-500 text-white text-xs animate-pulse">
                        🔴 {group.urgentCount}
                      </Badge>
                    )}
                    {group.unreadCount > 0 && !group.urgentCount && (
                      <Badge className="ml-2 bg-green-500 text-white text-xs">
                        {group.unreadCount}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {myGroups.map(group => (
              <TabsContent key={group.id} value={group.id} className="flex-1 flex flex-col mt-0 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                  {group.messages
                    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.tipo === "padre_a_grupo" ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md p-3 rounded-lg ${
                            msg.tipo === "padre_a_grupo"
                              ? 'bg-green-600 text-white'
                              : 'bg-white border border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold">
                              {msg.remitente_nombre}
                            </span>
                            {msg.prioridad !== "Normal" && (
                              <span className={priorityColors[msg.prioridad]}>
                                {priorityIcons[msg.prioridad]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>

                          {/* Attachments */}
                          {msg.archivos_adjuntos && msg.archivos_adjuntos.length > 0 && (
                            <MessageAttachments attachments={msg.archivos_adjuntos} />
                          )}

                          <p className={`text-xs mt-1 ${msg.tipo === "padre_a_grupo" ? 'text-green-100' : 'text-slate-500'}`}>
                            {new Date(msg.created_date).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-slate-200 p-4 bg-white">
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

                  <div className="flex gap-2">
                    <FileAttachmentButton
                      onFileUploaded={handleFileUploaded}
                      disabled={!isBusinessHours() || sendMessageMutation.isPending}
                    />

                    <Textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Escribe tu mensaje al club..."
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
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </div>

      <div className="px-6 pb-6">
        <ContactCard />
      </div>
    </div>
  );
}
