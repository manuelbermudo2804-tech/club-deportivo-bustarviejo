import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Send, MessageCircle, Lock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import MessageAttachments from "./MessageAttachments";
import PollMessage from "./PollMessage";
import FileAttachmentButton from "./FileAttachmentButton";
import DateSeparator from "./DateSeparator";
import ReadConfirmation from "./ReadConfirmation";
import LinkPreview from "./LinkPreview";
import useChatSound from "./useChatSound";
import { useQueryClient } from "@tanstack/react-query";

export default function CoachThreadedView({
  category,
  groupMessages = [],
  privateConversations = [],
  allPrivateMessages = [],
  allPlayers = [],
  user,
  onSendGroupMessage,
  onSendPrivateMessage,
  onVotePoll,
  isSending = false,
  sportEmoji = "⚽",
  priority = "Normal",
  onPriorityChange,
  onTypingChange
}) {
  const [messageContent, setMessageContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [replyingToFamily, setReplyingToFamily] = useState(null);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { checkNewMessages } = useChatSound();
  const markedAsReadRef = useRef(new Set());
  const queryClient = useQueryClient();

  // Detectar mensajes nuevos y reproducir sonido + MARCAR COMO LEÍDO
  useEffect(() => {
    const allMessages = [...groupMessages, ...allPrivateMessages];
    checkNewMessages(allMessages, user?.email);
    
    // Marcar mensajes privados de familias como leídos
    const unreadPrivate = allPrivateMessages.filter(msg => 
      !msg.leido && 
      msg.remitente_tipo === "familia" && 
      !markedAsReadRef.current.has(msg.id)
    );
    
    if (unreadPrivate.length > 0) {
      console.log(`📖 CoachThreadedView: Marcando ${unreadPrivate.length} mensajes privados como leídos`);
      unreadPrivate.forEach(msg => markedAsReadRef.current.add(msg.id));
      
      Promise.all(unreadPrivate.map(msg => 
        base44.entities.PrivateMessage.update(msg.id, { leido: true }).catch(() => {})
      )).then(() => {
        console.log('✅ Mensajes privados marcados, actualizando contadores...');
        
        // Actualizar contadores por conversación
        const convsToUpdate = new Map();
        unreadPrivate.forEach(msg => {
          if (!convsToUpdate.has(msg.conversacion_id)) {
            convsToUpdate.set(msg.conversacion_id, []);
          }
          convsToUpdate.get(msg.conversacion_id).push(msg.id);
        });
        
        convsToUpdate.forEach((msgIds, convId) => {
          base44.entities.PrivateConversation.update(convId, { no_leidos_staff: 0 }).catch(() => {});
        });
        
        // Refrescar TODAS las queries
        queryClient.invalidateQueries({ queryKey: ['privateConversations'] });
        queryClient.invalidateQueries({ queryKey: ['myPrivateConversations'] });
        queryClient.invalidateQueries({ queryKey: ['privateConversationsParent'] });
        queryClient.invalidateQueries({ queryKey: ['privateConversationsHome'] });
        queryClient.invalidateQueries({ queryKey: ['allPrivateMessagesCategory'] });
      });
    }
  }, [groupMessages.length, allPrivateMessages.length, user?.email, allPrivateMessages, queryClient]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageContent(value);

    if (onTypingChange && value.length > 0) {
      onTypingChange(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTypingChange(false), 3000);
    } else if (onTypingChange && value.length === 0) {
      onTypingChange(false);
    }
  };

  // Crear estructura de hilos unificada cronológica
  const threadedMessages = React.useMemo(() => {
    const items = [];

    // Anuncios grupales del entrenador
    groupMessages.forEach(msg => {
      items.push({
        type: 'group_announcement',
        data: msg,
        timestamp: new Date(msg.created_date),
        sortKey: new Date(msg.created_date).getTime()
      });
    });

    // Respuestas privadas de TODAS las familias
    allPrivateMessages.forEach(msg => {
      const conv = privateConversations.find(c => c.id === msg.conversacion_id);
      if (!conv) return;

      items.push({
        type: 'private_message',
        data: msg,
        conversation: conv,
        timestamp: new Date(msg.created_date),
        sortKey: new Date(msg.created_date).getTime()
      });
    });

    // Mensajes optimistas (aparecen INSTANTÁNEAMENTE)
    optimisticMessages.forEach(msg => {
      if (msg.tipo === "admin_a_grupo") {
        items.push({
          type: 'group_announcement',
          data: msg,
          timestamp: new Date(msg.created_date),
          sortKey: new Date(msg.created_date).getTime()
        });
      } else {
        const conv = privateConversations.find(c => c.id === msg.conversacion_id);
        items.push({
          type: 'private_message',
          data: msg,
          conversation: conv || { participante_familia_nombre: "Familia" },
          timestamp: new Date(msg.created_date),
          sortKey: new Date(msg.created_date).getTime()
        });
      }
    });

    return items.sort((a, b) => a.sortKey - b.sortKey);
  }, [groupMessages, allPrivateMessages, privateConversations, optimisticMessages]);

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

  const handleSend = () => {
    if (!messageContent.trim() && attachments.length === 0) return;

    const msgText = messageContent || "(Archivo adjunto)";

    if (replyingToFamily) {
      // Mensaje optimista para respuesta privada
      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        conversacion_id: replyingToFamily.conversationId,
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        remitente_tipo: "staff",
        mensaje: msgText,
        leido: false,
        archivos_adjuntos: [...attachments],
        created_date: new Date().toISOString(),
        _isOptimistic: true
      };
      
      setOptimisticMessages([optimisticMsg]);
      
      const tempMsg = messageContent;
      const tempAttachments = [...attachments];
      setMessageContent("");
      setAttachments([]);
      setReplyingToFamily(null);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);

      onSendPrivateMessage({
        conversationId: replyingToFamily.conversationId,
        message: tempMsg,
        attachments: tempAttachments
      });

      setTimeout(() => setOptimisticMessages([]), 3000);
    } else {
      // Mensaje optimista para anuncio grupal
      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        mensaje: msgText,
        tipo: "admin_a_grupo",
        archivos_adjuntos: [...attachments],
        created_date: new Date().toISOString(),
        _isOptimistic: true
      };
      
      setOptimisticMessages([optimisticMsg]);
      
      const tempMsg = messageContent;
      const tempAttachments = [...attachments];
      setMessageContent("");
      setAttachments([]);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);

      onSendGroupMessage({
        message: tempMsg,
        attachments: tempAttachments
      });

      setTimeout(() => setOptimisticMessages([]), 3000);
    }
  };

  // Scroll INTELIGENTE solo cuando hay mensajes nuevos REALES
  const prevRealMessagesCountRef = useRef(0);
  useEffect(() => {
    const realCount = groupMessages.length + allPrivateMessages.length;
    
    if (prevRealMessagesCountRef.current > 0 && realCount > prevRealMessagesCountRef.current) {
      const container = messagesEndRef.current?.parentElement;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        
        if (isNearBottom) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
          }, 100);
        }
      }
    }
    
    prevRealMessagesCountRef.current = realCount;
  }, [groupMessages.length, allPrivateMessages.length]);

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
              <p className="text-sm">No hay mensajes</p>
            </div>
          </div>
        ) : (
          groupedByDate.map((item, idx) => {
            if (item.type === 'date_separator') {
              return <DateSeparator key={`date-${idx}`} date={item.date} />;
            }

            // ANUNCIO GRUPAL (enviado por el entrenador)
            if (item.type === 'group_announcement') {
              const msg = item.data;
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className={`max-w-[75%] rounded-2xl shadow-md bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm ${msg._isOptimistic ? 'opacity-70' : ''}`}>
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-500">📢 Anuncio Grupal</Badge>
                        {msg.prioridad !== "Normal" && (
                          <Badge className={msg.prioridad === "Urgente" ? "bg-red-500" : "bg-yellow-500"}>
                            {msg.prioridad}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed break-words">{msg.mensaje}</p>
                      
                      <LinkPreview message={msg.mensaje} />

                      {msg.archivos_adjuntos?.length > 0 && (
                        <div className="mt-2">
                          <MessageAttachments attachments={msg.archivos_adjuntos} />
                        </div>
                      )}

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

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] opacity-70">
                          {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                        </span>
                        {msg._isOptimistic ? (
                          <span className="text-xs opacity-70" title="Enviando...">⏳</span>
                        ) : (
                          <ReadConfirmation message={msg} players={allPlayers.filter(p => p.deporte === category)} isAdmin={true} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // MENSAJE PRIVADO (de familia o respuesta del entrenador)
            if (item.type === 'private_message') {
              const msg = item.data;
              const conv = item.conversation;
              const isStaffMessage = msg.remitente_tipo === 'staff';
              
              return (
                <div key={msg.id} className={`flex ${isStaffMessage ? 'justify-end' : 'justify-start'} ml-8`}>
                  <div className={`max-w-[75%] rounded-2xl shadow-md ${
                    isStaffMessage 
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-br-sm'
                      : 'bg-white text-slate-900 rounded-bl-sm border-2 border-green-400'
                  } ${msg._isOptimistic ? 'opacity-70' : ''}`}>
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        {!isStaffMessage && (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                              <User className="w-3 h-3 text-green-700" />
                            </div>
                            <span className="text-xs font-bold text-green-700">
                              {conv.participante_familia_nombre}
                            </span>
                            {!msg.leido && (
                              <Badge className="bg-red-500 text-white text-[10px] animate-pulse">
                                ✉️ NUEVO
                              </Badge>
                            )}
                          </div>
                        )}
                        {isStaffMessage && (
                          <Badge className="bg-green-500 text-white text-xs">
                            🔒 Tu respuesta a {conv.participante_familia_nombre}
                          </Badge>
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
                        <span className={`text-[10px] ${isStaffMessage ? 'text-white opacity-70' : 'text-slate-500'}`}>
                          {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                        </span>
                        {isStaffMessage && msg._isOptimistic && (
                          <span className="text-xs text-white opacity-70" title="Enviando...">⏳</span>
                        )}
                        {isStaffMessage && !msg._isOptimistic && msg.leido && (
                          <span className="text-xs text-green-200" title="Leído por familia">✓✓</span>
                        )}
                        {isStaffMessage && !msg._isOptimistic && !msg.leido && (
                          <span className="text-xs text-green-300" title="Enviado">✓</span>
                        )}
                      </div>
                    </div>

                    {/* Si es mensaje de familia, mostrar botón responder */}
                    {!isStaffMessage && (
                      <div className="bg-green-50 px-4 py-2 border-t border-green-200">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplyingToFamily({
                              conversationId: conv.id,
                              familyName: conv.participante_familia_nombre
                            });
                            setTimeout(() => inputRef.current?.focus(), 100);
                          }}
                          className="text-green-700 hover:bg-green-100 w-full gap-2"
                        >
                          💬 Responder a {conv.participante_familia_nombre}
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

      {/* Input area */}
      <div className="bg-white border-t flex-shrink-0">
        {replyingToFamily && (
          <div className="bg-green-50 px-4 py-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-700" />
              <span className="text-sm text-green-800 font-medium">
                🔒 Respondiendo en privado a <strong>{replyingToFamily.familyName}</strong>
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setReplyingToFamily(null)}
              className="text-green-700 hover:bg-green-100"
            >
              Cancelar
            </Button>
          </div>
        )}

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
          
          {!replyingToFamily && onPriorityChange && (
            <select
              value={priority}
              onChange={(e) => onPriorityChange(e.target.value)}
              className="px-3 py-2 border rounded-full text-sm"
            >
              <option value="Normal">Normal</option>
              <option value="Importante">Importante</option>
              <option value="Urgente">Urgente</option>
            </select>
          )}
          
          <Input
            ref={inputRef}
            value={messageContent}
            onChange={handleInputChange}
            placeholder={replyingToFamily 
              ? `Respuesta privada a ${replyingToFamily.familyName}...` 
              : "Anuncio al grupo..."}
            className="flex-1 rounded-full text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
              if (e.key === 'Escape' && replyingToFamily) {
                setReplyingToFamily(null);
              }
            }}
          />

          <Button
            onClick={handleSend}
            disabled={(!messageContent.trim() && attachments.length === 0)}
            className={`rounded-full w-12 h-12 p-0 flex-shrink-0 ${
              replyingToFamily 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}