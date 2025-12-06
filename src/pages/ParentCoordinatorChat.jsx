import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, FileText, Download, MessageCircle, Info, Check, CheckCheck, Folder, Image as ImageIcon, Camera } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ParentCoordinatorChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allPlayers = await base44.entities.Player.list();
      const players = allPlayers.filter(p => 
        (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email) && p.activo
      );
      setMyPlayers(players);

      // Buscar o crear conversación
      const conversations = await base44.entities.CoordinatorConversation.filter({ 
        padre_email: currentUser.email 
      });

      if (conversations.length > 0) {
        setConversation(conversations[0]);
      } else {
        // Crear conversación nueva
        const newConv = await base44.entities.CoordinatorConversation.create({
          padre_email: currentUser.email,
          padre_nombre: currentUser.full_name,
          jugadores_asociados: players.map(p => ({
            jugador_id: p.id,
            jugador_nombre: p.nombre,
            categoria: p.deporte
          })),
          no_leidos_coordinador: 0,
          no_leidos_padre: 0,
          archivada: false
        });
        setConversation(newConv);
      }
    };
    fetchUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['parentCoordinatorMessages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      return await base44.entities.CoordinatorMessage.filter({ conversacion_id: conversation.id }, 'created_date');
    },
    enabled: !!conversation?.id,
    refetchInterval: 3000,
  });

  // Polling para estado "escribiendo"
  const { data: conversationState } = useQuery({
    queryKey: ['coordinatorConversationState', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return null;
      const data = await base44.entities.CoordinatorConversation.filter({ id: conversation.id });
      return data[0];
    },
    refetchInterval: 2000,
    enabled: !!conversation?.id,
  });

  const coordinatorTyping = conversationState?.coordinador_escribiendo;

  useEffect(() => {
    // Scroll inmediato y confiable
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, coordinatorTyping]);

  // Marcar como leído cuando abre el chat
  useEffect(() => {
    if (!conversation) return;

    const markAsRead = async () => {
      if (conversation.no_leidos_padre > 0) {
        await base44.entities.CoordinatorConversation.update(conversation.id, {
          no_leidos_padre: 0
        });

        const unreadMessages = messages.filter(m => m.autor === "coordinador" && !m.leido_padre);
        for (const msg of unreadMessages) {
          await base44.entities.CoordinatorMessage.update(msg.id, {
            leido_padre: true,
            fecha_leido_padre: new Date().toISOString()
          });
        }

        queryClient.invalidateQueries({ queryKey: ['parentCoordinatorMessages', conversation.id] });
      }
    };
    markAsRead();
  }, [conversation, messages]);

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
          tipo: file.type,
          tamano: file.size
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

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachments([...attachments, {
        url: file_url,
        nombre: file.name,
        tipo: file.type,
        tamano: file.size
      }]);
      toast.success("Foto capturada");
    } catch (error) {
      toast.error("Error al capturar foto");
    } finally {
      setUploading(false);
    }
  };

  // Indicador "escribiendo..."
  const handleTyping = async () => {
    if (!conversation) return;
    
    clearTimeout(typingTimeoutRef.current);
    
    await base44.entities.CoordinatorConversation.update(conversation.id, {
      padre_escribiendo: true,
      ultima_actividad_escribiendo: new Date().toISOString()
    });

    typingTimeoutRef.current = setTimeout(async () => {
      await base44.entities.CoordinatorConversation.update(conversation.id, {
        padre_escribiendo: false
      });
    }, 3000);
  };

  // Filtrar todos los archivos compartidos
  const allSharedFiles = messages.flatMap(m => m.adjuntos || []);

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await base44.entities.CoordinatorMessage.create({
        conversacion_id: conversation.id,
        autor: "padre",
        autor_email: user.email,
        autor_nombre: user.full_name,
        mensaje: data.mensaje,
        adjuntos: data.adjuntos,
        leido_padre: true,
        leido_coordinador: false,
        fecha_leido_padre: new Date().toISOString()
      });

      await base44.entities.CoordinatorConversation.update(conversation.id, {
        ultimo_mensaje: data.mensaje,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: "padre",
        no_leidos_coordinador: (conversation.no_leidos_coordinador || 0) + 1,
        archivada: false
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parentCoordinatorMessages', conversation.id] });
      setMessageText("");
      setAttachments([]);
      toast.success("Mensaje enviado al coordinador");
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ mensaje: messageText, adjuntos: attachments });
  };

  if (!conversation || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-2"></div>
          <p className="text-slate-500 text-sm">Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-4 lg:max-w-4xl lg:mx-auto h-screen sm:h-[calc(100vh-110px)]">
      <Card className="border-cyan-200 shadow-lg h-full flex flex-col overflow-hidden sm:rounded-lg rounded-none">
        <CardHeader className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-2 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-xl">
              <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6" />
              Chat Coordinador
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowGallery(!showGallery)}
              className="text-white hover:bg-white/20 text-xs sm:text-sm"
            >
              <Folder className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Archivos ({allSharedFiles.length})</span>
              <span className="sm:hidden">{allSharedFiles.length}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <Alert className="m-2 sm:m-4 bg-cyan-50 border-cyan-200 flex-shrink-0">
            <MessageCircle className="w-4 h-4 text-cyan-600" />
            <AlertDescription className="text-cyan-800 text-xs">
              <strong>💬 Chat Coordinador:</strong> Partidos, horarios, quejas
            </AlertDescription>
          </Alert>

          {/* Galería de archivos */}
          {showGallery && (
            <div className="p-4 bg-white border-b max-h-[200px] overflow-y-auto flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">📁 Archivos Compartidos</h3>
                <Button size="sm" variant="ghost" onClick={() => setShowGallery(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {allSharedFiles.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No hay archivos compartidos</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allSharedFiles.map((file, idx) => (
                    file.tipo?.startsWith('image/') ? (
                      <img 
                        key={idx}
                        src={file.url}
                        alt={file.nombre}
                        className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                        onClick={() => setShowImagePreview(file.url)}
                      />
                    ) : (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 p-3 bg-slate-100 rounded hover:bg-slate-200"
                      >
                        <FileText className="w-8 h-8 text-slate-600" />
                        <span className="text-xs truncate w-full text-center">{file.nombre}</span>
                      </a>
                    )
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 bg-slate-50">
                    {!messages || messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-xs sm:text-sm">¡Inicia la conversación!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                const isPadre = msg.autor === "padre";
                const isImage = msg.adjuntos?.some(f => f.tipo?.startsWith('image/'));
                
                return (
                  <div key={msg.id} className={`flex ${isPadre ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] sm:max-w-[70%] ${isPadre ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border'} rounded-2xl p-2 sm:p-3 shadow-sm`}>
                      <p className="text-[10px] sm:text-xs font-semibold mb-1 opacity-70">{msg.autor_nombre}</p>
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                      {msg.adjuntos?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.adjuntos.map((file, idx) => (
                            file.tipo?.startsWith('image/') ? (
                              <img 
                                key={idx}
                                src={file.url}
                                alt={file.nombre}
                                className="rounded cursor-pointer max-w-full h-auto hover:opacity-80"
                                onClick={() => setShowImagePreview(file.url)}
                              />
                            ) : (
                              <a
                                key={idx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 text-xs p-2 rounded ${isPadre ? 'bg-slate-700' : 'bg-slate-100'}`}
                              >
                                <FileText className="w-3 h-3" />
                                <span className="flex-1 truncate">{file.nombre}</span>
                                <Download className="w-3 h-3" />
                              </a>
                            )
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] sm:text-xs opacity-60">
                          {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                        </p>
                        {isPadre && (
                          <div className="flex items-center gap-1">
                            {msg.leido_coordinador ? (
                              <CheckCheck className="w-4 h-4 text-cyan-400" />
                            ) : (
                              <Check className="w-4 h-4 opacity-50" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 sm:p-4 bg-white border-t flex-shrink-0">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1 sm:gap-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="relative">
                    {file.tipo?.startsWith('image/') ? (
                      <div className="relative">
                        <img src={file.url} alt="" className="w-16 h-16 object-cover rounded" />
                        <button 
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-100 rounded px-2 py-1 text-xs flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{file.nombre}</span>
                        <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1 sm:gap-2 items-end">
              <div className="flex flex-col gap-1">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  multiple 
                  accept="*/*" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  disabled={uploading} 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  disabled={uploading} 
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                
                <input 
                  ref={cameraInputRef}
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={handleCameraCapture} 
                  disabled={uploading} 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  disabled={uploading} 
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
              <Textarea
                placeholder="Escribe..."
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 min-h-[36px] sm:min-h-[44px] resize-none text-sm"
                rows={1}
              />
              <Button onClick={handleSend} disabled={!messageText.trim() && attachments.length === 0} className="bg-cyan-600 hover:bg-cyan-700 h-9 w-9 sm:h-10 sm:w-10 p-0">
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vista previa de imagen */}
      {showImagePreview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowImagePreview(null)}>
          <div className="relative max-w-4xl w-full">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowImagePreview(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white"
            >
              <X className="w-6 h-6" />
            </Button>
            <img src={showImagePreview} alt="Preview" className="w-full h-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}