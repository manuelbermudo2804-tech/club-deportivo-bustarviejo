import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Search, User, Clock, CheckCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AdminChat() {
  const [selectedConversation, setSelectedConversation] = useState(null);
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

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 5000, // Actualizar cada 5 segundos
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

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

  // Agrupar mensajes por conversación (por email del padre)
  const conversations = {};
  messages.forEach(msg => {
    const parentEmail = msg.tipo === "padre_a_admin" ? msg.remitente_email : msg.destinatario_email;
    if (!conversations[parentEmail]) {
      conversations[parentEmail] = {
        email: parentEmail,
        nombre: msg.tipo === "padre_a_admin" ? msg.remitente_nombre : msg.destinatario_nombre,
        messages: [],
        unreadCount: 0,
        lastMessage: null
      };
    }
    conversations[parentEmail].messages.push(msg);
    if (!msg.leido && msg.tipo === "padre_a_admin") {
      conversations[parentEmail].unreadCount++;
    }
    if (!conversations[parentEmail].lastMessage || 
        new Date(msg.created_date) > new Date(conversations[parentEmail].lastMessage.created_date)) {
      conversations[parentEmail].lastMessage = msg;
    }
  });

  const conversationsList = Object.values(conversations).sort((a, b) => 
    new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
  );

  const filteredConversations = conversationsList.filter(conv =>
    conv.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation || !currentUser) return;

    const conversationId = selectedConversation.messages[0]?.conversacion_id || 
      `conv_${selectedConversation.email}_${Date.now()}`;

    sendMessageMutation.mutate({
      remitente_email: currentUser.email,
      remitente_nombre: currentUser.full_name,
      destinatario_email: selectedConversation.email,
      destinatario_nombre: selectedConversation.nombre,
      mensaje: messageText,
      tipo: "admin_a_padre",
      conversacion_id: conversationId,
      leido: false
    });
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    
    // Marcar mensajes no leídos como leídos
    conversation.messages.forEach(msg => {
      if (!msg.leido && msg.tipo === "padre_a_admin") {
        markAsReadMutation.mutate({
          id: msg.id,
          messageData: { ...msg, leido: true }
        });
      }
    });
  };

  const totalUnread = conversationsList.reduce((sum, conv) => sum + conv.unreadCount, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chat con Padres</h1>
          <p className="text-slate-600 mt-1">Comunicación directa con las familias</p>
        </div>
        {totalUnread > 0 && (
          <Badge className="bg-red-500 text-white text-lg px-4 py-2">
            {totalUnread} sin leer
          </Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Lista de Conversaciones */}
        <Card className="border-none shadow-lg lg:col-span-1">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-orange-600" />
              Conversaciones
            </CardTitle>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-140px)]">
            <CardContent className="p-0">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay conversaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.email}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full p-4 hover:bg-slate-50 transition-colors text-left ${
                        selectedConversation?.email === conv.email ? 'bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${conv.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                              {conv.nombre}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{conv.email}</p>
                            <p className="text-sm text-slate-600 truncate mt-1">
                              {conv.lastMessage?.mensaje}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <p className="text-xs text-slate-400">
                            {format(new Date(conv.lastMessage.created_date), 'HH:mm')}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge className="bg-orange-600 text-white h-5 w-5 flex items-center justify-center p-0 text-xs">
                              {conv.unreadCount}
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
          {!selectedConversation ? (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Selecciona una conversación</p>
                <p className="text-slate-400 text-sm mt-2">Elige un padre para ver los mensajes</p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selectedConversation.nombre}</CardTitle>
                    <p className="text-sm text-slate-500">{selectedConversation.email}</p>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {selectedConversation.messages
                    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.tipo === "admin_a_padre" ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${
                          msg.tipo === "admin_a_padre" 
                            ? 'bg-orange-600 text-white' 
                            : 'bg-slate-100 text-slate-900'
                        } rounded-2xl px-4 py-3 shadow-sm`}>
                          <p className="text-sm">{msg.mensaje}</p>
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <p className={`text-xs ${
                              msg.tipo === "admin_a_padre" ? 'text-orange-200' : 'text-slate-500'
                            }`}>
                              {format(new Date(msg.created_date), "HH:mm - d 'de' MMM", { locale: es })}
                            </p>
                            {msg.tipo === "admin_a_padre" && (
                              <CheckCheck className={`w-4 h-4 ${msg.leido ? 'text-blue-300' : 'text-orange-300'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>

              <CardContent className="border-t border-slate-100 p-4">
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Escribe tu mensaje..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
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
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
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