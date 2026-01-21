import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, ArrowLeft, MessageCircle, User, Shield } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";
import EmojiPicker from "../components/chat/EmojiPicker";
import ChatActionMenu from "../components/chat/ChatActionMenu";

export default function DirectMessages() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

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

  const { data: messages } = useQuery({
    queryKey: ['directMessages'],
    queryFn: () => base44.entities.DirectMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 3000,
  });

  const { data: users } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const newMessage = await base44.entities.DirectMessage.create(messageData);
      
      // Enviar email de notificación
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo - Mensajes",
        to: messageData.destinatario_email,
        subject: `💬 Nuevo mensaje de ${messageData.remitente_nombre}`,
        body: `
          <h2>Tienes un nuevo mensaje directo</h2>
          <p><strong>De:</strong> ${messageData.remitente_nombre}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${messageData.mensaje}</p>
          <br>
          <p>Accede a la aplicación para responder.</p>
        `
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages'] });
      setMensaje("");
      setAttachments([]);
      toast.success("Mensaje enviado");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      const promises = messageIds.map(id => 
        base44.entities.DirectMessage.update(id, { leido: true })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages'] });
    },
  });

  // Agrupar mensajes por conversación
  const conversations = React.useMemo(() => {
    if (!user) return [];

    const conversationMap = new Map();

    messages.forEach(msg => {
      const isFromMe = msg.remitente_email === user.email;
      const otherUserEmail = isFromMe ? msg.destinatario_email : msg.remitente_email;
      const otherUserName = isFromMe ? msg.destinatario_nombre : msg.remitente_nombre;
      const otherUserRole = isFromMe ? msg.destinatario_rol : msg.remitente_rol;

      if (!conversationMap.has(msg.conversacion_id)) {
        conversationMap.set(msg.conversacion_id, {
          conversacion_id: msg.conversacion_id,
          otherUserEmail,
          otherUserName,
          otherUserRole,
          messages: [],
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      const conversation = conversationMap.get(msg.conversacion_id);
      conversation.messages.push(msg);
      
      if (!isFromMe && !msg.leido) {
        conversation.unreadCount++;
      }

      if (new Date(msg.created_date) > new Date(conversation.lastMessage.created_date)) {
        conversation.lastMessage = msg;
      }
    });

    return Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
    );
  }, [messages, user]);

  // Obtener administradores y entrenadores disponibles
  const availableContacts = React.useMemo(() => {
    if (!user) return [];
    
    return users.filter(u => 
      u.email !== user.email && 
      (u.role === "admin" || u.es_entrenador === true)
    ).map(u => ({
      email: u.email,
      name: u.full_name,
      role: u.role === "admin" ? "admin" : "entrenador",
      hasConversation: conversations.some(c => c.otherUserEmail === u.email)
    }));
  }, [users, user, conversations]);

  const selectedMessages = selectedConversation 
    ? conversations.find(c => c.conversacion_id === selectedConversation)?.messages.sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      ) || []
    : [];

  const selectedContact = selectedConversation 
    ? conversations.find(c => c.conversacion_id === selectedConversation)
    : null;

  useEffect(() => {
    if (selectedConversation && selectedMessages.length > 0) {
      const unreadMessages = selectedMessages.filter(
        m => m.destinatario_email === user?.email && !m.leido
      );
      if (unreadMessages.length > 0) {
        markAsReadMutation.mutate(unreadMessages.map(m => m.id));
      }
    }
  }, [selectedConversation, selectedMessages.length]);

  const handleSendMessage = () => {
    if (!mensaje.trim() && attachments.length === 0) return;

    const contact = selectedContact;
    if (!contact) return;

    const conversacionId = selectedConversation || `${user.email}_${contact.otherUserEmail}_${Date.now()}`;

    sendMessageMutation.mutate({
      conversacion_id: conversacionId,
      remitente_email: user.email,
      remitente_nombre: user.full_name,
      remitente_rol: "padre",
      destinatario_email: contact.otherUserEmail,
      destinatario_nombre: contact.otherUserName,
      destinatario_rol: contact.otherUserRole,
      mensaje: mensaje,
      archivos_adjuntos: attachments,
    });
  };

  const startNewConversation = (contact) => {
    const existingConv = conversations.find(c => c.otherUserEmail === contact.email);
    if (existingConv) {
      setSelectedConversation(existingConv.conversacion_id);
    } else {
      const newConvId = `${user.email}_${contact.email}_${Date.now()}`;
      setSelectedConversation(newConvId);
      // Crear conversación temporal
      conversations.push({
        conversacion_id: newConvId,
        otherUserEmail: contact.email,
        otherUserName: contact.name,
        otherUserRole: contact.role,
        messages: [],
        unreadCount: 0,
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("ParentDashboard")}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">💬 Mensajes Directos</h1>
              <p className="text-sm text-orange-100">Chat con entrenadores y administradores</p>
            </div>
          </div>
          {totalUnread > 0 && (
            <Badge className="bg-red-500 text-white">
              {totalUnread} nuevo{totalUnread > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto p-4 flex gap-4">
          {/* Panel izquierdo: Conversaciones */}
          {(!isMobile || !selectedConversation) && (
            <Card className="w-full md:w-80 flex-shrink-0 shadow-xl border-none flex flex-col">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-lg">Conversaciones</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm mb-4">No tienes conversaciones</p>
                    <p className="text-xs text-slate-400">Inicia una nueva conversación abajo</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {conversations.map((conv) => (
                      <button
                        key={conv.conversacion_id}
                        onClick={() => setSelectedConversation(conv.conversacion_id)}
                        className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                          selectedConversation === conv.conversacion_id ? 'bg-orange-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              conv.otherUserRole === 'admin' ? 'bg-red-100' : 'bg-blue-100'
                            }`}>
                              {conv.otherUserRole === 'admin' ? (
                                <Shield className="w-5 h-5 text-red-600" />
                              ) : (
                                <User className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{conv.otherUserName}</p>
                              <p className="text-xs text-slate-500">
                                {conv.otherUserRole === 'admin' ? '🛡️ Admin' : '🎓 Entrenador'}
                              </p>
                            </div>
                          </div>
                          {conv.unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white text-xs">{conv.unreadCount}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 truncate">{conv.lastMessage.mensaje}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {format(new Date(conv.lastMessage.created_date), "dd/MM/yyyy HH:mm")}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Nuevas conversaciones */}
                <div className="border-t border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Nueva conversación:</p>
                  <div className="space-y-2">
                    {availableContacts.filter(c => !c.hasConversation).map(contact => (
                      <button
                        key={contact.email}
                        onClick={() => startNewConversation(contact)}
                        className="w-full p-2 text-left hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          contact.role === 'admin' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          {contact.role === 'admin' ? (
                            <Shield className="w-4 h-4 text-red-600" />
                          ) : (
                            <User className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{contact.name}</p>
                          <p className="text-xs text-slate-500">
                            {contact.role === 'admin' ? '🛡️ Admin' : '🎓 Entrenador'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Panel derecho: Chat */}
          {(!isMobile || selectedConversation) && (
            <Card className="flex-1 shadow-xl border-none flex flex-col">
              {selectedConversation ? (
                <>
                  <CardHeader className="border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      {isMobile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedConversation(null)}
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </Button>
                      )}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedContact?.otherUserRole === 'admin' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        {selectedContact?.otherUserRole === 'admin' ? (
                          <Shield className="w-6 h-6 text-red-600" />
                        ) : (
                          <User className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{selectedContact?.otherUserName}</h3>
                        <p className="text-sm text-slate-500">
                          {selectedContact?.otherUserRole === 'admin' ? '🛡️ Administrador' : '🎓 Entrenador'}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                    {selectedMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm">Escribe el primer mensaje</p>
                        </div>
                      </div>
                    ) : (
                      selectedMessages.map((msg) => {
                        const isFromMe = msg.remitente_email === user.email;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                isFromMe
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-900'
                              }`}
                            >
                              <p className="text-sm break-words">{msg.mensaje}</p>
                              {msg.archivos_adjuntos && msg.archivos_adjuntos.length > 0 && (
                                <MessageAttachments attachments={msg.archivos_adjuntos} />
                              )}
                              <p
                                className={`text-xs mt-1 ${
                                  isFromMe ? 'text-orange-200' : 'text-slate-400'
                                }`}
                              >
                                {format(new Date(msg.created_date), "HH:mm")}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </CardContent>

                  <div className="border-t border-slate-200 p-4">
                    <div className="flex items-end gap-2">
                      <EmojiPicker 
                        onEmojiSelect={(emoji) => setMensaje(prev => prev + emoji)}
                        messageText={mensaje}
                      />
                      
                      <div className="flex-1">
                        <Input
                          value={mensaje}
                          onChange={(e) => setMensaje(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Escribe tu mensaje..."
                          disabled={sendMessageMutation.isPending}
                          className="resize-none"
                        />
                        {attachments.length > 0 && (
                          <div className="mt-2">
                            <MessageAttachments attachments={attachments} />
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={(!mensaje.trim() && attachments.length === 0) || sendMessageMutation.isPending}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 text-lg font-semibold mb-2">
                      Selecciona una conversación
                    </p>
                    <p className="text-slate-400 text-sm">
                      O inicia una nueva con un entrenador o administrador
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}