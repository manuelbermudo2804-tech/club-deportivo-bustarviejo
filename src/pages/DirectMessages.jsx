import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Send, User, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function DirectMessages() {
  const [user, setUser] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef(null);

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

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    enabled: user?.role === "admin",
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.DirectMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages'] });
      setMessageInput("");
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
    }
  }, [selectedContact, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, selectedContact]);

  if (!user) return null;

  // Get potential contacts
  const getPotentialContacts = () => {
    const contacts = [];
    
    if (user.role === "admin") {
      // Admin can message everyone
      players.forEach(p => {
        if (p.email_padre && p.email_padre !== user.email) {
          contacts.push({
            email: p.email_padre,
            nombre: `${p.nombre} (Padre/Madre)`,
            rol: "parent"
          });
        }
      });
      
      users.forEach(u => {
        if (u.email !== user.email && u.es_entrenador) {
          contacts.push({
            email: u.email,
            nombre: `${u.full_name} (Entrenador)`,
            rol: "coach"
          });
        }
      });
    } else if (user.es_entrenador) {
      // Coach can message admins and parents of their players
      const myPlayers = players.filter(p => p.deporte && user.categorias_entrena?.includes(p.deporte));
      
      myPlayers.forEach(p => {
        if (p.email_padre && p.email_padre !== user.email) {
          contacts.push({
            email: p.email_padre,
            nombre: `${p.nombre} (Padre/Madre)`,
            rol: "parent"
          });
        }
      });
      
      users.forEach(u => {
        if (u.role === "admin") {
          contacts.push({
            email: u.email,
            nombre: `${u.full_name} (Admin)`,
            rol: "admin"
          });
        }
      });
    } else {
      // Parents can message admins and coaches
      users.forEach(u => {
        if (u.role === "admin") {
          contacts.push({
            email: u.email,
            nombre: `${u.full_name} (Admin)`,
            rol: "admin"
          });
        } else if (u.es_entrenador) {
          contacts.push({
            email: u.email,
            nombre: `${u.full_name} (Entrenador)`,
            rol: "coach"
          });
        }
      });
    }

    // Remove duplicates
    const uniqueContacts = contacts.filter((contact, index, self) =>
      index === self.findIndex((c) => c.email === contact.email)
    );

    return uniqueContacts;
  };

  const contacts = getPotentialContacts();
  
  // Get unread count per contact
  const getUnreadCount = (contactEmail) => {
    return allMessages.filter(
      m => m.remitente_email === contactEmail &&
           m.destinatario_email === user.email &&
           !m.leido
    ).length;
  };

  // Filter contacts by search
  const filteredContacts = contacts.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get conversation with selected contact
  const conversation = selectedContact
    ? allMessages.filter(
        m => (m.remitente_email === user.email && m.destinatario_email === selectedContact.email) ||
             (m.remitente_email === selectedContact.email && m.destinatario_email === user.email)
      ).sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedContact) return;

    sendMessageMutation.mutate({
      remitente_email: user.email,
      remitente_nombre: user.full_name,
      remitente_rol: user.role === "admin" ? "admin" : user.es_entrenador ? "coach" : "parent",
      destinatario_email: selectedContact.email,
      destinatario_nombre: selectedContact.nombre,
      destinatario_rol: selectedContact.rol,
      mensaje: messageInput,
      leido: false,
      archivos_adjuntos: []
    });
  };

  return (
    <div className="h-[calc(100vh-2rem)] p-6 lg:p-8">
      <div className="h-full flex gap-4">
        {/* Contacts sidebar */}
        <Card className="w-80 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold mb-3">Mensajes Directos</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar contacto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredContacts.map((contact) => {
              const unreadCount = getUnreadCount(contact.email);
              return (
                <button
                  key={contact.email}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedContact?.email === contact.email
                      ? 'bg-orange-100 border-2 border-orange-600'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
                        {contact.nombre[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{contact.nombre}</p>
                        <p className="text-xs text-slate-600 capitalize">{contact.rol}</p>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Messages area */}
        <Card className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              <div className="p-4 border-b bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-lg">
                    {selectedContact.nombre[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedContact.nombre}</h3>
                    <p className="text-sm text-slate-600 capitalize">{selectedContact.rol}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversation.map((msg) => {
                  const isMe = msg.remitente_email === user.email;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isMe
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-900'
                      }`}>
                        <p className="text-sm">{msg.mensaje}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-orange-100' : 'text-slate-500'}`}>
                          {new Date(msg.created_date).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t bg-slate-50">
                <div className="flex gap-2">
                  <Input
                    placeholder="Escribe un mensaje..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
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