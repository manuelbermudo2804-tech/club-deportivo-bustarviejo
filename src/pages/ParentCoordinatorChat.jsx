import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, FileText, Download, MessageCircle, Info, Check, CheckCheck, Folder, AlertTriangle, Smile, Play, Pause } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea as DialogTextarea } from "@/components/ui/textarea";
import ChatInputActions from "../components/chat/ChatInputActions";
import SocialLinks from "../components/SocialLinks";
import ChatTermsDialog from "../components/chat/ChatTermsDialog";
import ParentChatInput from "../components/chat/ParentChatInput";
import EmojiScaler from "../components/chat/EmojiScaler";
import ChatImageBubble from "../components/chat/ChatImageBubble";
import ChatAudioBubble from "../components/chat/ChatAudioBubble";
import { useChatUnreadCounts } from "../components/chat/useChatUnreadCounts";

export default function ParentCoordinatorChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const messagesEndRef = useRef(null);

  const { markRead, clearActiveChat } = useChatUnreadCounts(user);
  const REACTIONS = ["👍", "❤️", "😊", "👏", "🎉"];
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();
  const audioRef = useRef(null);
  const [playingAudio, setPlayingAudio] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allPlayers = await base44.entities.Player.list();
      const players = allPlayers.filter(p => 
        (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email || p.email_jugador === currentUser.email) && p.activo
      );
      setMyPlayers(players);

      // Buscar o crear conversación
      const conversations = await base44.entities.CoordinatorConversation.filter({ 
        padre_email: currentUser.email 
      });

      let activeConv;
      if (conversations.length > 0) {
        activeConv = conversations[0];
      } else {
        activeConv = await base44.entities.CoordinatorConversation.create({
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
      }
      setConversation(activeConv);

      // Verificar si ya aceptó las condiciones
      if (!currentUser.condiciones_chat_aceptadas) {
        setShowTermsDialog(true);
      } else {
        setTermsAccepted(true);
      }

      // Marcar AppNotifications como vistas
      try {
        const notifs = await base44.entities.AppNotification.filter({
          usuario_email: currentUser.email,
          enlace: "ParentCoordinatorChat",
          vista: false
        });
        for (const n of notifs) {
          await base44.entities.AppNotification.update(n.id, { vista: true, fecha_vista: new Date().toISOString() });
        }
      } catch {}
      
      // Marcar mensajes del coordinador como leídos
      const allMessages = await base44.entities.CoordinatorMessage.filter({ conversacion_id: activeConv.id });
      const unreadCoordMessages = allMessages.filter(m => m.autor === "coordinador" && !m.leido_padre);

      for (const msg of unreadCoordMessages) {
        await base44.entities.CoordinatorMessage.update(msg.id, {
          leido_padre: true,
          fecha_leido_padre: new Date().toISOString()
        });
      }

      if (activeConv.no_leidos_familia > 0) {
        await base44.entities.CoordinatorConversation.update(activeConv.id, {
          no_leidos_familia: 0
        });
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
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 300000,
  });

  // Marcar como leído via backend persistente
  useEffect(() => {
    if (!conversation?.id || !user) return;
    markRead('coordinatorForFamily', conversation.id);
  }, [conversation?.id, user?.email]);

  // Al salir del chat 1-a-1, limpiar chat activo
  useEffect(() => {
    return () => {
      try { clearActiveChat(); } catch {}
    };
  }, []);

  // REAL-TIME: Suscripción a mensajes nuevos
  useEffect(() => {
    if (!conversation?.id) return;
    
    const unsub = base44.entities.CoordinatorMessage.subscribe((event) => {
      if (event.data?.conversacion_id === conversation.id) {
        queryClient.invalidateQueries({ queryKey: ['parentCoordinatorMessages', conversation.id] });
      }
    });
    
    return unsub;
  }, [conversation?.id, queryClient]);

  // Polling para estado "escribiendo"
  const { data: conversationState } = useQuery({
    queryKey: ['coordinatorConversationState', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return null;
      const data = await base44.entities.CoordinatorConversation.filter({ id: conversation.id });
      return data[0];
    },
    refetchInterval: false,
    staleTime: 300000,
    enabled: !!conversation?.id,
  });

  const coordinatorTyping = conversationState?.coordinador_escribiendo;

  useEffect(() => {
    // Scroll inmediato y confiable
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, coordinatorTyping]);





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
  const allSharedFiles = messages.flatMap(m => m.archivos_adjuntos || m.adjuntos || []);

  const sendMessageMutation = useMutation({
    onMutate: async (messageData) => {
      await queryClient.cancelQueries({ queryKey: ['parentCoordinatorMessages', conversation?.id] });
      const previousMessages = queryClient.getQueryData(['parentCoordinatorMessages', conversation?.id]);
      
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        mensaje: messageData.mensaje,
        autor: "padre",
        autor_email: user.email,
        autor_nombre: user.full_name,
        archivos_adjuntos: messageData.adjuntos || [],
        audio_url: messageData.audio_url,
        audio_duracion: messageData.audio_duracion,
        created_date: new Date().toISOString(),
        leido_padre: true,
        leido_coordinador: false,
      };
      
      queryClient.setQueryData(['parentCoordinatorMessages', conversation?.id], (old = []) => [...old, optimisticMessage]);
      return { previousMessages };
    },
    onError: (err, messageData, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['parentCoordinatorMessages', conversation?.id], context.previousMessages);
      }
      if (!err.message?.includes("lenguaje inapropiado")) {
        toast.error("Error al enviar mensaje");
      }
    },
    mutationFn: async (messageData) => {
      const palabrasProhibidas = [
        "idiota", "estupido", "estúpido", "imbecil", "imbécil", "tonto", 
        "basura", "mierda", "maldito", "puto", "puta", "joder", "coño",
        "gilipollas", "capullo", "hijo de", "desgraciado", "inutil", "inútil"
      ];
      
      const mensajeLower = messageData.mensaje.toLowerCase();
      const palabraEncontrada = palabrasProhibidas.find(p => mensajeLower.includes(p));
      
      if (palabraEncontrada) {
        toast.error("🚫 Tu mensaje contiene lenguaje inapropiado y no puede ser enviado. Por favor, reformúlalo de forma respetuosa.");
        
        const currentSeason = (() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth() + 1;
          return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
        })();
        
        await base44.entities.CoordinatorChatLog.create({
          conversacion_id: conversation.id,
          padre_email: user.email,
          padre_nombre: user.full_name,
          accion: "mensaje_bloqueado",
          autor: "padre",
          detalles: `Mensaje bloqueado por contener: "${palabraEncontrada}"`,
          palabra_bloqueada: palabraEncontrada,
          temporada: currentSeason
        });
        
        throw new Error("Mensaje bloqueado por lenguaje inapropiado");
      }

      const palabrasUrgentes = ["urgente", "grave", "lesión", "lesion", "accidente", "hospital", "ambulancia", "emergencia"];
      const palabraUrgente = palabrasUrgentes.find(p => mensajeLower.includes(p));

      const newMessage = await base44.entities.CoordinatorMessage.create({
        conversacion_id: conversation.id,
        autor: "padre",
        autor_email: user.email,
        autor_nombre: user.full_name,
        mensaje: messageData.mensaje,
        audio_url: messageData.audio_url,
        audio_duracion: messageData.audio_duracion,
        archivos_adjuntos: messageData.adjuntos || messageData.archivos_adjuntos || [],
        leido_padre: true,
        leido_coordinador: false,
        fecha_leido_padre: new Date().toISOString()
      });

      console.log('✅ [PADRE COORDINADOR] Mensaje creado:', newMessage.id);

      // Marcar conversación como prioritaria si contiene palabra urgente
      const updateData = {
        ultimo_mensaje: messageData.mensaje,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: "padre",
        no_leidos_coordinador: (conversation.no_leidos_coordinador || 0) + 1,
        archivada: false
      };

      if (palabraUrgente) {
        updateData.prioritaria = true;
        toast.warning("⚠️ Tu mensaje contiene una palabra urgente. Se ha marcado como prioritario para el coordinador.");
      }

      await base44.entities.CoordinatorConversation.update(conversation.id, updateData);

      // Registrar mensaje enviado
      const currentSeason = (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
      })();
      
      await base44.entities.CoordinatorChatLog.create({
        conversacion_id: conversation.id,
        padre_email: user.email,
        padre_nombre: user.full_name,
        accion: palabraUrgente ? "palabra_urgente_detectada" : "mensaje_enviado",
        autor: "padre",
        detalles: palabraUrgente ? `Palabra urgente: "${palabraUrgente}"` : "Mensaje enviado correctamente",
        palabra_urgente: palabraUrgente,
        temporada: currentSeason
      });

      // Crear AppNotification para el coordinador
      try {
        const allSettings = await base44.entities.CoordinatorSettings.list();
        const coordinatorEmails = Array.from(new Set(allSettings.map(s => s.coordinador_email).filter(Boolean)));
        await Promise.all(coordinatorEmails
          .filter(email => email !== user.email)
          .map(email => base44.entities.AppNotification.create({
            usuario_email: email,
            titulo: `💬 Mensaje de ${user.full_name}`,
            mensaje: (messageData.mensaje || "Mensaje").substring(0, 100) + ((messageData.mensaje || "").length > 100 ? '...' : ''),
            tipo: "importante",
            icono: "💬",
            enlace: "CoordinatorChat",
            vista: false
          })));
      } catch (_) {}

       // Configuración del coordinador (respuestas automáticas)
       // TODO: Implementar respuestas automáticas

      return newMessage;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parentCoordinatorMessages', conversation.id] }),
        queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] }),
        queryClient.refetchQueries({ queryKey: ['parentCoordinatorMessages', conversation.id] }),
      ]);
    }
  });

  const handleSendMessage = useCallback((messageData) => {
    if (!termsAccepted) {
      toast.error("Debes aceptar las condiciones de uso antes de enviar mensajes");
      setShowTermsDialog(true);
      return;
    }
    
    if (user?.chat_bloqueado === true) {
      toast.error("🚫 Tu acceso al chat ha sido restringido por el administrador.");
      return;
    }
    
    sendMessageMutation.mutate(messageData);
  }, [termsAccepted, user?.chat_bloqueado, sendMessageMutation]);

  const togglePlayAudio = async (audioUrl) => {
    try {
      if (playingAudio === audioUrl) {
        audioRef.current?.pause();
        setPlayingAudio(null);
      } else {
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
          setPlayingAudio(audioUrl);
        }
      }
    } catch (error) {
      setPlayingAudio(null);
      toast.error("Error al reproducir el audio");
    }
  };

  const addReaction = async (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    const existingReactions = message.reacciones || [];
    
    const alreadyReacted = existingReactions.find(r => r.user_email === user.email && r.emoji === emoji);
    
    let newReactions;
    if (alreadyReacted) {
      newReactions = existingReactions.filter(r => !(r.user_email === user.email && r.emoji === emoji));
    } else {
      newReactions = [...existingReactions, {
        user_email: user.email,
        user_nombre: user.full_name,
        emoji: emoji,
        fecha: new Date().toISOString()
      }];
    }

    await base44.entities.CoordinatorMessage.update(messageId, {
      reacciones: newReactions
    });

    queryClient.invalidateQueries({ queryKey: ['parentCoordinatorMessages'] });
    setShowReactions(null);
  };

  const reportConversationMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CoordinatorConversation.update(conversation.id, {
        reportada_admin: true,
        reportada_por: user.email,
        reportada_nombre: user.full_name,
        fecha_reporte: new Date().toISOString(),
        motivo_reporte: reportReason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parentCoordinatorMessages'] });
      setShowReportDialog(false);
      setReportReason("");
      toast.success("✅ Conversación reportada. El administrador la revisará pronto.");
    },
  });

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
    <>
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />
      {user && (
        <ChatTermsDialog
          open={showTermsDialog}
          onAccept={() => {
            setShowTermsDialog(false);
            setTermsAccepted(true);
          }}
          onDecline={() => {
            toast.error("Debes aceptar las condiciones para usar el chat");
            window.history.back();
          }}
          user={user}
          tipoChat="coordinador"
        />
      )}
      <div className="fixed inset-0 lg:inset-auto lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:bottom-0 flex flex-col overflow-hidden pt-[100px] lg:pt-0 pb-0">
        <Card className="border-cyan-200 shadow-lg h-full flex flex-col overflow-hidden lg:rounded-lg rounded-none">
        <CardHeader className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4" />
              Chat Coordinador
              {conversation?.reportada_admin && (
                <Badge className="bg-red-500 text-white text-xs ml-2">
                  🔴 Bajo revisión
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-1">
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
              {!conversation?.reportada_admin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowReportDialog(true)}
                  className="text-white hover:bg-white/20 text-xs sm:text-sm"
                  title="Reportar conversación al administrador"
                >
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">


          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0 min-h-0" style={{backgroundColor: '#E5DDD5'}}>
                    {!messages || messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-xs sm:text-sm">¡Inicia la conversación!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                const isPadre = msg.autor === "padre";
                const isImage = (msg.archivos_adjuntos || msg.adjuntos)?.some(f => f.tipo?.startsWith('image/'));
                
                return (
                  <div key={msg.id} className={`flex ${isPadre ? 'justify-end mr-2' : 'justify-start ml-2'} mb-1.5`}>
                    <div className="max-w-[72%] px-3 py-2 relative rounded-2xl" style={{
                      backgroundColor: isPadre ? '#DCF8C6' : '#FFFFFF',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      fontSize: '15px',
                      lineHeight: '1.4',
                      fontWeight: 400,
                      wordWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
                    }}>
                      {!isPadre && (
                        <p className="text-xs font-medium mb-1" style={{color: '#0891B2'}}>
                          🎓 {msg.autor_nombre}
                        </p>
                      )}
                      
                      {msg.audio_url ? (
                        <div className="mt-1">
                          <ChatAudioBubble url={msg.audio_url} duration={msg.audio_duracion} isMine={isPadre} />
                        </div>
                      ) : (
                        <p style={{fontSize: '15px', lineHeight: '1.4', fontWeight: 400, whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>
                          <EmojiScaler content={msg.mensaje} />
                        </p>
                      )}
                      {(() => {
                        const attachments = msg.archivos_adjuntos || msg.adjuntos || [];
                        const images = attachments.filter(f => f.tipo?.startsWith('image/') || f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                        const audios = attachments.filter(f => f.tipo?.startsWith('audio/'));
                        const files = attachments.filter(f => !f.tipo?.startsWith('image/') && !f.tipo?.startsWith('audio/'));
                        return (
                          <>
                            {images.length > 0 && <div className="mt-1"><ChatImageBubble images={images} isMine={isPadre} /></div>}
                            {audios.map((file, idx) => <div key={`a-${idx}`} className="mt-1"><ChatAudioBubble url={file.url} duration={file.duracion} isMine={isPadre} /></div>)}
                            {files.length > 0 && <div className="mt-1 space-y-1">{files.map((file, idx) => (
                              <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs p-2 rounded ${isPadre ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                <FileText className="w-3 h-3" /><span className="flex-1 truncate">{file.nombre}</span><Download className="w-3 h-3" />
                              </a>
                            ))}</div>}
                          </>
                        );
                      })()}
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <p className="text-[11px]" style={{color: '#667781'}}>
                          {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                        </p>
                        {isPadre && (
                          <div className="flex items-center">
                            {msg.leido_coordinador ? (
                              <CheckCheck className="w-3 h-3 text-white opacity-70" />
                            ) : (
                              <Check className="w-3 h-3 opacity-50" />
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

          {user?.chat_bloqueado && (
            <div className="px-2 pb-2">
              <Alert className="bg-red-50 border-red-300">
                <AlertDescription className="text-red-800 text-sm">
                  🚫 <strong>Tu acceso al chat ha sido restringido</strong>
                  {user?.motivo_bloqueo_chat && <><br />Motivo: {user.motivo_bloqueo_chat}</>}
                  <br />
                  <span className="text-xs">Contacta con el administrador del club para más información.</span>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <ParentChatInput
             onSendMessage={handleSendMessage}
             uploading={uploading}
             placeholder={user?.chat_bloqueado ? "Chat bloqueado" : "Escribe tu mensaje..."}
           />
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

      {/* Dialog: Reportar Conversación */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              ⚠️ Reportar Conversación
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Solo usa esto si hay un problema serio que requiera supervisión administrativa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-red-50 border-red-300">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800 ml-2 text-sm">
                <strong>Al reportar:</strong> El administrador podrá ver esta conversación completa para resolver el problema.
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-slate-700">✋ Solo reporta si hay:</p>
              <ul className="text-xs text-slate-600 space-y-1 ml-4">
                <li>• Conflicto serio con el coordinador</li>
                <li>• Falta de comunicación importante</li>
                <li>• Cualquier problema que requiera intervención</li>
              </ul>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Describe brevemente el problema (opcional):
              </label>
              <DialogTextarea
                placeholder="Ej: No responde a mis mensajes sobre horarios..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => reportConversationMutation.mutate()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              ⚠️ Sí, reportar conversación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}