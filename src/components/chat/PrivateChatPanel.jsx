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
import MessageContextMenu from "./MessageContextMenu";
import MessageReactions from "./MessageReactions";
import ReplyPreview from "./ReplyPreview";

export default function PrivateChatPanel({ 
  conversation, 
  messages, 
  user,
  onClose, 
  onMessageSent,
  isStaff = true,
  hideHeader = false 
}) {
  const [messageContent, setMessageContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [contextMenu, setContextMenu] = useState(null); // { message, position }
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  // Scroll fluido mejorado para móvil
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "end",
        inline: "nearest"
      });
    }
  }, [messages, optimisticMessages]);

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
    onSuccess: async () => {
      // Limpiar mensaje optimista y refrescar
      setOptimisticMessages([]);
      setIsSending(false);
      await queryClient.invalidateQueries({ queryKey: ['privateMessages', conversation.id] });
      await queryClient.invalidateQueries({ queryKey: ['privateConversations'] });
      await queryClient.invalidateQueries({ queryKey: ['myPrivateConversations'] });
      onMessageSent?.();
    },
    onError: () => {
      // Si falla, quitar el mensaje optimista
      setOptimisticMessages([]);
      setIsSending(false);
      toast.error("Error al enviar mensaje");
    },
  });

  const handleSendMessage = () => {
    if (!messageContent.trim() && attachments.length === 0) return;
    if (isSending) return;

    const msgText = messageContent || "(Archivo adjunto)";
    
    // Mensaje optimista - aparece inmediatamente
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      conversacion_id: conversation.id,
      remitente_email: user.email,
      remitente_nombre: user.full_name,
      remitente_tipo: isStaff ? "staff" : "familia",
      mensaje: msgText,
      leido: false,
      archivos_adjuntos: attachments,
      reply_to: replyingTo ? {
        id: replyingTo.id,
        mensaje: replyingTo.mensaje?.substring(0, 100),
        remitente_nombre: replyingTo.remitente_nombre
      } : null,
      created_date: new Date().toISOString(),
      _isOptimistic: true
    };
    
    setOptimisticMessages([optimisticMsg]);
    setMessageContent("");
    setAttachments([]);
    setReplyingTo(null);
    setIsSending(true);

    sendMessageMutation.mutate({
      conversacion_id: conversation.id,
      remitente_email: user.email,
      remitente_nombre: user.full_name,
      remitente_tipo: isStaff ? "staff" : "familia",
      mensaje: msgText,
      leido: false,
      archivos_adjuntos: optimisticMsg.archivos_adjuntos,
      reply_to: optimisticMsg.reply_to
    });
  };

  // Handlers para el menú contextual
  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    if (msg._isOptimistic) return;
    setContextMenu({
      message: msg,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleLongPress = (msg) => {
    if (msg._isOptimistic) return;
    // Vibración háptica en móvil
    if (navigator.vibrate) navigator.vibrate(50);
    setContextMenu({
      message: msg,
      position: { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100 }
    });
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await base44.entities.PrivateMessage.delete(messageId);
      queryClient.invalidateQueries({ queryKey: ['privateMessages', conversation.id] });
      toast.success("🗑️ Mensaje eliminado");
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const handleReply = (msg) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const msg = messages.find(m => m.id === messageId);
      const reactions = msg?.reactions || [];
      
      // Toggle: si ya reaccionó con ese emoji, quitar
      const existingIndex = reactions.findIndex(r => r.user_email === user.email && r.emoji === emoji);
      
      let newReactions;
      if (existingIndex >= 0) {
        newReactions = reactions.filter((_, i) => i !== existingIndex);
      } else {
        newReactions = [...reactions, {
          user_email: user.email,
          user_name: user.full_name,
          emoji,
          created_date: new Date().toISOString()
        }];
      }
      
      await base44.entities.PrivateMessage.update(messageId, { reactions: newReactions });
      queryClient.invalidateQueries({ queryKey: ['privateMessages', conversation.id] });
    } catch (error) {
      toast.error("Error al reaccionar");
    }
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
              ? "🔒 Chat privado con el coordinador - Consultas, dudas o sugerencias" 
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
        {/* Menú contextual */}
        {contextMenu && (
          <MessageContextMenu
            message={contextMenu.message}
            isOwnMessage={contextMenu.message.remitente_email === user?.email}
            position={contextMenu.position}
            onClose={() => setContextMenu(null)}
            onDelete={handleDeleteMessage}
            onReply={handleReply}
            onReact={handleReaction}
          />
        )}

        {messages.length === 0 && optimisticMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500 bg-white/80 rounded-xl p-6">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Inicia la conversación</p>
              <p className="text-xs text-slate-400 mt-1">Los mensajes son privados</p>
            </div>
          </div>
        ) : (
          [...messages, ...optimisticMessages]
            .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
            .map((msg) => {
              const isMyMessage = msg.remitente_email === user?.email;
              let longPressTimer;
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-2`}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                  onTouchStart={() => {
                    longPressTimer = setTimeout(() => handleLongPress(msg), 500);
                  }}
                  onTouchEnd={() => clearTimeout(longPressTimer)}
                  onTouchMove={() => clearTimeout(longPressTimer)}
                >
                    <div className={`max-w-[85%] rounded-2xl shadow-md overflow-hidden ${
                      isMyMessage
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm'
                        : 'bg-white text-slate-900 rounded-bl-sm'
                    } ${msg._isOptimistic ? 'opacity-70' : ''} select-none`}>
                      <div className="px-4 py-3">
                        {/* Reply preview si es respuesta */}
                        {msg.reply_to && (
                          <div className={`mb-2 p-2 rounded-lg border-l-2 ${
                            isMyMessage 
                              ? 'bg-blue-500/30 border-blue-300' 
                              : 'bg-slate-100 border-slate-400'
                          }`}>
                            <p className={`text-xs font-semibold ${isMyMessage ? 'text-blue-200' : 'text-slate-600'}`}>
                              {msg.reply_to.remitente_nombre}
                            </p>
                            <p className={`text-xs truncate ${isMyMessage ? 'text-blue-100' : 'text-slate-500'}`}>
                              {msg.reply_to.mensaje}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${isMyMessage ? 'text-blue-100' : 'text-slate-700'}`}>
                            {msg.remitente_tipo === "staff" 
                              ? (conversation.categoria === "Coordinación Deportiva" ? "🎓 Coordinador" : "🏃 Entrenador")
                              : msg.remitente_nombre}
                          </span>
                        </div>
                        <p className="text-base leading-relaxed break-words">{msg.mensaje}</p>
                      
                      {msg.archivos_adjuntos?.length > 0 && (
                        <div className="mt-2">
                          <MessageAttachments attachments={msg.archivos_adjuntos} />
                        </div>
                      )}

                      {/* Reacciones */}
                      {msg.reactions?.length > 0 && (
                        <MessageReactions 
                          reactions={msg.reactions} 
                          userEmail={user?.email}
                          onToggleReaction={(emoji) => handleReaction(msg.id, emoji)}
                        />
                      )}
                      
                      <div className="flex items-center justify-end gap-1 mt-2">
                        <span className={`text-xs ${isMyMessage ? 'text-blue-200' : 'text-slate-400'}`}>
                          {format(new Date(msg.created_date), "HH:mm")}
                        </span>
                        {isMyMessage && msg._isOptimistic && (
                          <span className="text-xs text-blue-200" title="Enviando...">⏳</span>
                        )}
                        {isMyMessage && !msg._isOptimistic && msg.leido && (
                          <span className="text-xs text-cyan-300" title="Leído">✓✓</span>
                        )}
                        {isMyMessage && !msg._isOptimistic && !msg.leido && (
                          <span className="text-xs text-blue-200" title="Entregado">✓</span>
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
      <div className="bg-white border-t flex-shrink-0">
        {/* Reply preview */}
        {replyingTo && (
          <ReplyPreview replyingTo={replyingTo} onCancel={() => setReplyingTo(null)} />
        )}
        <div className="p-3">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border">
            {attachments.map((att, index) => (
              <div key={index} className="relative group">
                {att.tipo === "imagen" && att.url ? (
                  <div className="relative">
                    <img 
                      src={att.url} 
                      alt={att.nombre} 
                      className="w-16 h-16 object-cover rounded-lg border-2 border-slate-200"
                    />
                    <button 
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg px-3 py-2 text-sm flex items-center gap-2 border shadow-sm">
                    <span className="text-lg">
                      {att.tipo === "documento" ? "📄" : att.tipo === "video" ? "🎬" : att.tipo === "audio" ? "🎵" : "📎"}
                    </span>
                    <span className="text-xs truncate max-w-[100px] font-medium">{att.nombre}</span>
                    <button 
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))} 
                      className="text-slate-400 hover:text-red-600 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Botón de adjuntar archivos - ahora disponible para TODOS (familias incluidas) */}
          <FileAttachmentButton
            onFileUploaded={(att) => setAttachments(prev => [...prev, att])}
            disabled={sendMessageMutation.isPending}
          />
          
          <Input
            ref={inputRef}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder={replyingTo ? "Escribe tu respuesta..." : "Escribe un mensaje privado..."}
            className="flex-1 rounded-full"
            disabled={sendMessageMutation.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
              if (e.key === 'Escape' && replyingTo) {
                setReplyingTo(null);
              }
            }}
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={(!messageContent.trim() && attachments.length === 0) || isSending}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
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