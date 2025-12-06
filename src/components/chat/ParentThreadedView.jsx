import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Send, MessageCircle, Lock, Zap } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import MessageAttachments from "./MessageAttachments";
import PollMessage from "./PollMessage";
import FileAttachmentButton from "./FileAttachmentButton";
import DateSeparator from "./DateSeparator";
import useChatSound from "./useChatSound";
import LinkPreview from "./LinkPreview";
import TypingIndicator from "./TypingIndicator";
import QuickReplies from "./QuickReplies";
import { useQueryClient } from "@tanstack/react-query";

export default function ParentThreadedView({
  category,
  groupMessages = [],
  myPrivateConversation = null,
  myPrivateMessages = [],
  user,
  onReplyPrivate,
  onSendPrivateMessage,
  onVotePoll,
  isSending = false,
  sportEmoji = "⚽",
  onTypingChange
}) {
  console.log('🎨 ParentThreadedView render:', {
    category,
    groupMessages: groupMessages?.length || 0,
    myPrivateConversation: myPrivateConversation?.id,
    myPrivateMessages: myPrivateMessages?.length || 0,
    user: user?.email
  });
  const [messageContent, setMessageContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [replyingToStaff, setReplyingToStaff] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { checkNewMessages } = useChatSound();
  const markedAsReadRef = useRef(new Set());
  const queryClient = useQueryClient();

  // Detectar mensajes nuevos y reproducir sonido + MARCAR COMO LEÍDO
  useEffect(() => {
    const allMessages = [...groupMessages, ...myPrivateMessages];
    checkNewMessages(allMessages, user?.email);
    
    // Marcar mensajes privados del staff como leídos
    const unreadPrivate = myPrivateMessages.filter(msg => 
      !msg.leido && 
      msg.remitente_tipo === "staff" && 
      !markedAsReadRef.current.has(msg.id)
    );
    
    if (unreadPrivate.length > 0 && myPrivateConversation) {
      console.log(`📖 ParentThreadedView: Marcando ${unreadPrivate.length} mensajes del staff como leídos`);
      unreadPrivate.forEach(msg => markedAsReadRef.current.add(msg.id));
      
      Promise.all(unreadPrivate.map(msg => 
        base44.entities.PrivateMessage.update(msg.id, { leido: true }).catch(() => {})
      )).then(() => {
        console.log('✅ Mensajes del staff marcados, actualizando contador...');
        
        // Actualizar contador de conversación
        base44.entities.PrivateConversation.update(myPrivateConversation.id, { 
          no_leidos_familia: 0 
        }).then(() => {
          // Refrescar TODAS las queries
          queryClient.invalidateQueries({ queryKey: ['privateConversations'] });
          queryClient.invalidateQueries({ queryKey: ['myPrivateConversations'] });
          queryClient.invalidateQueries({ queryKey: ['privateConversationsParent'] });
          queryClient.invalidateQueries({ queryKey: ['privateConversationsHome'] });
        }).catch(() => {});
      });
    }
  }, [groupMessages.length, myPrivateMessages.length, user?.email, myPrivateMessages, myPrivateConversation]);

  // Detectar cuando el usuario está escribiendo
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageContent(value);

    // Notificar que está escribiendo
    if (onTypingChange && value.length > 0) {
      onTypingChange(true);

      // Cancelar typing después de 3s sin escribir
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTypingChange(false);
      }, 3000);
    } else if (onTypingChange && value.length === 0) {
      onTypingChange(false);
    }
  };

  // Crear estructura de hilos - SOLO mensajes de ESTA familia
  const threadedMessages = React.useMemo(() => {
    const items = [];

    // Anuncios del entrenador
    groupMessages.forEach(msg => {
      items.push({
        type: 'announcement',
        data: msg,
        timestamp: new Date(msg.created_date),
        sortKey: new Date(msg.created_date).getTime()
      });
    });

    // MIS mensajes privados (solo los míos, nunca de otras familias)
    myPrivateMessages.forEach(msg => {
      items.push({
        type: 'private_reply',
        data: msg,
        timestamp: new Date(msg.created_date),
        sortKey: new Date(msg.created_date).getTime()
      });
    });

    return items.sort((a, b) => a.sortKey - b.sortKey);
  }, [groupMessages, myPrivateMessages]);

  // Agrupar por fechas
  const groupedByDate = React.useMemo(() => {
    const grouped = [];
    let currentDate = null;

    threadedMessages.forEach(item => {
      const itemDate = format(item.timestamp, 'yyyy-MM-dd');
      
      if (currentDate !== itemDate) {
        currentDate = itemDate;
        grouped.push({
          type: 'date_separator',
          date: item.timestamp
        });
      }
      
      grouped.push(item);
    });

    return grouped;
  }, [threadedMessages]);

  const handleSendPrivateReply = () => {
    if (!messageContent.trim() && attachments.length === 0) return;
    
    // Si no hay conversación aún, crearla automáticamente
    if (!myPrivateConversation) {
      console.log('⚠️ Intentando enviar sin conversación - esto debería haberse creado antes');
      return;
    }

    onSendPrivateMessage({
      conversationId: myPrivateConversation.id,
      message: messageContent,
      attachments
    });

    setMessageContent("");
    setAttachments([]);
    setReplyingToStaff(false);
  };

  const isAutomaticMessage = (msg) => {
    const mensaje = msg.mensaje?.toLowerCase() || "";
    return mensaje.includes("convocatoria") || 
           mensaje.includes("nuevo anuncio") || 
           mensaje.includes("encuesta");
  };

  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  }, [threadedMessages.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ backgroundColor: '#e5ddd5' }}
      >
        {groupedByDate.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500 bg-white/80 rounded-xl p-6">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay mensajes del entrenador</p>
            </div>
          </div>
        ) : (
          groupedByDate.map((item, idx) => {
            if (item.type === 'date_separator') {
              return <DateSeparator key={`date-${idx}`} date={item.date} />;
            }

            // ANUNCIO DEL ENTRENADOR
            if (item.type === 'announcement') {
              const msg = item.data;
              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[85%] bg-white rounded-2xl shadow-md overflow-hidden rounded-bl-sm">
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-orange-700">
                          🏃 {msg.remitente_nombre || "Entrenador"}
                        </span>
                        {msg.prioridad !== "Normal" && (
                          <Badge className={msg.prioridad === "Urgente" ? "bg-red-500" : "bg-yellow-500"}>
                            {msg.prioridad}
                          </Badge>
                        )}
                        <span className="text-[10px] ml-auto text-slate-400">
                          {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed break-words text-slate-800">{msg.mensaje}</p>

                      <LinkPreview message={msg.mensaje} />

                      {msg.poll && (
                        <div className="mt-2">
                          <PollMessage 
                            poll={msg.poll} 
                            onVote={(msgId, optIdx) => onVotePoll?.(msgId, optIdx)}
                            userEmail={user?.email}
                            messageId={msg.id}
                          />
                        </div>
                      )}

                      {msg.archivos_adjuntos?.length > 0 && (
                        <div className="mt-2">
                          <MessageAttachments attachments={msg.archivos_adjuntos} />
                        </div>
                      )}
                    </div>

                    {/* Botón responder en privado */}
                    {!isAutomaticMessage(msg) && (
                      <div className="bg-slate-50 px-4 py-2 border-t">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (!myPrivateConversation) {
                                onReplyPrivate(msg.remitente_email);
                              }
                              setReplyingToStaff(true);
                              setShowQuickReplies(false);
                              setTimeout(() => inputRef.current?.focus(), 100);
                            }}
                            className="text-green-700 hover:bg-green-50 flex-1 gap-2"
                          >
                            <Lock className="w-3 h-3" />
                            💬 Responder
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (!myPrivateConversation) {
                                onReplyPrivate(msg.remitente_email);
                              }
                              setReplyingToStaff(true);
                              setShowQuickReplies(true);
                              setTimeout(() => inputRef.current?.focus(), 100);
                            }}
                            className="text-orange-600 hover:bg-orange-50 gap-1"
                            title="Respuestas rápidas"
                          >
                            <Zap className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // MI MENSAJE PRIVADO (mío o respuesta del entrenador)
            if (item.type === 'private_reply') {
              const msg = item.data;
              const isMyMessage = msg.remitente_tipo === 'familia';
              
              return (
                <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} ml-8`}>
                  <div className={`max-w-[80%] rounded-2xl shadow-md ${
                    isMyMessage 
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-br-sm'
                      : 'bg-gradient-to-r from-blue-100 to-blue-200 text-slate-900 rounded-bl-sm border-2 border-blue-400'
                  }`}>
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        {isMyMessage ? (
                          <Badge className="bg-green-500 text-white text-xs">
                            🔒 Tu respuesta privada
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-600 text-white text-xs">
                              🏃 Respuesta del entrenador
                            </Badge>
                            {!msg.leido && (
                              <Badge className="bg-red-500 text-white text-[10px] animate-pulse">
                                ✉️ NUEVO
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm leading-relaxed break-words">{msg.mensaje}</p>
                      
                      <LinkPreview message={msg.mensaje} />

                      {msg.archivos_adjuntos?.length > 0 && (
                        <div className="mt-2">
                          <MessageAttachments attachments={msg.archivos_adjuntos} />
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-2">
                        <span className={`text-[10px] ${isMyMessage ? 'text-white opacity-70' : 'text-slate-500'}`}>
                          {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                        </span>
                        {isMyMessage && msg.leido && (
                          <span className="text-xs text-green-200" title="Leído por entrenador">✓✓</span>
                        )}
                      </div>
                    </div>

                    {/* Si es del entrenador, permitir responder */}
                    {!isMyMessage && (
                      <div className="bg-blue-50 px-4 py-2 border-t border-blue-300">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplyingToStaff(true);
                            setTimeout(() => inputRef.current?.focus(), 100);
                          }}
                          className="text-blue-700 hover:bg-blue-100 w-full gap-2"
                        >
                          💬 Responder
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - solo si está respondiendo */}
      {replyingToStaff && (
        <div className="bg-white border-t flex-shrink-0">
          <QuickReplies 
            visible={showQuickReplies} 
            onSelect={(text) => {
              setMessageContent(text);
              setShowQuickReplies(false);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
          />

          <div className="bg-green-50 px-4 py-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-700" />
              <span className="text-sm text-green-800 font-medium">
                🔒 Respuesta privada al entrenador
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setReplyingToStaff(false);
                setMessageContent("");
                setAttachments([]);
              }}
              className="text-green-700 hover:bg-green-100"
            >
              Cancelar
            </Button>
          </div>

          {attachments.length > 0 && (
            <div className="p-2 bg-slate-50 border-b">
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, index) => (
                  <div key={index} className="bg-white rounded-lg px-3 py-2 text-sm flex items-center gap-2 border shadow-sm">
                    <span>{att.tipo === "imagen" ? "🖼️" : "📄"}</span>
                    <span className="text-xs truncate max-w-[100px]">{att.nombre}</span>
                    <button 
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))} 
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 flex gap-2 items-end">
            <FileAttachmentButton 
              onFileUploaded={(att) => setAttachments(prev => [...prev, att])} 
              disabled={isSending} 
            />
            
            <Input
              ref={inputRef}
              value={messageContent}
              onChange={handleInputChange}
              placeholder="Escribe tu respuesta privada al entrenador..."
              className="flex-1 rounded-full text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPrivateReply();
                }
                if (e.key === 'Escape') {
                  setReplyingToStaff(false);
                  setMessageContent("");
                  setAttachments([]);
                }
              }}
            />

            <Button
              onClick={handleSendPrivateReply}
              disabled={(!messageContent.trim() && attachments.length === 0) || isSending}
              className="rounded-full w-12 h-12 p-0 flex-shrink-0 bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}