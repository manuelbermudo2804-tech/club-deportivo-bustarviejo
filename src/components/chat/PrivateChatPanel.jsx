import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, X, ArrowLeft, MessageCircle, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import FileAttachmentButton from "./FileAttachmentButton";
import MessageAttachments from "./MessageAttachments";

export default function PrivateChatPanel({ 
  conversation, 
  messages, 
  user,
  onClose, 
  onMessageSent,
  isStaff = true 
}) {
  const [messageContent, setMessageContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Marcar mensajes como leídos
  useEffect(() => {
    if (!conversation || !messages || !user) return;
    
    const unreadMessages = messages.filter(msg => 
      !msg.leido && msg.remitente_email !== user.email
    );
    
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(msg => {
        base44.entities.PrivateMessage.update(msg.id, { leido: true });
      });
      
      // Actualizar contador en conversación
      const updateData = isStaff 
        ? { no_leidos_staff: 0 }
        : { no_leidos_familia: 0 };
      base44.entities.PrivateConversation.update(conversation.id, updateData);
    }
  }, [conversation?.id, messages?.length, user?.email, isStaff]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const newMessage = await base44.entities.PrivateMessage.create(messageData);
      
      // Actualizar conversación
      const updateConv = {
        ultimo_mensaje: messageData.mensaje.substring(0, 100),
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_de: isStaff ? "staff" : "familia",
        [isStaff ? "no_leidos_familia" : "no_leidos_staff"]: (conversation[isStaff ? "no_leidos_familia" : "no_leidos_staff"] || 0) + 1
      };
      await base44.entities.PrivateConversation.update(conversation.id, updateConv);
      
      return newMessage;
    },
    onSuccess: () => {
      setMessageContent("");
      setAttachments([]);
      onMessageSent?.();
      toast.success("Mensaje enviado");
    },
  });

  const handleSendMessage = () => {
    if (!messageContent.trim() && attachments.length === 0) return;

    sendMessageMutation.mutate({
      conversacion_id: conversation.id,
      remitente_email: user.email,
      remitente_nombre: user.full_name,
      remitente_tipo: isStaff ? "staff" : "familia",
      mensaje: messageContent || "(Archivo adjunto)",
      leido: false,
      archivos_adjuntos: attachments
    });
  };

  const otherParticipant = isStaff 
    ? { nombre: conversation.participante_familia_nombre, email: conversation.participante_familia_email }
    : { nombre: conversation.participante_staff_nombre, email: conversation.participante_staff_email };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className={`p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0 ${
        conversation.categoria === "Coordinación Deportiva" 
          ? "bg-gradient-to-r from-green-600 to-green-700" 
          : "bg-gradient-to-r from-blue-600 to-blue-700"
      }`}>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          {conversation.categoria === "Coordinación Deportiva" ? (
            <span className="text-xl">🎓</span>
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base truncate">
            {conversation.categoria === "Coordinación Deportiva" 
              ? "Coordinación Deportiva" 
              : otherParticipant.nombre}
          </h2>
          <p className={`text-xs truncate ${
            conversation.categoria === "Coordinación Deportiva" ? "text-green-100" : "text-blue-100"
          }`}>
            {conversation.categoria === "Coordinación Deportiva" 
              ? "📢 Tu mensaje llegará a TODAS las familias del club" 
              : `${conversation.categoria} • Chat privado`}
          </p>
        </div>
        {conversation.jugadores_relacionados?.length > 0 && conversation.categoria !== "Coordinación Deportiva" && (
          <Badge className="bg-white/20 text-white text-xs">
            {conversation.jugadores_relacionados.map(j => j.jugador_nombre).join(", ")}
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#e5ddd5'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500 bg-white/80 rounded-xl p-6">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Inicia la conversación</p>
              <p className="text-xs text-slate-400 mt-1">Los mensajes son privados</p>
            </div>
          </div>
        ) : (
          messages
            .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
            .map((msg) => {
              const isMyMessage = msg.remitente_email === user?.email;
              
              return (
                <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className={`max-w-[85%] rounded-lg shadow-sm overflow-hidden ${
                    isMyMessage
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-none'
                      : 'bg-white text-slate-900 rounded-bl-none'
                  }`}>
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${isMyMessage ? 'text-blue-100' : 'text-slate-600'}`}>
                          {msg.remitente_nombre}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed break-words">{msg.mensaje}</p>
                      
                      {msg.archivos_adjuntos?.length > 0 && (
                        <div className="mt-2">
                          <MessageAttachments attachments={msg.archivos_adjuntos} />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`text-[10px] ${isMyMessage ? 'text-blue-100' : 'text-slate-500'}`}>
                          {format(new Date(msg.created_date), "HH:mm")}
                        </span>
                        {isMyMessage && msg.leido && (
                          <span className="text-[10px] text-blue-100">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-3 flex-shrink-0">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att, index) => (
              <div key={index} className="bg-slate-100 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                <span className="text-xs truncate max-w-[150px]">{att.nombre}</span>
                <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))} className="text-slate-500 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <FileAttachmentButton
            onFileUploaded={(att) => setAttachments(prev => [...prev, att])}
            disabled={sendMessageMutation.isPending}
          />
          
          <Input
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Escribe un mensaje privado..."
            className="flex-1 rounded-full"
            disabled={sendMessageMutation.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={(!messageContent.trim() && attachments.length === 0) || sendMessageMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Dialog wrapper para abrir chat privado rápido
export function PrivateChatDialog({ open, onOpenChange, conversation, messages, user, isStaff, onMessageSent }) {
  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[80vh] p-0 overflow-hidden">
        <PrivateChatPanel
          conversation={conversation}
          messages={messages}
          user={user}
          isStaff={isStaff}
          onClose={() => onOpenChange(false)}
          onMessageSent={onMessageSent}
        />
      </DialogContent>
    </Dialog>
  );
}