import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Paperclip, X, FileText, Download, Mic, Play, Pause, Smile, Check, CheckCheck, MapPin, Reply, Edit, Trash2, Users, Image as ImageIcon, Camera, Dumbbell, Pin } from "lucide-react";
import ChatInputActions from "../chat/ChatInputActions";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import PollMessage from "../chat/PollMessage";
import LocationMessage from "../chat/LocationMessage";
import EscalateToCoordinatorButton from "./EscalateToCoordinatorButton";
import ExerciseShareDialog from "../exercises/ExerciseShareDialog";
import PinnedMessagesBanner from "../chat/PinnedMessagesBanner";
import EmojiPicker from "../chat/EmojiPicker";
import CoachChatInput from "../chat/CoachChatInput";
import EmojiScaler from "../chat/EmojiScaler";
import ChatImageBubble from "../chat/ChatImageBubble";
import ChatAudioBubble from "../chat/ChatAudioBubble";
import DateSeparator from "../chat/DateSeparator";
import NewMessageButton from "../chat/NewMessageButton";
import { groupConsecutiveMessages } from "../chat/MessageGrouping";

const REACTIONS = ["👍", "❤️", "✅", "👏", "🎉"];
const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const normalizeCategory = (s = '') =>
  s
    .toString()
    .replace(/\(.*?\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
const toGroupId = (s = '') => normalizeCategory(s).replace(/\s+/g, '_');

export default function CoachChatWindow({ selectedCategory, user, allPlayers }) {
  const [uploading, setUploading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [showExerciseShare, setShowExerciseShare] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: coachSettings } = useQuery({
    queryKey: ['coachSettings', user?.email],
    queryFn: async () => {
      const all = await base44.entities.CoachSettings.filter({ entrenador_email: user.email });
      return all[0] || null;
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['coachGroupMessages', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];

      if (selectedCategory === "Todas las categorías") {
        return await base44.entities.ChatMessage.list('-created_date');
      }

      const grupo_id = toGroupId(selectedCategory);
      // Traer por grupo_id, deporte Y categoria_principal para compatibilidad
      const [byGroup, bySport] = await Promise.all([
        base44.entities.ChatMessage.filter({ grupo_id }, 'created_date'),
        base44.entities.ChatMessage.filter({ deporte: selectedCategory }, 'created_date'),
      ]);
      const merged = [...byGroup, ...bySport].reduce((acc, m) => {
        acc[m.id] = m; return acc;
      }, {});
      return Object.values(merged).sort((a,b)=>new Date(a.created_date)-new Date(b.created_date));
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    enabled: !!selectedCategory,
  });

  // REAL-TIME: Suscripción a mensajes de entrenador
  useEffect(() => {
    if (!selectedCategory) return;
    
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      const gid = toGroupId(selectedCategory);
      const eventGid = toGroupId(event.data?.grupo_id || event.data?.deporte || '');
      if (eventGid === gid || selectedCategory === "Todas las categorías") {
        queryClient.invalidateQueries({ queryKey: ['coachGroupMessages', selectedCategory] });
      }
    });
    
    return unsub;
  }, [selectedCategory, queryClient]);

  const { data: chatState } = useQuery({
    queryKey: ['coachChatState', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return null;
      const gid = toGroupId(selectedCategory);
      const logs = await base44.entities.CoachChatLog.filter({ grupo_id: gid });
      return logs[0] || null;
    },
    refetchInterval: false,
    staleTime: 60000,
    enabled: !!selectedCategory,
  });

  const anyoneTyping = chatState?.padre_escribiendo;

  // Scroll inteligente tipo WhatsApp
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsScrolledToBottom(atBottom);
  };

  useEffect(() => {
    if (isScrolledToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      setNewMessageCount(0);
    } else if (!isScrolledToBottom && messages.length > 0) {
      setNewMessageCount(prev => prev + 1);
    }
  }, [messages, isScrolledToBottom, anyoneTyping]);

  // Marcar como leídos los mensajes de familias - SISTEMA UNIFICADO
  useEffect(() => {
    if (!user || !selectedCategory || messages.length === 0) return;
    const grupo_id = toGroupId(selectedCategory);

    const unreadFromParents = messages.filter((m) =>
      m.tipo === 'padre_a_grupo' &&
      (m.grupo_id === grupo_id || m.deporte === selectedCategory) &&
      (!m.leido_por || !m.leido_por.some((lp) => lp.email === user.email))
    );

    const markReads = async () => {
      try {
        const BATCH_SIZE = 10;
        const processBatch = async (batch) => {
          for (const msg of batch) {
            const leido_por = msg.leido_por || [];
            leido_por.push({ email: user.email, nombre: user.full_name, fecha: new Date().toISOString() });
            await base44.entities.ChatMessage.update(msg.id, { leido_por });
          }
        };
        const first = unreadFromParents.slice(0, BATCH_SIZE);
        await processBatch(first);
        if (unreadFromParents.length > BATCH_SIZE) {
          setTimeout(async () => {
            const rest = unreadFromParents.slice(BATCH_SIZE);
            for (let i = 0; i < rest.length; i += BATCH_SIZE) {
              await processBatch(rest.slice(i, i + BATCH_SIZE));
              await new Promise(r => setTimeout(r, 300));
            }
          }, 300);
        }

        if (unreadFromParents.length > 0) {
          // Marcar AppNotifications del entrenador como vistas
          const notifs = await base44.entities.AppNotification.filter({
            usuario_email: user.email,
            enlace: 'CoachParentChat',
            vista: false,
          });
          for (const n of notifs) {
            await base44.entities.AppNotification.update(n.id, {
              vista: true,
              fecha_vista: new Date().toISOString(),
            });
          }
          
          // TODO: Implementar nuevo sistema last_read_at

          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] }),
            queryClient.invalidateQueries({ queryKey: ['coachGroupMessagesAll'] }),
            queryClient.invalidateQueries({ queryKey: ['appNotifications'] }),
          ]);
        }
      } catch (e) {
        console.log('Error marcando como leídos mensajes de familias:', e);
      }
    };

    markReads();
  }, [user, selectedCategory, messages.length]);

  const handleTyping = async () => {
    // Typing indicator desactivado temporalmente - causaba errores de schema
    return;
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
        toast.success("Archivos adjuntados");
        return uploaded;
      }
      return [];
    } catch (error) {
      toast.error("Error al subir archivos");
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return null;
    
    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
      const fileObj = {
        url: file_url,
        nombre: file.name,
        tipo: file.type,
        tamano: file.size
      };
      toast.success("Foto capturada");
      return fileObj;
    } catch (error) {
      toast.error("Error al capturar foto");
      return null;
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
    
    const alreadyReacted = existingReactions.find(r => r.user_email === user.email && r.emoji === emoji);
    
    let newReactions;
    if (alreadyReacted) {
      newReactions = existingReactions.filter(r => !(r.user_email === user.email && r.emoji === emoji));
    } else {
      newReactions = [...existingReactions, {
        user_email: user.email,
        user_nombre: user.full_name || "Entrenador",
        emoji: emoji,
        fecha: new Date().toISOString()
      }];
    }

    await base44.entities.ChatMessage.update(messageId, {
      reacciones: newReactions
    });

    queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
    setShowReactions(null);
  };

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

  const { data: chatbotConfig } = useQuery({
    queryKey: ['chatbotConfig', selectedCategory, user?.email],
    queryFn: async () => {
      if (!selectedCategory) return null;
      const all = await base44.entities.ChatbotConfig.list();
      return all.find(c => c.categoria === selectedCategory && c.entrenador_email === user.email);
    },
    enabled: !!selectedCategory && !!user,
  });

  const sendMessageMutation = useMutation({
    onMutate: async (messageData) => {
      await queryClient.cancelQueries({ queryKey: ['coachGroupMessages', selectedCategory] });
      const previousMessages = queryClient.getQueryData(['coachGroupMessages', selectedCategory]);
      
      const grupo_id = toGroupId(selectedCategory);
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        mensaje: messageData.mensaje,
        tipo: "entrenador_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        archivos_adjuntos: messageData.adjuntos || [],
        audio_url: messageData.audio_url,
        audio_duracion: messageData.audio_duracion,
        created_date: new Date().toISOString(),
        grupo_id,
        deporte: selectedCategory,
      };
      
      queryClient.setQueryData(['coachGroupMessages', selectedCategory], (old = []) => [...old, optimisticMessage]);
      return { previousMessages };
    },
    onError: (err, messageData, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['coachGroupMessages', selectedCategory], context.previousMessages);
      }
      toast.error("Error al enviar mensaje");
    },
    mutationFn: async (messageData) => {
      const grupo_id = toGroupId(selectedCategory);
      
      const newMessage = await base44.entities.ChatMessage.create({
        grupo_id,
        deporte: selectedCategory,
        tipo: "entrenador_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        mensaje: messageData.mensaje,
        audio_url: messageData.audio_url,
        audio_duracion: messageData.audio_duracion,
        archivos_adjuntos: messageData.adjuntos || messageData.archivos_adjuntos || [],
        encuesta: messageData.encuesta,
        ubicacion: messageData.ubicacion,
        respuesta_a: messageData.respuesta_a,
        mensaje_citado: messageData.mensaje_citado,
        prioridad: "Normal",
        leido_por: [{ email: user.email, nombre: user.full_name, fecha: new Date().toISOString() }],
        reacciones: []
      });

      // Si hay imágenes, guardarlas automáticamente en la galería
      const imageFiles = (messageData.adjuntos || messageData.archivos_adjuntos || []).filter(f => f.tipo?.startsWith('image/'));
      if (imageFiles.length > 0) {
        try {
          const allGalleries = await base44.entities.PhotoGallery.filter({ categoria: selectedCategory });
          const chatGallery = allGalleries.find(g => g.titulo.includes("Chat Entrenador"));
          
          const galleryPhotos = imageFiles.map(img => ({
            url: img.url,
            descripcion: messageData.mensaje || "Compartida desde el chat",
            jugadores_etiquetados: []
          }));

          if (chatGallery) {
            const updatedPhotos = [...(chatGallery.fotos || []), ...galleryPhotos];
            await base44.entities.PhotoGallery.update(chatGallery.id, {
              fotos: updatedPhotos
            });
          } else {
            await base44.entities.PhotoGallery.create({
              titulo: `📸 Chat Entrenador - ${selectedCategory}`,
              descripcion: "Fotos compartidas desde el chat del entrenador",
              fecha_evento: new Date().toISOString().split('T')[0],
              categoria: selectedCategory,
              tipo_evento: "Entrenamiento",
              fotos: galleryPhotos,
              visible_para_padres: true,
              destacado: false
            });
          }
        } catch (error) {
          console.error("Error guardando en galería:", error);
        }
      }

      // Marcar como no escribiendo
      const log = await base44.entities.CoachChatLog.filter({ grupo_id });
      if (log.length > 0) {
        await base44.entities.CoachChatLog.update(log[0].id, {
          entrenador_escribiendo: false
        });
      }

      // Crear notificación para cada padre del grupo
      const parentEmails = [...new Set(categoryPlayers.flatMap(p => 
        [p.email_padre, p.email_tutor_2].filter(Boolean)
      ))];
      
      const categoryShort = selectedCategory.replace('Fútbol ', '').replace(' (Mixto)', '');
      
      for (const email of parentEmails) {
        await base44.entities.AppNotification.create({
          usuario_email: email,
          titulo: `⚽ ${categoryShort}: Nuevo mensaje`,
          mensaje: `${messageData.mensaje.substring(0, 100)}${messageData.mensaje.length > 100 ? '...' : ''}`,
          tipo: "importante",
          icono: "⚽",
          enlace: "ParentCoachChat",
          vista: false
        });
      }
      return newMessage;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['photoGalleries'] }),
        queryClient.refetchQueries({ queryKey: ['coachGroupMessages'] }),
      ]);
      setReplyingTo(null);
    },
  });

  const handleSendMessage = (messageData) => {
    if (editingMessage) {
      setEditingMessage(null);
      editMessageMutation.mutate({
        id: editingMessage.id,
        mensaje: messageData.mensaje
      });
      return;
    }
    
    if (replyingTo) {
      messageData.respuesta_a = replyingTo.id;
      messageData.mensaje_citado = {
        autor_nombre: replyingTo.remitente_nombre,
        mensaje: replyingTo.mensaje.substring(0, 100)
      };
    }
    
    sendMessageMutation.mutate(messageData);
  };

  const editMessageMutation = useMutation({
    mutationFn: async ({ id, mensaje }) => {
      await base44.entities.ChatMessage.update(id, {
        mensaje,
        editado: true,
        fecha_edicion: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
      toast.success("Mensaje editado");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.ChatMessage.update(messageId, {
        eliminado: true,
        mensaje: "Este mensaje fue eliminado"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
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

      await base44.entities.ChatMessage.update(messageId, {
        encuesta: {
          ...msg.encuesta,
          votos
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
      toast.success("Voto registrado");
    },
  });

  const unpinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.ChatMessage.update(messageId, {
        anclado: false,
        anclado_por: null,
        anclado_fecha: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
      toast.success("Mensaje desanclado");
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.ChatMessage.update(messageId, {
        anclado: true,
        anclado_por: user.email,
        anclado_fecha: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
      toast.success("Mensaje anclado");
    },
  });

  const pinnedMessages = messages.filter(m => m.anclado === true);

  const { data: allExercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list(),
    initialData: [],
  });

  const safePlayers = Array.isArray(allPlayers) ? allPlayers : [];
  const normalizedSelected = normalizeCategory(selectedCategory);
  const categoryPlayers = selectedCategory === "Todas las categorías" 
    ? safePlayers.filter(p => p.activo !== false)
    : safePlayers.filter(p => {
        if (p.activo === false) return false;
        // Match directo
        if (p.deporte === selectedCategory || p.categoria_principal === selectedCategory) return true;
        if ((p.categorias || []).includes(selectedCategory)) return true;
        // Match normalizado (sin acentos, sin paréntesis, case-insensitive)
        const normDeporte = normalizeCategory(p.deporte);
        const normPrincipal = normalizeCategory(p.categoria_principal);
        const normCats = (p.categorias || []).map(normalizeCategory);
        return normDeporte === normalizedSelected || normPrincipal === normalizedSelected || normCats.includes(normalizedSelected);
      });

  console.log('🔍 [CoachChatWindow] Participantes debug:', {
    selectedCategory,
    normalizedSelected,
    totalPlayers: safePlayers.length,
    matchedPlayers: categoryPlayers.length,
    sampleDeportes: safePlayers.slice(0, 5).map(p => ({ deporte: p.deporte, cat_principal: p.categoria_principal, nombre: p.nombre })),
  });

  const parentEmails = [...new Set(categoryPlayers.flatMap(p => 
    [p.email_padre, p.email_tutor_2].filter(Boolean)
  ))];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white min-h-0">
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingAudio(null)}
        onError={() => {
          setPlayingAudio(null);
          toast.error("Error al cargar el audio");
        }}
      />

      {/* Header mínimo */}
      <div className="p-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-xs truncate">
              {selectedCategory.replace('Fútbol ', '').replace(' (Mixto)', '')}
            </h2>
            <p className="text-xs text-green-100">
              Chat Grupal - {parentEmails.length} familias
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <EscalateToCoordinatorButton 
              user={user} 
              categoria={selectedCategory}
              isCoach={true}
              recentMessages={messages}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowParticipants(true)}
              className="text-white hover:bg-white/20 h-7 w-7 p-0"
            >
              <Users className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mensajes Anclados */}
      <PinnedMessagesBanner 
        pinnedMessages={pinnedMessages}
        onUnpin={(id) => unpinMessageMutation.mutate(id)}
        canUnpin={true}
      />

      {/* Mensajes */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0 min-h-0 relative" 
        style={{backgroundColor: '#E5DDD5'}}
        onScroll={handleScroll}
      >
        {/* Botón "Nuevo mensaje" */}
        {!isScrolledToBottom && newMessageCount > 0 && (
          <NewMessageButton 
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setNewMessageCount(0);
            }}
            unreadCount={newMessageCount}
          />
        )}

        {/* Renderizar mensajes con separadores de día y agrupación */}
         {groupConsecutiveMessages(messages.filter(m => !m.eliminado)).map((msg, idx, arr) => {
           const prevMsg = idx > 0 ? arr[idx - 1] : null;
           const showDateSeparator = !prevMsg || !isSameDay(new Date(prevMsg.created_date), new Date(msg.created_date));

           const isMine = msg.remitente_email === user?.email;
           const isCoachMsg = msg.tipo === "entrenador_a_grupo";

           return (
             <div key={msg.id}>
               {showDateSeparator && <DateSeparator date={msg.created_date} />}

               <div className={`flex ${isMine ? 'justify-end mr-2' : 'justify-start ml-2'} group mb-1.5`}>
                 <div className={`max-w-[72%] rounded-2xl px-3 py-2 relative`} style={{
                   fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                   fontSize: '15px',
                   lineHeight: '1.4',
                   fontWeight: 400,
                   wordWrap: 'break-word',
                   whiteSpace: 'pre-wrap',
                   backgroundColor: isMine ? '#DCF8C6' : '#FFFFFF',
                   boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
                 }}>
                   {msg.mensaje_citado && (
                     <div className={`mb-2 p-2 rounded border-l-2 ${isMine ? 'bg-green-700 border-green-400' : 'bg-slate-100 border-slate-400'}`}>
                       <p className="text-xs opacity-70">{msg.mensaje_citado.autor_nombre}</p>
                       <p className="text-xs italic truncate">{msg.mensaje_citado.mensaje}</p>
                     </div>
                   )}

                   <div className="flex items-start justify-between gap-2 mb-1">
                     <p className="text-xs font-semibold opacity-70">
                       {isCoachMsg ? '🏃 ' : ''}{msg.remitente_nombre}
                     </p>
                     {isMine && (
                       <div className="flex gap-1">
                         <Button
                           size="sm"
                           variant="ghost"
                           className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                           onClick={() => msg.anclado ? unpinMessageMutation.mutate(msg.id) : pinMessageMutation.mutate(msg.id)}
                           title={msg.anclado ? "Desanclar" : "Anclar mensaje"}
                         >
                           <Pin className={`w-3 h-3 ${msg.anclado ? 'text-yellow-600 fill-yellow-600' : ''}`} />
                         </Button>
                         <Button
                           size="sm"
                           variant="ghost"
                           className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                           onClick={() => {
                             setEditingMessage(msg);
                             toast.info("Edición próximamente");
                           }}
                         >
                           <Edit className="w-3 h-3" />
                         </Button>
                         <Button
                           size="sm"
                           variant="ghost"
                           className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                           onClick={() => deleteMessageMutation.mutate(msg.id)}
                         >
                           <Trash2 className="w-3 h-3" />
                         </Button>
                       </div>
                     )}
                     {!isMine && (
                       <Button
                         size="sm"
                         variant="ghost"
                         className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                         onClick={() => setReplyingTo(msg)}
                       >
                         <Reply className="w-3 h-3" />
                       </Button>
                     )}
                   </div>

                   {msg.audio_url ? (
                      <div className="mt-1">
                        <ChatAudioBubble url={msg.audio_url} duration={msg.audio_duracion} isMine={isMine} />
                      </div>
                    ) : msg.encuesta ? null : (
                      <p style={{fontSize: msg.mensaje?.trim().length <= 3 ? '3rem' : '15px', lineHeight: '1.4', fontWeight: 400, whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>
                        {msg.mensaje}
                        {msg.editado && <span className="text-xs opacity-50 ml-1">(editado)</span>}
                      </p>
                    )}

                   {(() => {
                     const attachments = msg.archivos_adjuntos || [];
                     const images = attachments.filter(f => f.tipo?.startsWith('image/') || f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                     const audios = attachments.filter(f => f.tipo?.startsWith('audio/'));
                     const files = attachments.filter(f => !f.tipo?.startsWith('image/') && !f.tipo?.startsWith('audio/'));
                     return (
                       <>
                         {images.length > 0 && <div className="mt-1"><ChatImageBubble images={images} isMine={isMine} /></div>}
                         {audios.map((file, idx) => <div key={`a-${idx}`} className="mt-1"><ChatAudioBubble url={file.url} duration={file.duracion} isMine={isMine} /></div>)}
                         {files.length > 0 && <div className="mt-1 space-y-1">{files.map((file, idx) => (
                           <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs p-2 rounded ${isMine ? 'bg-green-700' : 'bg-slate-100'}`}>
                             <FileText className="w-3 h-3" /><span className="flex-1 truncate">{file.nombre}</span><Download className="w-3 h-3" />
                           </a>
                         ))}</div>}
                       </>
                     );
                   })()}

                   {msg.ubicacion && <LocationMessage ubicacion={msg.ubicacion} />}

                   {msg.encuesta && (
                     <PollMessage 
                       encuesta={msg.encuesta} 
                       messageId={msg.id}
                       userEmail={user.email}
                       userName={user.full_name}
                       onVote={(msgId, optionIdx) => votePollMutation.mutate({ messageId: msgId, optionIndex: optionIdx })}
                       isCreator={msg.remitente_email === user.email}
                     />
                   )}

                   {msg.reacciones?.length > 0 && (
                     <EmojiScaler reactions={msg.reacciones} />
                   )}

                   <div className="flex items-center gap-1 justify-end mt-1">
                     <p style={{fontSize: '11px', opacity: 0.6}}>
                       {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                     </p>

                     {isMine && (
                       <div className="flex items-center">
                         {msg.leido_por && msg.leido_por.length > 0 ? (
                           <CheckCheck className="w-3 h-3 text-white opacity-70" />
                         ) : (
                           <Check className="w-3 h-3 opacity-50" />
                         )}
                       </div>
                     )}

                     <Button
                       size="sm"
                       variant="ghost"
                       className={`opacity-50 hover:opacity-100 h-5 w-5 p-0 ${isMine ? 'text-white' : 'text-slate-600'}`}
                       onClick={() => setShowReactions(msg.id)}
                     >
                       <Smile className="w-3 h-3" />
                     </Button>
                   </div>

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
             </div>
           );
         })}

        {/* Old map - keep as fallback */}
        {false && messages.map((msg) => {
          if (msg.eliminado) return null;
          
          const isMine = msg.remitente_email === user?.email;
          const isCoachMsg = msg.tipo === "entrenador_a_grupo";
          
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end mr-2' : 'justify-start ml-2'} group mb-1.5`}>
              <div className={`max-w-[72%] rounded-2xl px-3 py-2 relative`} style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSize: '15px',
                lineHeight: '1.4',
                fontWeight: 400,
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                backgroundColor: isMine ? '#DCF8C6' : '#FFFFFF',
                boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
              }}>
                {msg.mensaje_citado && (
                  <div className={`mb-2 p-2 rounded border-l-2 ${isMine ? 'bg-green-700 border-green-400' : 'bg-slate-100 border-slate-400'}`}>
                    <p className="text-xs opacity-70">{msg.mensaje_citado.autor_nombre}</p>
                    <p className="text-xs italic truncate">{msg.mensaje_citado.mensaje}</p>
                  </div>
                )}
                
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold opacity-70">
                    {isCoachMsg ? '🏃 ' : ''}{msg.remitente_nombre}
                  </p>
                  {isMine && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => msg.anclado ? unpinMessageMutation.mutate(msg.id) : pinMessageMutation.mutate(msg.id)}
                        title={msg.anclado ? "Desanclar" : "Anclar mensaje"}
                      >
                        <Pin className={`w-3 h-3 ${msg.anclado ? 'text-yellow-600 fill-yellow-600' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => {
                          setEditingMessage(msg);
                          toast.info("Edición próximamente");
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => deleteMessageMutation.mutate(msg.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {!isMine && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={() => setReplyingTo(msg)}
                    >
                      <Reply className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                {msg.audio_url ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant={isMine ? "secondary" : "outline"}
                      onClick={() => togglePlayAudio(msg.audio_url)}
                      disabled={!msg.audio_url}
                    >
                      {playingAudio === msg.audio_url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <span className="text-sm">🎤 {msg.audio_duracion}s</span>
                  </div>
                ) : msg.encuesta ? (
                  // NO mostrar el texto cuando hay encuesta
                  null
                ) : (
                  <p style={{fontSize: '15px', lineHeight: '1.4', fontWeight: 400, whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>
                    <EmojiScaler content={msg.mensaje} />
                    {msg.editado && <span className="text-xs opacity-50 ml-1">(editado)</span>}
                  </p>
                )}

                {/* Archivos ANTES de la encuesta */}
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
                          className={`flex items-center gap-2 text-xs p-2 rounded ${isMine ? 'bg-green-700' : 'bg-slate-100'}`}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="flex-1 truncate">{file.nombre}</span>
                          <Download className="w-3 h-3" />
                        </a>
                      )
                    ))}
                  </div>
                )}

                {msg.ubicacion && <LocationMessage ubicacion={msg.ubicacion} />}
                
                {msg.encuesta && (
                  <PollMessage 
                    encuesta={msg.encuesta} 
                    messageId={msg.id}
                    userEmail={user.email}
                    userName={user.full_name}
                    onVote={(msgId, optionIdx) => votePollMutation.mutate({ messageId: msgId, optionIndex: optionIdx })}
                    isCreator={msg.remitente_email === user.email}
                  />
                )}

                {msg.reacciones?.length > 0 && (
                  <EmojiScaler reactions={msg.reacciones} />
                )}

                <div className="flex items-center gap-1 justify-end mt-1">
                  <p style={{fontSize: '11px', opacity: 0.6}}>
                    {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                  </p>
                  
                  {/* Doble check visual - solo en mensajes propios */}
                  {isMine && (
                    <div className="flex items-center">
                      {msg.leido_por && msg.leido_por.length > 0 ? (
                        <CheckCheck className="w-3 h-3 text-white opacity-70" />
                      ) : (
                        <Check className="w-3 h-3 opacity-50" />
                      )}
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`opacity-50 hover:opacity-100 h-5 w-5 p-0 ${isMine ? 'text-white' : 'text-slate-600'}`}
                    onClick={() => setShowReactions(msg.id)}
                  >
                    <Smile className="w-3 h-3" />
                  </Button>
                </div>

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
        
        {anyoneTyping && (
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

      <CoachChatInput
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        onCameraCapture={handleCameraCapture}
        onLocationClick={() => setShowLocationDialog(true)}
        onPollClick={() => setShowPollDialog(true)}
        onExerciseClick={() => setShowExerciseShare(true)}
        uploading={uploading}
        placeholder="Escribe un mensaje..."
      />

      {/* Dialogs */}
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
              <Button onClick={sendLocationFromBrowser} className="flex-1 bg-green-600">
                <MapPin className="w-4 h-4 mr-2" />
                Enviar mi ubicación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {showParticipants && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowParticipants(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">👥 Participantes - {selectedCategory}</h3>
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                <p className="text-sm font-bold text-green-900">🏃 Entrenador</p>
                <p className="text-xs text-green-700 mt-1">{user?.full_name}</p>
              </div>
              
              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">👨‍👩‍👧 Familias ({parentEmails.length})</p>
                <div className="space-y-2">
                  {categoryPlayers.map((player, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-3 border">
                      <p className="text-sm font-medium text-slate-900">{player.nombre}</p>
                      <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                        {player.email_padre && <p>📧 {player.email_padre}</p>}
                        {player.email_tutor_2 && <p>📧 {player.email_tutor_2}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Share Dialog */}
      <Dialog open={showExerciseShare} onOpenChange={setShowExerciseShare}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-orange-600" />
              Compartir Ejercicio
            </DialogTitle>
          </DialogHeader>
          <ExerciseShareDialog
            exercises={allExercises}
            selectedCategory={selectedCategory}
            user={user}
            onClose={() => {
              setShowExerciseShare(false);
              queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}