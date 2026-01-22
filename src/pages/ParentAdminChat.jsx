import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Send, FileText, Download, Paperclip, X, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { sendWithQueue } from "../components/utils/messageQueue";
import { markAdminConversationAsRead } from "../components/utils/markAsRead";
import EmojiPicker from "../components/chat/EmojiPicker";

export default function ParentAdminChat() {
  const [user, setUser] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const messagesContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['parentAdminConversation', user?.email],
    queryFn: async () => {
      const all = await base44.entities.AdminConversation.filter({ 
        padre_email: user.email,
        resuelta: false
      });
      return all[0] || null;
    },
    enabled: !!user,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['parentAdminMessages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      const all = await base44.entities.AdminMessage.filter({ 
        conversacion_id: conversation.id 
      }, 'created_date');
      return all.filter(m => !m.es_nota_interna);
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 300000,
    enabled: !!conversation?.id,
  });

  // REAL-TIME: Suscripción a mensajes del admin
  useEffect(() => {
    if (!conversation?.id) return;
    
    const unsub = base44.entities.AdminMessage.subscribe((event) => {
      if (event.data?.conversacion_id === conversation.id && !event.data?.es_nota_interna) {
        queryClient.invalidateQueries({ queryKey: ['parentAdminMessages', conversation.id] });
        queryClient.invalidateQueries({ queryKey: ['parentAdminConversation'] });
      }
    });
    
    return unsub;
  }, [conversation?.id, queryClient]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
    
    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Robust subscriptions: refetch on regain focus/online
  useEffect(() => {
    const onOnline = () => {
      if (!conversation?.id) return;
      queryClient.invalidateQueries({ queryKey: ['parentAdminMessages', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['parentAdminConversation'] });
    };
    const onVis = () => {
      if (!document.hidden && conversation?.id) {
        queryClient.invalidateQueries({ queryKey: ['parentAdminMessages', conversation.id] });
        queryClient.invalidateQueries({ queryKey: ['parentAdminConversation'] });
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('visibilitychange', onVis);
    };
  }, [conversation?.id, queryClient]);

  // Marcar como leído (centralizado)
  useEffect(() => {
    if (!conversation?.id) return;
    if ((conversation.no_leidos_padre || 0) === 0 && !messages.some(m => m.autor === 'admin' && !m.leido_padre)) return;
    markAdminConversationAsRead(conversation.id, 'parent', queryClient);
  }, [conversation?.id, messages]);

  const sendAdminMessageCore = async (data) => {
    await base44.entities.AdminMessage.create({
      conversacion_id: conversation.id,
      autor: "padre",
      autor_email: user.email,
      autor_nombre: user.full_name,
      mensaje: data.mensaje,
      archivos_adjuntos: data.archivos_adjuntos || [],
      leido_padre: true,
      leido_admin: false,
      fecha_leido_padre: new Date().toISOString()
    });

    await base44.entities.AdminConversation.update(conversation.id, {
      ultimo_mensaje: data.mensaje,
      ultimo_mensaje_fecha: new Date().toISOString(),
      ultimo_mensaje_autor: "padre",
      no_leidos_admin: (conversation.no_leidos_admin || 0) + 1
    });

    const allUsers = await base44.entities.User.list();
    const admins = allUsers.filter(u => u.role === "admin");
    for (const admin of admins) {
      await base44.entities.AppNotification.create({
        usuario_email: admin.email,
        titulo: `🚨 Respuesta en conversación crítica`,
        mensaje: `${user.full_name}: ${data.mensaje.substring(0, 100)}`,
        tipo: "urgente",
        icono: "🚨",
        enlace: "AdminChat",
        vista: false
      });
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      return await sendAdminMessageCore(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parentAdminMessages'] });
      queryClient.invalidateQueries({ queryKey: ['parentAdminConversation'] });
      setMessageText("");
      setAttachments([]);
      toast.success("Mensaje enviado al administrador");
    },
  });

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

  const handleSend = async () => {
    if (!messageText.trim() && attachments.length === 0) return;
    
    // Guardar los datos antes de limpiar
    const dataToSend = { 
      mensaje: messageText, 
      archivos_adjuntos: attachments 
    };
    
    // Limpiar inmediatamente para mejor UX
    setMessageText("");
    setAttachments([]);
    
    // Enviar (robusto)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      sendWithQueue('admin', sendAdminMessageCore, dataToSend, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['parentAdminMessages', conversation.id] });
          queryClient.invalidateQueries({ queryKey: ['parentAdminConversation'] });
        }
      });
    } else {
      sendMessageMutation.mutate(dataToSend);
    }
  };

  if (!user) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <ShieldAlert className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">No hay conversaciones activas</h2>
            <p className="text-slate-600 text-sm">
              No tienes ninguna conversación abierta con el administrador del club en este momento.
            </p>
            <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-blue-800 text-sm">
                💡 Las conversaciones con el administrador se abren cuando un coordinador escala una situación crítica que requiere intervención directa.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const criticityColors = {
    "Crítica": "bg-red-100 text-red-800 border-red-300",
    "Alta": "bg-orange-100 text-orange-800 border-orange-300",
    "Media": "bg-yellow-100 text-yellow-800 border-yellow-300",
    "Baja": "bg-green-100 text-green-800 border-green-300"
  };

  return (
    <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-110px)]">
      <Card className="h-full flex flex-col overflow-hidden">
        {/* Header compacto */}
        <div className="p-2 bg-gradient-to-r from-red-600 to-red-700 text-white flex-shrink-0">
          <Alert className={`mb-3 border-2 ${criticityColors[conversation.criticidad]}`}>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-sm ml-2">
              <strong>🛡️ Conversación con el Administrador</strong>
              <br />
              Esta conversación fue escalada por el coordinador deportivo debido a: <strong>{conversation.motivo_escalacion}</strong>
              <br />
              <span className="text-xs opacity-90">
                Escalada el {format(new Date(conversation.fecha_escalacion), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
              </span>
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Chat Administrador
              </h1>
            </div>
            {conversation.resuelta && (
              <Badge className="bg-green-500 text-white">
                ✅ Resuelta
              </Badge>
            )}
          </div>
        </div>

        {/* Mensajes */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-slate-50 relative" style={{ fontFamily: 'Roboto, sans-serif' }}>
          {messages.map((msg, index) => {
            const isMine = msg.autor === "padre";
            
            const prevMsg = messages[index - 1];
            const nextMsg = messages[index + 1];
            const prevIsSameAuthor = prevMsg && prevMsg.autor === msg.autor;
            const nextIsSameAuthor = nextMsg && nextMsg.autor === msg.autor;
            
            const marginTop = prevIsSameAuthor ? '1px' : '6px';
            const marginBottom = nextIsSameAuthor ? '1px' : '6px';
            
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`} style={{ marginTop, marginBottom }}>
                <div className={`max-w-[85%] relative`} style={{
                  backgroundColor: isMine ? '#DCF8C6' : '#FFFFFF',
                  borderRadius: isMine ? '7.5px 7.5px 2px 7.5px' : '7.5px 7.5px 7.5px 2px',
                  padding: '6px 7px 8px 9px',
                  color: '#111111',
                  minHeight: '32px',
                  minWidth: '40px',
                  letterSpacing: '0',
                  fontKerning: 'normal',
                  width: 'fit-content',
                  boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
                }}>
                  <p className="text-xs font-semibold opacity-70 mb-1">
                    {isMine ? user.full_name : '🛡️ Administrador del Club'}
                  </p>

                  <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '6px', width: '100%' }}>
                    <p className="whitespace-pre-wrap" style={{ 
                      fontSize: msg.mensaje?.trim().length <= 3 ? '32px' : '15px',
                      lineHeight: '1.32',
                      color: '#111111',
                      wordWrap: 'break-word',
                      flex: '1 1 auto',
                      minWidth: 0
                    }}>
                      {msg.mensaje}
                    </p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#667781' }}>
                        {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>

                  {msg.archivos_adjuntos?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.archivos_adjuntos.map((file, idx) => (
                        file.tipo?.startsWith('image/') ? (
                          <img 
                            key={idx}
                            src={file.url} 
                            alt={file.nombre}
                            loading="lazy"
                            className="rounded cursor-pointer max-w-full h-auto bg-slate-200"
                            onClick={() => setShowImagePreview(file.url)}
                          />
                        ) : (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-xs p-2 rounded ${
                              isMine ? 'bg-blue-700' : 'bg-red-700'
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


                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
          
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-slate-50 transition-all z-10"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7 10L12 15L17 10" stroke="#667781" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Input */}
        {!conversation.resuelta ? (
          <div className="p-2 bg-white border-t flex-shrink-0 space-y-2">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 text-xs">
                💡 Contacto directo con dirección del club. Mantén un tono respetuoso.
              </AlertDescription>
            </Alert>

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

            <WhatsAppInputBar
              messageText={messageText}
              setMessageText={setMessageText}
              onSend={handleSend}
              attachments={attachments}
              setAttachments={setAttachments}
              recording={false}
              audioBlob={null}
              onStartRecording={() => {}}
              onStopRecording={() => {}}
              onSendAudio={() => {}}
              onCancelAudio={() => {}}
              audioDuration={0}
              uploading={uploading}
              onFileUpload={handleFileUpload}
              onCameraCapture={() => {}}
              onLocationClick={() => {}}
              onPollClick={() => {}}
              showExercise={false}
              placeholder="Escribe tu mensaje..."
              onTyping={null}
            />
          </div>
        ) : (
          <div className="p-4 bg-green-50 border-t">
            <Alert className="bg-green-100 border-green-300">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                <strong>✅ Situación resuelta</strong>
                <br />
                El administrador ha marcado esta situación como resuelta el {format(new Date(conversation.fecha_resolucion), "d 'de' MMMM", { locale: es })}
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
      </Card>

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
    </div>
  );
}