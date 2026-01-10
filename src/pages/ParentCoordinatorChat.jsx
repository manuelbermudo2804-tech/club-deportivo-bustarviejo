import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, FileText, Download, MessageCircle, Info, Check, CheckCheck, Folder, Image as ImageIcon, Camera, AlertTriangle, Smile } from "lucide-react";
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

export default function ParentCoordinatorChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
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

  const REACTIONS = ["👍", "❤️", "😊", "👏", "🎉"];
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
        (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email || p.email_jugador === currentUser.email) && p.activo
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

      // Verificar si ya aceptó las condiciones
      if (!currentUser.condiciones_chat_aceptadas) {
        setShowTermsDialog(true);
      } else {
        setTermsAccepted(true);
      }

      // Marcar notificaciones de coordinador como vistas
      const notifications = await base44.entities.AppNotification.filter({ 
        usuario_email: currentUser.email,
        enlace: "ParentCoordinatorChat",
        vista: false
      });
      
      for (const notif of notifications) {
        await base44.entities.AppNotification.update(notif.id, {
          vista: true,
          fecha_vista: new Date().toISOString()
        });
      }
      
      if (notifications.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['appNotifications'] });
      }
      
      // Marcar mensajes del coordinador como leídos
      const allMessages = await base44.entities.CoordinatorMessage.filter({ conversacion_id: newConv.id || conversations[0]?.id });
      const unreadCoordMessages = allMessages.filter(m => m.autor === "coordinador" && !m.leido_padre);
      
      for (const msg of unreadCoordMessages) {
        await base44.entities.CoordinatorMessage.update(msg.id, {
          leido_padre: true,
          fecha_leido_padre: new Date().toISOString()
        });
      }
      
      if ((newConv || conversations[0])?.no_leidos_padre > 0) {
        await base44.entities.CoordinatorConversation.update(newConv?.id || conversations[0]?.id, {
          no_leidos_padre: 0
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
    refetchInterval: 1000, // Más rápido: cada 1 segundo para instantaneidad
    refetchOnWindowFocus: true,
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
      if (uploaded.length > 0) {
        setAttachments([...attachments, ...uploaded]);
        toast.success("Documentos adjuntados");
      }
    } catch (error) {
      toast.error("Error al subir archivos");
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
  const allSharedFiles = messages.flatMap(m => m.archivos_adjuntos || m.adjuntos || []);

  const sendMessageMutation = useMutation({
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['parentCoordinatorMessages'] });
      
      const previousMessages = queryClient.getQueryData(['parentCoordinatorMessages', conversation?.id]);
      
      const optimisticMessage = {
        id: 'temp-' + Date.now(),
        conversacion_id: conversation.id,
        autor: "padre",
        autor_email: user.email,
        autor_nombre: user.full_name,
        mensaje: data.mensaje,
        created_date: new Date().toISOString(),
        leido_coordinador: false,
        leido_padre: true,
        archivos_adjuntos: data.archivos_adjuntos || []
      };
      
      queryClient.setQueryData(['parentCoordinatorMessages', conversation?.id], old => [...(old || []), optimisticMessage]);
      
      return { previousMessages };
    },
    onError: (err, data, context) => {
      if (!err.message?.includes("lenguaje inapropiado")) {
        queryClient.setQueryData(['parentCoordinatorMessages', conversation?.id], context.previousMessages);
        toast.error("Error al enviar mensaje");
      }
    },
    mutationFn: async (data) => {
      const palabrasProhibidas = [
        "idiota", "estupido", "estúpido", "imbecil", "imbécil", "tonto", 
        "basura", "mierda", "maldito", "puto", "puta", "joder", "coño",
        "gilipollas", "capullo", "hijo de", "desgraciado", "inutil", "inútil"
      ];
      
      const mensajeLower = data.mensaje.toLowerCase();
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
        mensaje: data.mensaje,
        archivos_adjuntos: data.archivos_adjuntos || [],
        leido_padre: true,
        leido_coordinador: false,
        fecha_leido_padre: new Date().toISOString()
      });

      console.log('✅ [PADRE COORDINADOR] Mensaje creado:', newMessage.id);

      // Marcar conversación como prioritaria si contiene palabra urgente
      const updateData = {
        ultimo_mensaje: data.mensaje,
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

      // Notificar a coordinadores
      try {
        const allSettings = await base44.entities.CoordinatorSettings.list();
        const coordinatorEmails = Array.from(new Set(allSettings.map(s => s.coordinador_email).filter(Boolean)));
        await Promise.all(coordinatorEmails
          .filter(email => email !== user.email)
          .map(email => base44.entities.AppNotification.create({
            usuario_email: email,
            titulo: "Nuevo mensaje de familia",
            mensaje: `${user.full_name}: ${data.mensaje?.slice(0, 100) || "Mensaje"}`,
            tipo: "mensaje",
            prioridad: palabraUrgente ? "urgente" : "importante",
            enlace: "FamilyChats",
            vista: false
          })));
      } catch (_) {}

       // VERIFICAR CONFIGURACIÓN DEL COORDINADOR Y ENVIAR RESPUESTAS AUTOMÁTICAS
      console.log('🔍 [PADRE COORDINADOR] Buscando settings del coordinador...');
      const allSettings = await base44.entities.CoordinatorSettings.list();
      console.log('📋 [PADRE COORDINADOR] Todos los settings:', allSettings);
      
      const coordinatorSettings = allSettings.find(s => s.coordinador_email);
      console.log('📋 [PADRE COORDINADOR] Settings encontrados:', coordinatorSettings);

      const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

      if (coordinatorSettings) {
        // 1. VERIFICAR MODO AUSENTE (prioridad máxima)
        if (coordinatorSettings.modo_ausente === true && coordinatorSettings.mensaje_ausente) {
          console.log('🤖 [PADRE COORDINADOR] ✅ MODO AUSENTE ACTIVO - enviando respuesta automática');
          
          await base44.entities.CoordinatorMessage.create({
            conversacion_id: conversation.id,
            autor: "coordinador",
            autor_email: "sistema@coordinador",
            autor_nombre: "🤖 Coordinador (automático)",
            mensaje: coordinatorSettings.mensaje_ausente,
            archivos_adjuntos: [],
            leido_padre: false,
            leido_coordinador: true,
            fecha_leido_coordinador: new Date().toISOString()
          });
          
          console.log('✅ [PADRE COORDINADOR] Respuesta automática enviada');
          return newMessage;
        }

        // 2. VERIFICAR HORARIO LABORAL (solo si NO está ausente)
        if (coordinatorSettings.horario_laboral_activo === true && 
            coordinatorSettings.horario_inicio && 
            coordinatorSettings.horario_fin && 
            coordinatorSettings.dias_laborales?.length > 0) {
          
          const now = new Date();
          const dayName = DIAS_SEMANA[now.getDay() === 0 ? 6 : now.getDay() - 1];
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

          const isWorkingDay = coordinatorSettings.dias_laborales.includes(dayName);
          const isWithinHours = currentTime >= coordinatorSettings.horario_inicio && currentTime <= coordinatorSettings.horario_fin;

          console.log('🕐 [PADRE COORDINADOR] Verificación horario:', {
            dayName,
            currentTime,
            horario_inicio: coordinatorSettings.horario_inicio,
            horario_fin: coordinatorSettings.horario_fin,
            dias_laborales: coordinatorSettings.dias_laborales,
            isWorkingDay,
            isWithinHours
          });

          if (!isWorkingDay || !isWithinHours) {
            console.log('⏰ [PADRE COORDINADOR] FUERA DE HORARIO - enviando mensaje automático');

            await base44.entities.CoordinatorMessage.create({
              conversacion_id: conversation.id,
              autor: "coordinador",
              autor_email: "sistema@coordinador",
              autor_nombre: "🤖 Coordinador (automático)",
              mensaje: coordinatorSettings.mensaje_fuera_horario || "Tu mensaje ha sido recibido. El coordinador te responderá en su horario laboral.",
              archivos_adjuntos: [],
              leido_padre: false,
              leido_coordinador: true,
              fecha_leido_coordinador: new Date().toISOString()
            });

            console.log('✅ [PADRE COORDINADOR] Respuesta automática (fuera horario) enviada');
          }
        }
      }

      return newMessage;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parentCoordinatorMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] }),
        queryClient.refetchQueries({ queryKey: ['parentCoordinatorMessages'] }),
      ]);
    }
  });

  const handleSend = () => {
    if (!termsAccepted) {
      toast.error("Debes aceptar las condiciones de uso antes de enviar mensajes");
      setShowTermsDialog(true);
      return;
    }
    
    // VERIFICAR SI EL USUARIO ESTÁ BLOQUEADO
    if (user?.chat_bloqueado === true) {
      toast.error("🚫 Tu acceso al chat ha sido restringido por el administrador.");
      return;
    }
    
    if (!messageText.trim() && attachments.length === 0) return;
    
    // Guardar antes de limpiar
    const textToSend = messageText;
    const attachToSend = [...attachments];
    
    // Limpiar inmediatamente
    setMessageText("");
    setAttachments([]);
    
    sendMessageMutation.mutate({ mensaje: textToSend, archivos_adjuntos: attachToSend });
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
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 bg-slate-50 min-h-0">
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
                  <div key={msg.id} className={`flex ${isPadre ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] sm:max-w-[70%] ${isPadre ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border'} rounded-2xl p-2 sm:p-3 shadow-sm`}>
                      <p className="text-[10px] sm:text-xs font-semibold mb-1 opacity-70">{msg.autor_nombre}</p>
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                      {(msg.archivos_adjuntos || msg.adjuntos)?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(msg.archivos_adjuntos || msg.adjuntos).map((file, idx) => (
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
            {user?.chat_bloqueado && (
              <Alert className="mb-2 bg-red-50 border-red-300">
                <AlertDescription className="text-red-800 text-sm">
                  🚫 <strong>Tu acceso al chat ha sido restringido</strong>
                  {user?.motivo_bloqueo_chat && <><br />Motivo: {user.motivo_bloqueo_chat}</>}
                  <br />
                  <span className="text-xs">Contacta con el administrador del club para más información.</span>
                </AlertDescription>
              </Alert>
            )}
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
            <div className="space-y-2">
              <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                accept="*/*" 
                className="hidden" 
                onChange={handleFileUpload} 
                disabled={uploading} 
              />

              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-8 px-3 text-xs"
                >
                  <Paperclip className="w-3 h-3 mr-1" />
                  Adjuntar archivo
                </Button>
              </div>

              <div className="flex gap-2 items-end">
                <Textarea
                  placeholder={user?.chat_bloqueado ? "Chat bloqueado" : "Escribe tu mensaje..."}
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
                  className="flex-1 min-h-[44px] max-h-32 resize-none text-base"
                  rows={1}
                  disabled={user?.chat_bloqueado}
                />
                <Button onClick={handleSend} disabled={!messageText.trim() && attachments.length === 0 || user?.chat_bloqueado} className="bg-cyan-600 hover:bg-cyan-700 h-12 w-12 lg:h-10 lg:w-10 p-0 flex-shrink-0">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
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