import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, User, MessageCircle, Shield, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedChatNotificationStore } from "../components/notifications/UnifiedChatNotificationStore";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";

export default function ParentDirectMessages() {
  const [user, setUser] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: allMessages } = useQuery({
    queryKey: ['directMessages'],
    queryFn: () => base44.entities.DirectMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 3000,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.DirectMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages'] });
      setMessageInput("");
      setAttachments([]);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, messageData }) => base44.entities.DirectMessage.update(id, messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages'] });
    },
  });

  useEffect(() => {
    if (selectedContact && user) {
      const unreadMessages = allMessages.filter(
        m => m.remitente_email === selectedContact.email &&
             m.destinatario_email === user.email &&
             !m.leido
      );

      unreadMessages.forEach(msg => {
        markAsReadMutation.mutate({
          id: msg.id,
          messageData: { ...msg, leido: true, fecha_lectura: new Date().toISOString() }
        });
      });

      // Marcar AppNotifications (DM) como vistas y limpiar burbuja inmediata
      (async () => {
        try {
          const notifs = await base44.entities.AppNotification.filter({ usuario_email: user.email, enlace: 'ParentDirectMessages', vista: false });
          for (const n of notifs) {
            await base44.entities.AppNotification.update(n.id, { vista: true, fecha_vista: new Date().toISOString() });
          }
        } catch {}
        UnifiedChatNotificationStore.clearChatOnly(user.email, 'private');
        // Sincronizar contador global (ChatCounter) usando email del contacto como ID estable
        try { await base44.functions.invoke('chatMarkRead', { chatType: 'private', conversationId: `dm:${selectedContact.email}` }); } catch {}
      })();
    }
  }, [selectedContact, user, allMessages]);

  if (!user) return null;

  // Get available contacts (admins and coaches)
  const contacts = users.filter(u => 
    u.email !== user.email && (u.role === "admin" || u.es_entrenador)
  ).map(u => ({
    email: u.email,
    nombre: u.full_name,
    rol: u.role === "admin" ? "admin" : "coach"
  }));

  // Filter by tab
  const filteredContacts = activeTab === "all" ? contacts :
    activeTab === "admins" ? contacts.filter(c => c.rol === "admin") :
    contacts.filter(c => c.rol === "coach");

  // Auto-select first contact if none selected
  useEffect(() => {
    if (!selectedContact && filteredContacts.length > 0) {
      setSelectedContact(filteredContacts[0]);
    }
  }, [filteredContacts.length]);

  // Get unread count per contact
  const getUnreadCount = (contactEmail) => {
    return allMessages.filter(
      m => m.remitente_email === contactEmail &&
           m.destinatario_email === user.email &&
           !m.leido
    ).length;
  };

  // Get conversation with selected contact
  const conversation = selectedContact
    ? allMessages.filter(
        m => (m.remitente_email === user.email && m.destinatario_email === selectedContact.email) ||
             (m.remitente_email === selectedContact.email && m.destinatario_email === user.email)
      ).sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  const handleSendMessage = () => {
    if ((!messageInput.trim() && attachments.length === 0) || !selectedContact) return;

    sendMessageMutation.mutate({
      remitente_email: user.email,
      remitente_nombre: user.full_name,
      remitente_rol: "parent",
      destinatario_email: selectedContact.email,
      destinatario_nombre: selectedContact.nombre,
      destinatario_rol: selectedContact.rol,
      mensaje: messageInput || "(archivo adjunto)",
      leido: false,
      archivos_adjuntos: attachments
    });
  };

  const handleFileUploaded = (attachment) => {
    setAttachments([...attachments, attachment]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const totalUnread = contacts.reduce((sum, contact) => sum + getUnreadCount(contact.email), 0);

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Mensajes Directos</h1>
          {totalUnread > 0 && (
            <Badge className="bg-red-500 text-white">
              {totalUnread}
            </Badge>
          )}
        </div>
        <p className="text-slate-600 text-sm">Comunícate con entrenadores y administradores</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Contacts sidebar */}
        <Card className="lg:col-span-1 border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Contactos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-2 mx-4">
                <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                <TabsTrigger value="admins" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </TabsTrigger>
                <TabsTrigger value="coaches" className="text-xs">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Entren.
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-1 px-2 pb-2 max-h-[500px] overflow-y-auto">
              {filteredContacts.map((contact) => {
                const unreadCount = getUnreadCount(contact.email);
                return (
                  <button
                    key={contact.email}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedContact?.email === contact.email
                        ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-2 border-orange-500 shadow-md'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          contact.rol === "admin" ? "bg-orange-600" : "bg-blue-600"
                        }`}>
                          {contact.rol === "admin" ? <Shield className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{contact.nombre}</p>
                          <p className="text-xs text-slate-600 capitalize">
                            {contact.rol === "admin" ? "Administrador" : "Entrenador"}
                          </p>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white ml-2">{unreadCount}</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Messages area */}
        <Card className="lg:col-span-3 border-none shadow-lg">
          {selectedContact ? (
            <>
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    selectedContact.rol === "admin" ? "bg-orange-600" : "bg-blue-600"
                  }`}>
                    {selectedContact.rol === "admin" ? <Shield className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedContact.nombre}</h3>
                    <p className="text-sm text-slate-600">
                      {selectedContact.rol === "admin" ? "Administrador del Club" : "Entrenador"}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="h-[450px] overflow-y-auto p-4 space-y-3 bg-slate-50">
                  <AnimatePresence>
                    {conversation.map((msg) => {
                      const isMe = msg.remitente_email === user.email;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                              msg.remitente_rol === "admin" ? "bg-orange-600" : "bg-blue-600"
                            }`}>
                              {msg.remitente_rol === "admin" ? <Shield className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                            </div>
                          )}
                          <div className={`max-w-[70%] ${isMe ? '' : 'flex-1'}`}>
                            <div className={`rounded-2xl px-4 py-2 ${
                              isMe
                                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white'
                                : 'bg-white border border-slate-200 text-slate-900'
                            }`}>
                              {!isMe && (
                                <p className={`text-xs font-semibold mb-1 ${isMe ? 'text-orange-100' : 'text-slate-600'}`}>
                                  {msg.remitente_nombre}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.mensaje}</p>
                              {msg.archivos_adjuntos && msg.archivos_adjuntos.length > 0 && (
                                <MessageAttachments attachments={msg.archivos_adjuntos} />
                              )}
                              <p className={`text-xs mt-1 ${isMe ? 'text-orange-100' : 'text-slate-500'}`}>
                                {format(new Date(msg.created_date), "dd MMM HH:mm", { locale: es })}
                              </p>
                            </div>
                          </div>
                          {isMe && (
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white flex-shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div className="p-4 border-t bg-white">
                  {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-xs">
                          <span className="truncate max-w-[150px]">{att.nombre}</span>
                          <button
                            onClick={() => handleRemoveAttachment(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <FileAttachmentButton
                      onFileUploaded={handleFileUploaded}
                      disabled={sendMessageMutation.isPending}
                    />
                    <Input
                      placeholder="Escribe tu mensaje..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={(!messageInput.trim() && attachments.length === 0) || sendMessageMutation.isPending}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="h-[600px] flex items-center justify-center text-center p-8">
              <div>
                <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Mensajería Directa</h3>
                <p className="text-slate-600">Selecciona un contacto para comenzar a chatear</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}