import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, FileText, Download, MessageCircle, Camera, Folder } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ParentCoachChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
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

      // Agrupar jugadores por categoría y buscar/crear conversaciones
      const byCategory = {};
      players.forEach(p => {
        if (!byCategory[p.deporte]) {
          byCategory[p.deporte] = [];
        }
        byCategory[p.deporte].push(p);
      });

      const allConversations = await base44.entities.CoachConversation.filter({ 
        padre_email: currentUser.email 
      });

      const convs = [];
      for (const categoria in byCategory) {
        let conv = allConversations.find(c => c.categoria === categoria);
        
        if (!conv) {
          // Buscar entrenador de esta categoría
          const allUsers = await base44.entities.User.list();
          const coach = allUsers.find(u => 
            u.es_entrenador && u.categorias_entrena?.includes(categoria)
          );

          if (coach) {
            conv = await base44.entities.CoachConversation.create({
              padre_email: currentUser.email,
              padre_nombre: currentUser.full_name,
              entrenador_email: coach.email,
              entrenador_nombre: coach.full_name,
              categoria: categoria,
              jugadores_asociados: byCategory[categoria].map(p => ({
                jugador_id: p.id,
                jugador_nombre: p.nombre
              })),
              no_leidos_entrenador: 0,
              no_leidos_padre: 0,
              archivada: false
            });
          }
        }

        if (conv) {
          convs.push(conv);
        }
      }

      setConversations(convs);
      if (convs.length > 0 && !selectedConversation) {
        setSelectedConversation(convs[0]);
      }
    };
    fetchUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['coachMessages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      return await base44.entities.CoachMessage.filter({ conversacion_id: selectedConversation.id }, 'created_date');
    },
    enabled: !!selectedConversation?.id,
    refetchInterval: 3000,
  });

  const { data: conversationState } = useQuery({
    queryKey: ['coachConversationState', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return null;
      const data = await base44.entities.CoachConversation.filter({ id: selectedConversation.id });
      return data[0];
    },
    refetchInterval: 2000,
    enabled: !!selectedConversation?.id,
  });

  const coachTyping = conversationState?.entrenador_escribiendo;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, coachTyping]);

  useEffect(() => {
    if (!selectedConversation) return;

    const markAsRead = async () => {
      if (selectedConversation.no_leidos_padre > 0) {
        await base44.entities.CoachConversation.update(selectedConversation.id, {
          no_leidos_padre: 0
        });

        const unreadMessages = messages.filter(m => m.autor === "entrenador" && !m.leido_padre);
        for (const msg of unreadMessages) {
          await base44.entities.CoachMessage.update(msg.id, {
            leido_padre: true,
            fecha_leido_padre: new Date().toISOString()
          });
        }

        queryClient.invalidateQueries({ queryKey: ['coachMessages', selectedConversation.id] });
      }
    };
    markAsRead();
  }, [selectedConversation, messages]);

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

  const handleTyping = async () => {
    if (!selectedConversation) return;
    
    clearTimeout(typingTimeoutRef.current);
    
    await base44.entities.CoachConversation.update(selectedConversation.id, {
      padre_escribiendo: true,
      ultima_actividad_escribiendo: new Date().toISOString()
    });

    typingTimeoutRef.current = setTimeout(async () => {
      await base44.entities.CoachConversation.update(selectedConversation.id, {
        padre_escribiendo: false
      });
    }, 3000);
  };

  const allSharedFiles = messages.flatMap(m => m.adjuntos || []);

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await base44.entities.CoachMessage.create({
        conversacion_id: selectedConversation.id,
        autor: "padre",
        autor_email: user.email,
        autor_nombre: user.full_name,
        mensaje: data.mensaje,
        adjuntos: data.adjuntos,
        leido_padre: true,
        leido_entrenador: false,
        fecha_leido_padre: new Date().toISOString()
      });

      await base44.entities.CoachConversation.update(selectedConversation.id, {
        ultimo_mensaje: data.mensaje,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: "padre",
        no_leidos_entrenador: (selectedConversation.no_leidos_entrenador || 0) + 1,
        archivada: false,
        padre_escribiendo: false
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachMessages', selectedConversation.id] });
      setMessageText("");
      setAttachments([]);
      toast.success("Mensaje enviado al entrenador");
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ mensaje: messageText, adjuntos: attachments });
  };

  if (!user || conversations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-slate-500 text-sm">Cargando chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:max-w-6xl lg:mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">💬 Chat con Entrenadores</h1>
        <p className="text-slate-600 text-sm">Consultas sobre rendimiento, entrenamientos y desarrollo</p>
      </div>

      <Tabs value={selectedConversation?.id} onValueChange={(id) => {
        const conv = conversations.find(c => c.id === id);
        setSelectedConversation(conv);
      }}>
        <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${conversations.length}, 1fr)` }}>
          {conversations.map(conv => (
            <TabsTrigger key={conv.id} value={conv.id} className="relative">
              {conv.categoria.split(' ')[1] || conv.categoria}
              {conv.no_leidos_padre > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {conv.no_leidos_padre}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {conversations.map(conv => (
          <TabsContent key={conv.id} value={conv.id} className="mt-4">
            <Card className="border-blue-200 shadow-lg h-[calc(100vh-280px)] flex flex-col overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Entrenador {conv.categoria}
                    </CardTitle>
                    <p className="text-xs text-blue-100 mt-1">
                      {conv.jugadores_asociados?.map(j => j.jugador_nombre).join(', ')}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowGallery(!showGallery)}
                    className="text-white hover:bg-white/20"
                  >
                    <Folder className="w-4 h-4 mr-2" />
                    Archivos ({allSharedFiles.length})
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                <Alert className="m-4 bg-blue-50 border-blue-200 flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-xs">
                    <strong>💬 Chat con el Entrenador:</strong> Rendimiento, entrenamientos, desarrollo deportivo
                  </AlertDescription>
                </Alert>

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

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 min-h-0">
                  {!messages || messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">¡Inicia la conversación con el entrenador!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isPadre = msg.autor === "padre";
                      
                      return (
                        <div key={msg.id} className={`flex ${isPadre ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${isPadre ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border'} rounded-2xl p-3 shadow-sm`}>
                            <p className="text-xs font-semibold mb-1 opacity-70">{msg.autor_nombre}</p>
                            <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
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
                            <p className="text-xs opacity-60 mt-1">
                              {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {coachTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl p-3 shadow-sm border">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t flex-shrink-0">
                  {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
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
                  <div className="flex gap-2 items-end">
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
                        className="h-10 w-10"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="w-5 h-5" />
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
                        className="h-10 w-10"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="w-5 h-5" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Escribe tu mensaje..."
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
                      className="flex-1 min-h-[44px] resize-none"
                      rows={1}
                    />
                    <Button onClick={handleSend} disabled={!messageText.trim() && attachments.length === 0} className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0">
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

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