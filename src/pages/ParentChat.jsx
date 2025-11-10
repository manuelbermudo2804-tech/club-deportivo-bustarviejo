import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, CheckCheck, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ParentChat() {
  const [messageText, setMessageText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: messages, refetch } = useQuery({
    queryKey: ['myMessages', currentUser?.email],
    queryFn: async () => {
      const allMessages = await base44.entities.ChatMessage.list('-created_date');
      return allMessages.filter(msg => 
        msg.remitente_email === currentUser?.email || 
        msg.destinatario_email === currentUser?.email
      ).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!currentUser?.email,
    initialData: [],
    refetchInterval: 5000, // Actualizar cada 5 segundos
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.ChatMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMessages'] });
      setMessageText("");
      toast.success("Mensaje enviado al administrador");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, messageData }) => base44.entities.ChatMessage.update(id, messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMessages'] });
    },
  });

  useEffect(() => {
    // Marcar mensajes del admin como leídos
    if (messages && currentUser) {
      messages.forEach(msg => {
        if (!msg.leido && msg.tipo === "admin_a_padre" && msg.destinatario_email === currentUser.email) {
          markAsReadMutation.mutate({
            id: msg.id,
            messageData: { ...msg, leido: true }
          });
        }
      });
    }
  }, [messages, currentUser]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !currentUser) return;

    const conversationId = messages[0]?.conversacion_id || `conv_${currentUser.email}_${Date.now()}`;

    sendMessageMutation.mutate({
      remitente_email: currentUser.email,
      remitente_nombre: currentUser.full_name,
      destinatario_email: "admin",
      destinatario_nombre: "Administración",
      mensaje: messageText,
      tipo: "padre_a_admin",
      conversacion_id: conversationId,
      leido: false
    });
  };

  const unreadCount = messages.filter(msg => 
    !msg.leido && msg.tipo === "admin_a_padre" && msg.destinatario_email === currentUser?.email
  ).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chat con Administración</h1>
          <p className="text-slate-600 mt-1">Comunícate directamente con el club</p>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-orange-600 text-white text-lg px-4 py-2">
            {unreadCount} nuevo{unreadCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <Card className="border-none shadow-lg h-[calc(100vh-250px)] flex flex-col">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Administración del Club</CardTitle>
              <p className="text-sm text-slate-500">CF Bustarviejo</p>
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg mb-2">No hay mensajes aún</p>
              <p className="text-slate-400 text-sm">Inicia la conversación escribiendo un mensaje</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.tipo === "padre_a_admin" ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${
                    msg.tipo === "padre_a_admin" 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-slate-100 text-slate-900'
                  } rounded-2xl px-4 py-3 shadow-sm`}>
                    {msg.tipo === "admin_a_padre" && (
                      <p className="text-xs font-medium mb-1 text-orange-600">Administración</p>
                    )}
                    <p className="text-sm">{msg.mensaje}</p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <p className={`text-xs ${
                        msg.tipo === "padre_a_admin" ? 'text-orange-200' : 'text-slate-500'
                      }`}>
                        {format(new Date(msg.created_date), "HH:mm - d 'de' MMM", { locale: es })}
                      </p>
                      {msg.tipo === "padre_a_admin" && (
                        <CheckCheck className={`w-4 h-4 ${msg.leido ? 'text-blue-300' : 'text-orange-300'}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <CardContent className="border-t border-slate-100 p-4">
          <div className="flex gap-3">
            <Textarea
              placeholder="Escribe tu mensaje al club..."
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
          <p className="text-xs text-slate-500 mt-2">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg bg-orange-50 border-l-4 border-orange-500">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-slate-900 mb-1">💬 Consejos del Chat:</p>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>• Usa este chat para consultas rápidas sobre pagos, eventos o jugadores</li>
                <li>• El administrador responderá lo antes posible</li>
                <li>• Para temas urgentes, también puedes llamar al club</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}