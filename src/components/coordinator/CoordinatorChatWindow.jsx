import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Paperclip, X, FileText, Download, Mic, Play, Pause, Search, Star, Tag, Smile, ThumbsUp, Heart, CheckCircle, Image as ImageIcon, MessageCircle, Camera, BarChart3, Check, CheckCheck, Folder, MapPin, Reply, Edit, Trash2, Forward, AlertTriangle, Pin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import ChatMessageActions from "../chat/ChatMessageActions";
import PollMessage from "../chat/PollMessage";
import LocationMessage from "../chat/LocationMessage";
import SearchFilters from "../chat/SearchFilters";
import ChatInputActions from "../chat/ChatInputActions";
import CoordinatorQuickReplies from "./CoordinatorQuickReplies";
import EscalateToAdminButton from "./EscalateToAdminButton";
import PinnedMessagesBanner from "../chat/PinnedMessagesBanner";
import EmojiPicker from "../chat/EmojiPicker";

const REACTIONS = ["👍", "❤️", "✅", "👏", "🎉"];

export default function CoordinatorChatWindow({ conversation, user, onClose }) {
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPerson, setFilterPerson] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();
  const audioContextRef = useRef(null);
  const notificationSoundRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isCoordinator = user.es_coordinador || user.role === "admin";

  const { data: coordinatorSettings } = useQuery({
    queryKey: ['coordinatorSettings', user?.email],
    queryFn: async () => {
      if (!isCoordinator) return null;
      const all = await base44.entities.CoordinatorSettings.filter({ coordinador_email: user.email });
      return all[0] || null;
    },
    enabled: isCoordinator,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['coordinatorMessages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      return await base44.entities.CoordinatorMessage.filter({ conversacion_id: conversation.id }, 'created_date');
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 300000,
    enabled: !!conversation?.id,
  });

  // Auto-marcar como leídos cuando la conversación está abierta y llegan mensajes nuevos
  useEffect(() => {
    if (!conversation?.id) return;
    const field = isCoordinator ? 'no_leidos_coordinador' : 'no_leidos_padre';
    const msgField = isCoordinator ? 'leido_coordinador' : 'leido_padre';
    const dateField = isCoordinator ? 'fecha_leido_coordinador' : 'fecha_leido_padre';

    const unreadMessages = messages.filter(m => m.autor !== (isCoordinator ? 'coordinador' : 'padre') && !m[msgField]);
    if (unreadMessages.length === 0 && ((conversation[field] || 0) === 0)) return;

    (async () => {
      try {
        if (unreadMessages.length > 0) {
          const BATCH_SIZE = 10;
          const processBatch = async (batch) => {
            for (const msg of batch) {
              await base44.entities.CoordinatorMessage.update(msg.id, {
                [msgField]: true,
                [dateField]: new Date().toISOString(),
              });
            }
          };
          const first = unreadMessages.slice(0, BATCH_SIZE);
          await processBatch(first);
          if (unreadMessages.length > BATCH_SIZE) {
            setTimeout(async () => {
              const rest = unreadMessages.slice(BATCH_SIZE);
              for (let i = 0; i < rest.length; i += BATCH_SIZE) {
                await processBatch(rest.slice(i, i + BATCH_SIZE));
                await new Promise(r => setTimeout(r, 300));
              }
            }, 300);
          }
        }
        if ((conversation[field] || 0) > 0) {
          await base44.entities.CoordinatorConversation.update(conversation.id, { [field]: 0 });
        }
      } catch {}
    })();
  }, [messages, conversation?.id, isCoordinator]);

  // REAL-TIME: Suscripción a mensajes
  useEffect(() => {
    if (!conversation?.id) return;
    
    const unsub = base44.entities.CoordinatorMessage.subscribe((event) => {
      if (event.data?.conversacion_id === conversation.id) {
        queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
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
    refetchInterval: 2000,
    enabled: !!conversation?.id,
  });

  const otherPersonTyping = isCoordinator 
    ? conversationState?.padre_escribiendo 
    : conversationState?.coordinador_escribiendo;

  // Scroll automático cuando cambian los mensajes o el indicador de escritura
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, otherPersonTyping]);

  // Marcar como leído cuando abre la conversación
  const markedAsReadRef = useRef(false);
  useEffect(() => {
    if (!conversation?.id || markedAsReadRef.current) return;
    
    markedAsReadRef.current = true;
    const markAsRead = async () => {
      try {
        const field = isCoordinator ? 'no_leidos_coordinador' : 'no_leidos_padre';
        const msgField = isCoordinator ? 'leido_coordinador' : 'leido_padre';
        const dateField = isCoordinator ? 'fecha_leido_coordinador' : 'fecha_leido_padre';
        
        if (conversation[field] > 0) {
          await base44.entities.CoordinatorConversation.update(conversation.id, {
            [field]: 0
          });

          const unreadMessages = messages.filter(m => m.autor !== (isCoordinator ? "coordinador" : "padre") && !m[msgField]);
          const BATCH_SIZE = 20;
          for (let i = 0; i < unreadMessages.length && i < BATCH_SIZE; i++) {
            const msg = unreadMessages[i];
            await base44.entities.CoordinatorMessage.update(msg.id, {
              [msgField]: true,
              [dateField]: new Date().toISOString()
            });
          }

          queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
        }

        // Marcar AppNotifications como vistas
        const enlace = isCoordinator ? "ParentCoordinatorChat" : "FamilyChats";
        const notifs = await base44.entities.AppNotification.filter({
          usuario_email: user?.email,
          enlace: enlace,
          vista: false
        });
        for (const n of notifs) {
          await base44.entities.AppNotification.update(n.id, { vista: true, fecha_vista: new Date().toISOString() });
        }
      } catch (error) {
        console.log("Error marking as read:", error);
        markedAsReadRef.current = false;
      }
    };
    markAsRead();
  }, [conversation?.id]);

  // Indicador "escribiendo..."
  const handleTyping = async () => {
    if (!conversation?.id) return;
    
    const field = isCoordinator ? 'coordinador_escribiendo' : 'padre_escribiendo';
    
    clearTimeout(typingTimeoutRef.current);
    
    await base44.entities.CoordinatorConversation.update(conversation.id, {
      [field]: true,
      ultima_actividad_escribiendo: new Date().toISOString()
    });

    typingTimeoutRef.current = setTimeout(async () => {
      await base44.entities.CoordinatorConversation.update(conversation.id, {
        [field]: false
      });
    }, 3000);
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.7);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploaded = [];
      for (const file of files) {
        if (file.type.startsWith('video/')) {
          toast.error("❌ No se pueden enviar videos por este chat");
          continue;
        }
        
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }
        
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });
        uploaded.push({
          url: file_url,
          nombre: file.name,
          tipo: file.type,
          tamano: file.size
        });
      }
      if (uploaded.length > 0) {
        setAttachments([...attachments, ...uploaded]);
        toast.success("Archivos adjuntados");
      }
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
      const compressedFile = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
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

  const sendPoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      toast.error("Necesitas una pregunta y al menos 2 opciones");
      return;
    }

    sendMessageMutation.mutate({
      mensaje: "📊 Encuesta",
      archivos_adjuntos: [],
      encuesta: {
        pregunta: pollQuestion,
        opciones: pollOptions.filter(o => o.trim()),
        votos: [],
        cerrada: false
      }
    });
    
    setShowPollDialog(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    toast.success("Encuesta enviada");
  };

  // Grabar audio
  const startRecording = async () => {
    try {
      console.log('🎤 Solicitando permiso de micrófono...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Tu navegador no soporta grabación de audio");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Permiso concedido');
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const startTime = Date.now();
      toast.success("🎤 Grabando audio...", { duration: 1000 });

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioDuration(duration);
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Audio grabado:', duration, 's');
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error('❌ Error al grabar audio:', error);
      if (error.name === 'NotAllowedError') {
        toast.error("Debes permitir el acceso al micrófono en tu navegador");
      } else if (error.name === 'NotFoundError') {
        toast.error("No se encontró ningún micrófono");
      } else {
        toast.error("Error al acceder al micrófono: " + error.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const cancelAudio = () => {
    setAudioBlob(null);
    setAudioDuration(0);
  };

  const sendAudio = async () => {
    if (!audioBlob) return;

    try {
      const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      sendMessageMutation.mutate({ 
        mensaje: "🎤 Audio", 
        audio_url: file_url,
        audio_duracion: audioDuration,
        archivos_adjuntos: []
      });
      
      cancelAudio();
    } catch (error) {
      toast.error("Error al enviar el audio");
    }
  };

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
      console.error("Error playing audio:", error);
      setPlayingAudio(null);
      toast.error("Error al reproducir el audio");
    }
  };

  const addReaction = async (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    const existingReactions = message.reacciones || [];
    
    // Verificar si ya reaccionó
    const alreadyReacted = existingReactions.find(r => r.user_email === user.email && r.emoji === emoji);
    
    let newReactions;
    if (alreadyReacted) {
      // Quitar reacción
      newReactions = existingReactions.filter(r => !(r.user_email === user.email && r.emoji === emoji));
    } else {
      // Agregar reacción
      newReactions = [...existingReactions, {
        user_email: user.email,
        user_nombre: user.full_name || "Usuario",
        emoji: emoji,
        fecha: new Date().toISOString()
      }];
    }

    await base44.entities.CoordinatorMessage.update(messageId, {
      reacciones: newReactions
    });

    queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
    setShowReactions(null);
  };

  const togglePriority = async () => {
    await base44.entities.CoordinatorConversation.update(conversation.id, {
      prioritaria: !conversation.prioritaria
    });
    toast.success(conversation.prioritaria ? "Prioridad removida" : "Marcada como prioritaria");
  };

  const changeLabel = async (label) => {
    await base44.entities.CoordinatorConversation.update(conversation.id, {
      etiqueta: label
    });
    toast.success("Etiqueta actualizada");
  };

  // Filtrar todos los archivos compartidos
  const allSharedFiles = messages.flatMap(m => m.archivos_adjuntos || []);

  const sendMessageMutation = useMutation({
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['coordinatorMessages', conversation?.id] });
      
      const previousMessages = queryClient.getQueryData(['coordinatorMessages', conversation?.id]);
      
      const optimisticMessage = {
        id: 'temp-' + Date.now(),
        conversacion_id: conversation.id,
        autor: isCoordinator ? "coordinador" : "padre",
        autor_email: user.email,
        autor_nombre: user.full_name || (isCoordinator ? "Coordinador" : "Padre"),
        mensaje: data.mensaje,
        created_date: new Date().toISOString(),
        leido_coordinador: isCoordinator,
        leido_padre: !isCoordinator,
        archivos_adjuntos: data.archivos_adjuntos || [],
        encuesta: data.encuesta,
        ubicacion: data.ubicacion,
        audio_url: data.audio_url,
        audio_duracion: data.audio_duracion
      };
      
      queryClient.setQueryData(['coordinatorMessages', conversation?.id], old => [...(old || []), optimisticMessage]);
      
      return { previousMessages };
    },
    onError: (err, data, context) => {
      queryClient.setQueryData(['coordinatorMessages', conversation?.id], context.previousMessages);
      toast.error("Error al enviar mensaje");
    },
    mutationFn: async (data) => {
      const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      
      const allSettings = await base44.entities.CoordinatorSettings.list();
      const currentSettings = allSettings.find(s => s.coordinador_email);
      const shouldSendAutoReply = !isCoordinator && 
        currentSettings?.modo_ausente === true && 
        currentSettings?.mensaje_ausente &&
        !conversation.auto_reply_sent_recently;

      let isOutsideWorkingHours = false;
      if (!isCoordinator && 
          !currentSettings?.modo_ausente &&
          currentSettings?.horario_laboral_activo === true && 
          currentSettings?.horario_inicio && 
          currentSettings?.horario_fin &&
          currentSettings?.dias_laborales?.length > 0) {
        
        const now = new Date();
        const dayName = DIAS_SEMANA[now.getDay() === 0 ? 6 : now.getDay() - 1];
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const isWorkingDay = currentSettings.dias_laborales.includes(dayName);
        const isWithinHours = currentTime >= currentSettings.horario_inicio && currentTime <= currentSettings.horario_fin;
        
        isOutsideWorkingHours = !isWorkingDay || !isWithinHours;
      }

      // Validar campos obligatorios
      if (!conversation?.id || !user?.email || !data.mensaje?.trim()) {
        throw new Error("Faltan datos obligatorios para enviar el mensaje");
      }

      const messagePayload = {
        conversacion_id: conversation.id,
        autor: isCoordinator ? "coordinador" : "padre",
        autor_email: user.email,
        autor_nombre: user.full_name || (isCoordinator ? "Coordinador" : "Padre"),
        mensaje: data.mensaje.trim(),
        leido_coordinador: isCoordinator,
        leido_padre: !isCoordinator,
        archivos_adjuntos: data.archivos_adjuntos || []
      };

      // Solo agregar campos opcionales si tienen valor
      if (data.audio_url) {
        messagePayload.audio_url = data.audio_url;
        messagePayload.audio_duracion = data.audio_duracion || 0;
      }
      if (data.encuesta) {
        messagePayload.encuesta = data.encuesta;
      }
      if (data.ubicacion) {
        messagePayload.ubicacion = data.ubicacion;
      }
      if (data.respuesta_a) {
        messagePayload.respuesta_a = data.respuesta_a;
        messagePayload.mensaje_citado = data.mensaje_citado;
      }

      const newMessage = await base44.entities.CoordinatorMessage.create(messagePayload);

      const fieldNoLeidos = isCoordinator ? 'no_leidos_padre' : 'no_leidos_coordinador';
      const fieldEscribiendo = isCoordinator ? 'coordinador_escribiendo' : 'padre_escribiendo';

      await base44.entities.CoordinatorConversation.update(conversation.id, {
        ultimo_mensaje: data.mensaje,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: isCoordinator ? "coordinador" : "padre",
        [fieldNoLeidos]: (conversation[fieldNoLeidos] || 0) + 1,
        [fieldEscribiendo]: false,
        archivada: false
      });

      // Crear notificación para el destinatario
      if (!isCoordinator) {
        // Padre escribe -> notificar al coordinador
        const recipientEmail = conversation.coordinador_email;
        if (recipientEmail) {
          await base44.entities.AppNotification.create({
            usuario_email: recipientEmail,
            titulo: `💬 Mensaje de ${user.full_name}`,
            mensaje: (data.mensaje || "Mensaje").substring(0, 100) + ((data.mensaje || "").length > 100 ? '...' : ''),
            tipo: "importante",
            icono: "💬",
            enlace: "FamilyChats",
            vista: false
          });
        }
      } else {
        // Coordinador escribe -> notificar al padre Y al admin
        if (conversation.padre_email) {
          await base44.entities.AppNotification.create({
            usuario_email: conversation.padre_email,
            titulo: `🎓 Mensaje del Coordinador`,
            mensaje: (data.mensaje || "Mensaje").substring(0, 100) + ((data.mensaje || "").length > 100 ? '...' : ''),
            tipo: "importante",
            icono: "🎓",
            enlace: "ParentCoordinatorChat",
            vista: false
          });
        }

        // Notificar a admin de nuevo mensaje coordinador
        const allUsers = await base44.entities.User.list();
        const admins = allUsers.filter(u => u.role === "admin");
        for (const admin of admins) {
          await base44.entities.AppNotification.create({
            usuario_email: admin.email,
            titulo: `💬 ${coordinatorUser.full_name} → ${conversation.padre_nombre}`,
            mensaje: (data.mensaje || "Mensaje").substring(0, 100),
            tipo: "info",
            icono: "💬",
            enlace: "AdminChat",
            vista: false
          });
        }
      }

      if (shouldSendAutoReply) {
        await base44.entities.CoordinatorMessage.create({
          conversacion_id: conversation.id,
          autor: "coordinador",
          autor_email: "sistema@coordinador",
          autor_nombre: "🤖 Coordinador (automático)",
          mensaje: currentSettings.mensaje_ausente,
          archivos_adjuntos: [],
          leido_coordinador: true,
          leido_padre: false,
          fecha_leido_coordinador: new Date().toISOString()
        });

        await base44.entities.CoordinatorConversation.update(conversation.id, {
          auto_reply_sent_recently: true,
          ultimo_mensaje: currentSettings.mensaje_ausente,
          ultimo_mensaje_fecha: new Date().toISOString(),
          ultimo_mensaje_autor: "coordinador"
        });

        setTimeout(async () => {
          try {
            await base44.entities.CoordinatorConversation.update(conversation.id, {
              auto_reply_sent_recently: false
            });
          } catch (err) {}
        }, 3600000);
      } else if (isOutsideWorkingHours && currentSettings?.mensaje_fuera_horario) {
        await base44.entities.CoordinatorMessage.create({
          conversacion_id: conversation.id,
          autor: "coordinador",
          autor_email: "sistema@coordinador",
          autor_nombre: "🤖 Coordinador (automático)",
          mensaje: currentSettings.mensaje_fuera_horario,
          archivos_adjuntos: [],
          leido_coordinador: true,
          leido_padre: false,
          fecha_leido_coordinador: new Date().toISOString()
        });
      }

      return newMessage;
    },
    onSuccess: async () => {
       // Refetch INMEDIATO sin esperar - SOLO este chat
       await Promise.all([
         queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] }),
         queryClient.refetchQueries({ queryKey: ['coordinatorMessages', conversation.id] }),
       ]);

       // NO invalidar appNotifications globales - mantener independencia de burbujas
     },
  });

  const handleSend = () => {
    if (editingMessage) {
      const textToSend = messageText;
      setMessageText("");
      setEditingMessage(null);
      editMessageMutation.mutate({
        id: editingMessage.id,
        mensaje: textToSend
      });
    } else {
      if (!messageText.trim() && attachments.length === 0) return;
      
      // Guardar antes de limpiar
      const textToSend = messageText;
      const attachToSend = [...attachments];
      
      // Limpiar inmediatamente
      setMessageText("");
      setAttachments([]);
      
      const messageData = { 
        mensaje: textToSend, 
        archivos_adjuntos: attachToSend 
      };
      
      if (replyingTo) {
        messageData.respuesta_a = replyingTo.id;
        messageData.mensaje_citado = {
          autor_nombre: replyingTo.autor_nombre,
          mensaje: replyingTo.mensaje.substring(0, 100)
        };
      }
      
      sendMessageMutation.mutate(messageData);
      setReplyingTo(null);
    }
  };

  const editMessageMutation = useMutation({
    mutationFn: async ({ id, mensaje }) => {
      await base44.entities.CoordinatorMessage.update(id, {
        mensaje,
        editado: true,
        fecha_edicion: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      toast.success("Mensaje editado");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.CoordinatorMessage.update(messageId, {
        eliminado: true,
        mensaje: "Este mensaje fue eliminado"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      toast.success("Mensaje eliminado");
    },
  });

  const votePollMutation = useMutation({
    mutationFn: async ({ messageId, optionIndex }) => {
      const msg = messages.find(m => m.id === messageId);
      const votos = msg.encuesta?.votos || [];
      
      votos.push({
        usuario_email: user.email,
        usuario_nombre: user.full_name,
        opcion_index: optionIndex,
        fecha: new Date().toISOString()
      });

      await base44.entities.CoordinatorMessage.update(messageId, {
        encuesta: {
          ...msg.encuesta,
          votos
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      toast.success("Voto registrado");
    },
  });

  const unpinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.CoordinatorMessage.update(messageId, {
        anclado: false,
        anclado_por: null,
        anclado_fecha: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      toast.success("Mensaje desanclado");
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.CoordinatorMessage.update(messageId, {
        anclado: true,
        anclado_por: user.email,
        anclado_fecha: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      toast.success("Mensaje anclado");
    },
  });

  // Proteger acceso a filteredMessages que se define después
  const getPinnedMessages = () => {
    try {
      return messages.filter(m => m.anclado === true);
    } catch (e) {
      return [];
    }
  };
  
  const pinnedMessages = getPinnedMessages();

  const sendLocationFromBrowser = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          sendMessageMutation.mutate({
            mensaje: "📍 Ubicación compartida",
            archivos_adjuntos: [],
            ubicacion: {
              latitud: latitude,
              longitud: longitude,
              nombre: locationName,
              direccion: locationAddress
            }
          });
          
          setShowLocationDialog(false);
          setLocationName("");
          setLocationAddress("");
          toast.success("Ubicación enviada");
        },
        () => {
          toast.error("No se pudo obtener tu ubicación");
        }
      );
    } else {
      toast.error("Tu navegador no soporta geolocalización");
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (msg.eliminado) return false;
    
    // Búsqueda por texto
    if (searchTerm && !msg.mensaje?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtro por tipo
    if (filterType !== "all") {
      if (filterType === "text" && (msg.archivos_adjuntos?.length > 0 || msg.encuesta || msg.ubicacion)) return false;
      if (filterType === "files" && !msg.archivos_adjuntos?.some(f => !f.tipo?.startsWith('image/'))) return false;
      if (filterType === "images" && !msg.archivos_adjuntos?.some(f => f.tipo?.startsWith('image/'))) return false;
      if (filterType === "polls" && !msg.encuesta) return false;
      if (filterType === "locations" && !msg.ubicacion) return false;
    }
    
    // Filtro por persona
    if (filterPerson !== "all" && msg.autor_email !== filterPerson) {
      return false;
    }
    
    // Filtro por fecha
    if (filterDate !== "all") {
      const msgDate = new Date(msg.created_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (filterDate === "today" && msgDate < today) return false;
      if (filterDate === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (msgDate < weekAgo) return false;
      }
      if (filterDate === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (msgDate < monthAgo) return false;
      }
    }
    
    return true;
  });

  if (!conversation || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-2"></div>
          <p className="text-slate-500 text-sm">Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingAudio(null)}
        onError={() => {
          setPlayingAudio(null);
          toast.error("Error al cargar el audio");
        }}
      />
      <audio ref={notificationSoundRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZizUIGGS57OihUBILUKXh8raFHwU5jtX0z3k" />

      {/* Header mínimo */}
      <div className="p-1.5 bg-white border-b flex-shrink-0 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-xs text-slate-900 truncate">{conversation.padre_nombre}</h2>
            <p className="text-xs text-slate-500 truncate">
              {conversation.jugadores_asociados?.map(j => j.jugador_nombre).join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {conversation.prioritaria && <Star className="w-3 h-3 text-orange-500 fill-orange-500" />}
            {isCoordinator && (
              <EscalateToAdminButton 
                conversation={conversation}
                recentMessages={messages}
                coordinatorUser={user}
              />
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 lg:hidden">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mensajes Anclados */}
      <PinnedMessagesBanner 
        pinnedMessages={pinnedMessages}
        onUnpin={(id) => unpinMessageMutation.mutate(id)}
        canUnpin={isCoordinator}
      />

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 bg-slate-50 min-h-0">
        {replyingTo && (
          <div className="sticky top-0 z-10 bg-blue-50 border-l-4 border-blue-500 p-2 rounded flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-900">Respondiendo a {replyingTo.autor_nombre}</p>
              <p className="text-xs text-blue-700 truncate">{replyingTo.mensaje}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {filteredMessages.map((msg) => {
          const isMine = (isCoordinator && msg.autor === "coordinador") || (!isCoordinator && msg.autor === "padre");
          const repliedMessage = msg.respuesta_a ? messages.find(m => m.id === msg.respuesta_a) : null;
          
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[75%] sm:max-w-[70%] ${isMine ? 'bg-cyan-600 text-white' : 'bg-white text-slate-900'} rounded-2xl p-2 sm:p-3 shadow-sm relative`}>
                {msg.mensaje_citado && (
                  <div className={`mb-2 p-2 rounded border-l-2 ${isMine ? 'bg-cyan-700 border-cyan-400' : 'bg-slate-100 border-slate-400'}`}>
                    <p className="text-xs opacity-70">{msg.mensaje_citado.autor_nombre}</p>
                    <p className="text-xs italic truncate">{msg.mensaje_citado.mensaje}</p>
                  </div>
                )}
                
                <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] sm:text-xs font-semibold opacity-70 flex-1">
                  {msg.autor === "coordinador" ? "Coordinador" : msg.autor_nombre}
                </p>
                <div className="flex gap-1">
                  {isMine && isCoordinator && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={() => msg.anclado ? unpinMessageMutation.mutate(msg.id) : pinMessageMutation.mutate(msg.id)}
                      title={msg.anclado ? "Desanclar" : "Anclar mensaje"}
                    >
                      <Pin className={`w-3 h-3 ${msg.anclado ? 'text-yellow-600 fill-yellow-600' : ''}`} />
                    </Button>
                  )}
                  <ChatMessageActions
                    message={msg}
                    isMine={isMine}
                    isStaff={isCoordinator}
                    onReply={(m) => setReplyingTo(m)}
                    onEdit={(m) => {
                      setEditingMessage(m);
                      setMessageText(m.mensaje);
                    }}
                    onDelete={(m) => deleteMessageMutation.mutate(m.id)}
                    onForward={(m) => setForwardingMessage(m)}
                  />
                </div>
                </div>
                
                {msg.audio_url ? (
                   <div className="flex items-center gap-2">
                     <Button 
                       size="sm" 
                       variant={isMine ? "secondary" : "outline"}
                       onClick={() => togglePlayAudio(msg.audio_url)}
                     >
                       {playingAudio === msg.audio_url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                     </Button>
                     <span className="text-sm">{msg.audio_duracion}s</span>
                   </div>
                 ) : (
                   <p className="text-2xl sm:text-3xl whitespace-pre-wrap leading-relaxed">
                     {msg.mensaje}
                     {msg.editado && <span className="text-xs opacity-50 ml-2">(editado)</span>}
                   </p>
                 )}

                {msg.ubicacion && <LocationMessage ubicacion={msg.ubicacion} />}
                {msg.encuesta && (
                  <PollMessage 
                    encuesta={msg.encuesta} 
                    messageId={msg.id}
                    userEmail={user.email}
                    userName={user.full_name}
                    onVote={(msgId, optionIdx) => votePollMutation.mutate({ messageId: msgId, optionIndex: optionIdx })}
                    isCreator={msg.autor_email === user.email}
                  />
                )}

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
                          className={`flex items-center gap-2 text-xs p-2 rounded ${isMine ? 'bg-cyan-700' : 'bg-slate-100'}`}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="flex-1 truncate">{file.nombre}</span>
                          <Download className="w-3 h-3" />
                        </a>
                      )
                    ))}
                  </div>
                )}

                {/* Reacciones */}
                {msg.reacciones?.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {msg.reacciones.map((r, idx) => (
                      <span key={idx} className="text-5xl" title={r.user_nombre}>
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] sm:text-xs opacity-60">
                    {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    {/* Confirmación de lectura (doble check) */}
                    {isMine && (
                      <div className="flex items-center gap-1">
                        {(isCoordinator ? msg.leido_padre : msg.leido_coordinador) ? (
                          <CheckCheck className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Check className="w-4 h-4 opacity-50" />
                        )}
                      </div>
                    )}
                    
                    {/* Botón de reacciones */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={() => setShowReactions(msg.id)}
                    >
                      <Smile className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Selector de reacciones */}
                {showReactions === msg.id && (
                  <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-10">
                    {REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(msg.id, emoji)}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button onClick={() => setShowReactions(null)} className="ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {otherPersonTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl p-3 shadow-sm">
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

      {/* Input */}
      <div className="p-2 bg-white border-t flex-shrink-0 sticky bottom-0 z-20">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
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
                  <div className="bg-slate-100 rounded px-2 py-1 text-xs flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{file.nombre}</span>
                    <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {recording && (
          <div className="mb-2 flex items-center gap-2 bg-red-50 rounded-lg p-2 border-2 border-red-300 animate-pulse">
            <Mic className="w-4 h-4 text-red-600 animate-pulse" />
            <span className="text-sm flex-1 text-red-700 font-semibold">🔴 Grabando...</span>
            <Button size="sm" onClick={stopRecording} className="h-7 bg-red-600 hover:bg-red-700">
              Detener
            </Button>
          </div>
        )}

        {audioBlob && (
          <div className="mb-2 flex items-center gap-2 bg-green-50 rounded-lg p-2">
            <Mic className="w-4 h-4 text-green-600" />
            <span className="text-sm flex-1">Audio {audioDuration}s</span>
            <Button size="sm" onClick={sendAudio} className="h-7">Enviar</Button>
            <Button size="sm" variant="outline" onClick={cancelAudio} className="h-7">✕</Button>
          </div>
        )}

        {isCoordinator && showQuickReplies && (
          <CoordinatorQuickReplies 
            onSelect={(text) => {
              setMessageText(text);
              setShowQuickReplies(false);
            }}
            user={user}
          />
        )}

        <div className="flex gap-2 items-end">
          <input 
            ref={fileInputRef}
            type="file" 
            multiple 
            accept={isCoordinator ? "*/*" : ".pdf,.doc,.docx,.xls,.xlsx,.txt"}
            className="hidden" 
            onChange={handleFileUpload} 
            disabled={uploading} 
          />
          <input 
            ref={cameraInputRef}
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={handleCameraCapture} 
            disabled={uploading} 
          />
          
          <EmojiPicker 
            onEmojiSelect={(emoji) => setMessageText(prev => prev + emoji)}
            messageText={messageText}
          />
          
          {isCoordinator && (
            <ChatInputActions
              onFileClick={() => fileInputRef.current?.click()}
              onCameraClick={() => cameraInputRef.current?.click()}
              onAudioClick={recording ? stopRecording : startRecording}
              onLocationClick={() => setShowLocationDialog(true)}
              onPollClick={() => setShowPollDialog(true)}
              onQuickRepliesClick={() => setShowQuickReplies(!showQuickReplies)}
              uploading={uploading}
              isRecording={recording}
              showCamera={true}
              showAudio={true}
              showLocation={true}
              showPoll={true}
              showQuickReplies={true}
            />
          )}

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
            className="flex-1 min-h-[44px] max-h-32 resize-none text-base py-3 px-3"
            rows={1}
          />

          <Button 
            onClick={handleSend} 
            disabled={!messageText.trim() && attachments.length === 0}
            size="icon"
            className="h-11 w-11 bg-cyan-600 hover:bg-cyan-700 p-0 flex-shrink-0 rounded-full"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Diálogo de ubicación */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📍 Enviar Ubicación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nombre del lugar (ej: Campo de fútbol)"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
            <Input
              placeholder="Dirección (opcional)"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLocationDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={sendLocationFromBrowser} className="flex-1 bg-blue-600">
                <MapPin className="w-4 h-4 mr-2" />
                Enviar mi ubicación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview de imagen */}
      <Dialog open={!!showImagePreview} onOpenChange={() => setShowImagePreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {showImagePreview && (
            <img src={showImagePreview} alt="Preview" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Crear encuesta */}
      <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📊 Crear Encuesta Rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Pregunta</label>
              <Input
                placeholder="¿Qué prefieres para el torneo?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Opciones</label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input
                    placeholder={`Opción ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="mt-2"
              >
                + Agregar opción
              </Button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPollDialog(false)}>Cancelar</Button>
              <Button onClick={sendPoll}>Enviar Encuesta</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}