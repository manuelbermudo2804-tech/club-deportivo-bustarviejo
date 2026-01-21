import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, X, FileText, Download, CheckCircle, AlertTriangle, Shield, Paperclip, Edit, MessageCircle, Smile } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Textarea as TextareaUI } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import EmojiPicker from "../chat/EmojiPicker";

export default function AdminChatWindow({ conversation, user, onClose, onMarkResolved }) {
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const messagesEndRef = useRef(null);

  const REACTIONS = ["👍", "❤️", "😊", "👏", "🎉"];
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Helper para añadir reacciones
  const addReaction = async (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    const existingReactions = message.reacciones || [];
    
    const alreadyReacted = existingReactions.find(r => r.email === user.email && r.emoji === emoji);
    
    let newReactions;
    if (alreadyReacted) {
      newReactions = existingReactions.filter(r => !(r.email === user.email && r.emoji === emoji));
    } else {
      newReactions = [...existingReactions, {
        email: user.email,
        nombre: user.full_name,
        emoji: emoji,
        fecha: new Date().toISOString()
      }];
    }

    await base44.entities.AdminMessage.update(messageId, {
      reacciones: newReactions
    });

    queryClient.invalidateQueries({ queryKey: ['adminMessages'] });
    setShowReactions(null);
  };

  const { data: messages = [] } = useQuery({
    queryKey: ['adminMessages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      return await base44.entities.AdminMessage.filter({ conversacion_id: conversation.id }, 'created_date');
    },
    refetchInterval: 3000,
    enabled: !!conversation?.id,
  });

  // REAL-TIME: Suscripción a mensajes admin
  useEffect(() => {
    if (!conversation?.id) return;
    
    const unsub = base44.entities.AdminMessage.subscribe((event) => {
      if (event.data?.conversacion_id === conversation.id) {
        queryClient.invalidateQueries({ queryKey: ['adminMessages', conversation.id] });
      }
    });
    
    return unsub;
  }, [conversation?.id, queryClient]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Marcar como leído
  const markedAsReadRef = useRef(false);
  useEffect(() => {
    if (!conversation?.id || conversation.no_leidos_admin === 0 || markedAsReadRef.current) return;
    
    markedAsReadRef.current = true;
    const markAsRead = async () => {
      try {
        await base44.entities.AdminConversation.update(conversation.id, {
          no_leidos_admin: 0
        });

        const unreadMessages = messages.filter(m => m.autor === "padre" && !m.leido_admin);
        for (const msg of unreadMessages) {
          await base44.entities.AdminMessage.update(msg.id, {
            leido_admin: true,
            fecha_leido_admin: new Date().toISOString()
          });
        }

        queryClient.invalidateQueries({ queryKey: ['adminConversations'] });
      } catch (error) {
        console.log("Error marking as read:", error);
        markedAsReadRef.current = false;
      }
    };
    markAsRead();
  }, [conversation?.id]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({
          url: file_url,
          nombre: file.name,
          tipo: file.type
        });
      }
      setAttachments([...attachments, ...uploaded]);
      toast.success("Archivos adjuntados");
    } catch (error) {
      toast.error("Error al subir archivos");
    } finally {
      setUploading(false);
    }
  };

  const sendMessageMutation = useMutation({
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['adminMessages'] });
      
      const previousMessages = queryClient.getQueryData(['adminMessages', conversation?.id]);
      
      const optimisticMessage = {
        id: 'temp-' + Date.now(),
        conversacion_id: conversation.id,
        autor: "admin",
        autor_email: user.email,
        autor_nombre: user.full_name,
        mensaje: data.mensaje,
        created_date: new Date().toISOString(),
        leido_admin: true,
        leido_padre: false,
        archivos_adjuntos: data.adjuntos || [],
        es_nota_interna: data.es_nota_interna || false
      };
      
      queryClient.setQueryData(['adminMessages', conversation?.id], old => [...(old || []), optimisticMessage]);
      
      return { previousMessages };
    },
    onError: (err, data, context) => {
      queryClient.setQueryData(['adminMessages', conversation?.id], context.previousMessages);
      toast.error("Error al enviar mensaje");
    },
    mutationFn: async (data) => {
      await base44.entities.AdminMessage.create({
        conversacion_id: conversation.id,
        autor: "admin",
        autor_email: user.email,
        autor_nombre: user.full_name,
        mensaje: data.mensaje,
        archivos_adjuntos: data.adjuntos,
        es_nota_interna: data.es_nota_interna || false,
        leido_admin: true,
        leido_padre: data.es_nota_interna ? true : false,
        fecha_leido_admin: new Date().toISOString()
      });

      if (!data.es_nota_interna) {
        await base44.entities.AdminConversation.update(conversation.id, {
          ultimo_mensaje: data.mensaje,
          ultimo_mensaje_fecha: new Date().toISOString(),
          ultimo_mensaje_autor: "admin",
          no_leidos_padre: (conversation.no_leidos_padre || 0) + 1
        });

        // Notificar al padre
        await base44.entities.AppNotification.create({
          usuario_email: conversation.padre_email,
          titulo: `🛡️ Mensaje del Administrador`,
          mensaje: data.mensaje.substring(0, 100),
          tipo: "urgente",
          icono: "🛡️",
          enlace: "ParentAdminChat",
          vista: false
        });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['adminMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['adminConversations'] }),
        queryClient.refetchQueries({ queryKey: ['adminMessages'] }),
      ]);
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    
    // Guardar antes de limpiar
    const textToSend = messageText;
    const attachToSend = [...attachments];
    
    // Limpiar inmediatamente
    setMessageText("");
    setAttachments([]);
    
    sendMessageMutation.mutate({ mensaje: textToSend, adjuntos: attachToSend });
  };

  const handleSendInternalNote = () => {
    if (!messageText.trim()) return;
    
    // Guardar antes de limpiar
    const textToSend = messageText;
    const attachToSend = [...attachments];
    
    // Limpiar inmediatamente
    setMessageText("");
    setAttachments([]);
    
    sendMessageMutation.mutate({ mensaje: textToSend, adjuntos: attachToSend, es_nota_interna: true });
  };

  const handleResolve = () => {
    if (!resolutionNotes.trim()) {
      toast.error("Debes explicar cómo se resolvió la situación");
      return;
    }
    onMarkResolved(resolutionNotes);
    setShowResolveDialog(false);
    setResolutionNotes("");
  };

  const criticityColors = {
    "Crítica": "bg-red-100 text-red-800 border-red-300",
    "Alta": "bg-orange-100 text-orange-800 border-orange-300",
    "Media": "bg-yellow-100 text-yellow-800 border-yellow-300",
    "Baja": "bg-green-100 text-green-800 border-green-300"
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Preview de imagen */}
      {showImagePreview && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowImagePreview(null)}>
          <img src={showImagePreview} alt="Preview" className="max-w-full max-h-full rounded" />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowImagePreview(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Diálogo de resolución */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-6 h-6" />
              Marcar como Resuelta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800 text-sm">
                Esta acción archivará la conversación y notificará al coordinador que la situación fue resuelta.
              </AlertDescription>
            </Alert>
            <div>
              <Label>¿Cómo se resolvió la situación? *</Label>
              <TextareaUI
                placeholder="Explica las acciones tomadas y la resolución..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                className="text-sm mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleResolve}
              disabled={!resolutionNotes.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar Resuelta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de contexto */}
      <Dialog open={showContextDialog} onOpenChange={setShowContextDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Contexto de la Conversación con Coordinador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Alert className="bg-orange-50 border-orange-300">
              <AlertDescription className="text-orange-800 text-sm">
                <strong>📋 Historial de mensajes previos</strong>
                <br />
                Estos son los últimos mensajes entre {conversation.padre_nombre} y el coordinador antes de la escalación
              </AlertDescription>
            </Alert>
            <div className="bg-slate-50 rounded-lg p-4">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                {conversation.contexto_escalacion || 'No hay contexto disponible'}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header compacto */}
      <div className="p-2 bg-white border-b flex-shrink-0">
        <Alert className={`mb-3 border-2 ${criticityColors[conversation.criticidad]}`}>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-sm ml-2">
            <strong>🚨 ESCALACIÓN {conversation.criticidad?.toUpperCase()}</strong>
            <br />
            <strong>Motivo:</strong> {conversation.motivo_escalacion}
            <br />
            <strong>Escalado por:</strong> {conversation.coordinador_nombre_que_escalo} el {format(new Date(conversation.fecha_escalacion), "d 'de' MMM, HH:mm", { locale: es })}
            {conversation.motivo_detalle && (
              <>
                <br />
                <strong>Detalles:</strong> {conversation.motivo_detalle}
              </>
            )}
            <br />
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowContextDialog(true)}
              className="mt-2"
            >
              <MessageCircle className="w-3 h-3 mr-2" />
              Ver conversación previa con coordinador
            </Button>
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-slate-900">{conversation.padre_nombre}</h2>
            <p className="text-sm text-slate-500">
              {conversation.jugadores_asociados?.map(j => `${j.jugador_nombre} (${j.categoria})`).join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!conversation.resuelta && (
              <Button
                size="sm"
                onClick={() => setShowResolveDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar Resuelta
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
        {messages.map((msg) => {
          const isMine = msg.autor === "admin";
          const isInternalNote = msg.es_nota_interna;
          
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${
                isInternalNote ? 'bg-yellow-50 text-yellow-900 border-2 border-yellow-300' :
                isMine ? 'bg-red-600 text-white' : 
                'bg-white text-slate-900 border'
              } rounded-2xl p-3 shadow-sm`}>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold opacity-70">
                    {isInternalNote ? '📝 Nota Interna' : 
                     isMine ? '🛡️ Administrador' : 
                     msg.autor_nombre}
                  </p>
                  {isInternalNote && (
                    <Badge className="text-xs bg-yellow-500">Solo visible para admins</Badge>
                  )}
                </div>

                <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>

                {msg.archivos_adjuntos?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.archivos_adjuntos.map((file, idx) => (
                      file.tipo?.startsWith('image/') ? (
                        <img 
                          key={idx}
                          src={file.url} 
                          alt={file.nombre}
                          loading="lazy"
                          className="rounded cursor-pointer max-w-full h-auto max-h-64 object-contain bg-slate-200"
                          onClick={() => setShowImagePreview(file.url)}
                        />
                      ) : (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 text-xs p-2 rounded ${
                            isInternalNote ? 'bg-yellow-100' : isMine ? 'bg-red-700' : 'bg-slate-100'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="flex-1 truncate">{file.nombre}</span>
                          <Download className="w-3 h-3" />
                        </a>
                      )
                    ))}
                  </div>
                )}

                {msg.reacciones?.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {msg.reacciones.map((r, idx) => (
                      <span key={idx} className="text-base" title={r.nombre}>
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs opacity-60">
                    {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                  </p>
                  {!isInternalNote && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-50 hover:opacity-100 h-6 w-6 p-0"
                      onClick={() => setShowReactions(msg.id)}
                    >
                      <Smile className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {showReactions === msg.id && (
                  <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-xl p-2 flex gap-2 z-10 border">
                    {REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(msg.id, emoji)}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button onClick={() => setShowReactions(null)} className="ml-2 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!conversation.resuelta && (
        <div className="p-4 bg-white border-t flex-shrink-0 space-y-2">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="bg-slate-100 rounded px-3 py-1 text-xs flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{file.nombre}</span>
                  <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={uploading} 
            />
            
            <div className="flex gap-1 justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-8 px-3 text-xs"
              >
                <Paperclip className="w-3 h-3 mr-1" />
                Archivo
              </Button>
              <Button 
                onClick={handleSendInternalNote}
                disabled={!messageText.trim()}
                size="sm"
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 h-8 px-3 text-xs"
                title="Nota interna (solo admins)"
              >
                <Edit className="w-3 h-3 mr-1" />
                Nota interna
              </Button>
            </div>

            <div className="flex gap-2 items-end">
              <EmojiPicker 
                onEmojiSelect={(emoji) => setMessageText(prev => prev + emoji)}
                messageText={messageText}
              />
              
              <Textarea
                placeholder="Escribe tu mensaje..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 min-h-[44px] max-h-32 resize-none text-base py-3 px-3"
                rows={1}
                />

                <Button 
                onClick={handleSend} 
                disabled={!messageText.trim() && attachments.length === 0}
                className="bg-red-600 hover:bg-red-700 h-11 w-11 p-0 flex-shrink-0 rounded-full"
                >
                <Send className="w-5 h-5" />
                </Button>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            💡 Usa el botón <Edit className="w-3 h-3 inline" /> para notas internas (solo visibles para admins)
          </p>
        </div>
      )}

      {conversation.resuelta && (
        <div className="p-4 bg-green-50 border-t">
          <Alert className="bg-green-100 border-green-300">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800 text-sm">
              <strong>✅ Conversación resuelta</strong>
              <br />
              Resuelta el {format(new Date(conversation.fecha_resolucion), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
              {conversation.resolucion_notas && (
                <>
                  <br />
                  <strong>Resolución:</strong> {conversation.resolucion_notas}
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}