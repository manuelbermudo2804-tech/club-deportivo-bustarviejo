import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Users, Search, X, FileText, Download, Image as ImageIcon, Play, Pause, Smile } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import PollMessage from "../components/chat/PollMessage";
import LocationMessage from "../components/chat/LocationMessage";
import EscalateToCoordinatorButton from "../components/coach/EscalateToCoordinatorButton";
import CoachProfilePreview from "../components/coach/CoachProfilePreview";

export default function ParentCoachChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [categoryCoach, setCategoryCoach] = useState(null);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const queryClient = useQueryClient();

  const REACTIONS = ["👍", "❤️", "😊", "👏", "🎉", "⚽"];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const allPlayers = await base44.entities.Player.list();
        const players = allPlayers.filter(p => 
          (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email) && p.activo
        );
        setMyPlayers(players);
        
        if (players.length > 0 && !selectedCategory) {
          setSelectedCategory(players[0].deporte);
        }
      } catch (error) {
        console.error("Error loading chat:", error);
        toast.error("Error al cargar el chat");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Obtener entrenador de la categoría seleccionada - DESACTIVADO porque los padres no tienen permiso para listar User
  // El perfil del entrenador ya no se muestra para padres normales
  useEffect(() => {
    if (selectedCategory) {
      setCategoryCoach(null); // Limpiar el coach ya que no podemos obtenerlo
    }
  }, [selectedCategory]);

  const { data: messages = [] } = useQuery({
    queryKey: ['coachGroupMessages', selectedCategory, user?.email],
    queryFn: async () => {
      if (!selectedCategory || !user) return [];
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      const allMessages = await base44.entities.ChatMessage.filter({ grupo_id }, 'created_date');
      // Filtrar privados solo si hay destinatario explícito
      return allMessages.filter(msg => !msg.destinatario_email || msg.destinatario_email === user.email);
    },
    refetchInterval: 1000,
    refetchOnWindowFocus: true,
    enabled: !!selectedCategory && !!user,
  });

  // Obtener todos los mensajes para contar sin leer por categoría
  const { data: allChatMessages = [] } = useQuery({
    queryKey: ['allCoachGroupMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    refetchInterval: 2000,
    enabled: !!user,
  });

  const getUnreadCountByCategory = (categoria) => {
    if (!user) return 0;
    const grupo_id = categoria.toLowerCase().replace(/\s+/g, '_');
    
    return allChatMessages.filter(m => 
      m.grupo_id === grupo_id &&
      m.tipo === "entrenador_a_grupo" &&
      (!m.destinatario_email || m.destinatario_email === user.email) &&
      (!m.leido_por || !m.leido_por.some(lp => lp.email === user.email))
    ).length;
  };

  // Marcar notificaciones Y MENSAJES como leídos inmediatamente al abrir el chat
  useEffect(() => {
    if (!user || !selectedCategory || messages.length === 0) return;

    const markAsRead = async () => {
      try {
        const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
        
        // 1. Marcar MENSAJES del entrenador como leídos
        const unreadCoachMessages = messages.filter(m => 
          m.tipo === "entrenador_a_grupo" && 
          !m.leido &&
          m.grupo_id === grupo_id
        );
        
        for (const msg of unreadCoachMessages) {
          const leidoPor = msg.leido_por || [];
          if (!leidoPor.some(l => l.email === user.email)) {
            leidoPor.push({
              email: user.email,
              nombre: user.full_name,
              fecha: new Date().toISOString()
            });
          }
          
          await base44.entities.ChatMessage.update(msg.id, {
            leido: true,
            leido_por: leidoPor
          });
        }
        
        // 2. Marcar AppNotifications como vistas
        const notifications = await base44.entities.AppNotification.filter({ 
          usuario_email: user.email,
          enlace: "ParentCoachChat",
          vista: false
        });
        
        for (const notif of notifications) {
          await base44.entities.AppNotification.update(notif.id, {
            vista: true,
            fecha_vista: new Date().toISOString()
          });
        }
        
        // 3. Invalidar queries GLOBALES para actualizar el dashboard
        if (unreadCoachMessages.length > 0 || notifications.length > 0) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['appNotifications'] }),
            queryClient.invalidateQueries({ queryKey: ['chatMessages'] }),
            queryClient.refetchQueries({ queryKey: ['appNotifications'] }),
            queryClient.refetchQueries({ queryKey: ['chatMessages'] }),
          ]);
        }
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    };

    markAsRead();
  }, [user, selectedCategory, messages.length]);

  const filteredMessages = searchTerm 
    ? messages.filter(m => m.mensaje?.toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);



  const { data: coachSettings } = useQuery({
    queryKey: ['coachSettings', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return null;
      
      // Obtener todos los settings
      const allSettings = await base44.entities.CoachSettings.list();
      
      // Buscar el setting del entrenador que entrena ESTA categoría específica
      const relevantSettings = allSettings.find(s => 
        s.categorias_entrena?.includes(selectedCategory)
      );
      
      console.log('🔍 Buscando settings para categoría:', selectedCategory);
      console.log('📋 Settings encontrados:', relevantSettings);
      
      return relevantSettings || null;
    },
    enabled: !!selectedCategory,
  });

  const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const sendMessageMutation = useMutation({
    mutationFn: async (mensaje) => {
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      
      const newMessage = await base44.entities.ChatMessage.create({
        grupo_id,
        deporte: selectedCategory,
        tipo: "padre_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        mensaje: mensaje,
        archivos_adjuntos: [],
        prioridad: "Normal",
        leido: false
      });

      const allCoachSettings = await base44.entities.CoachSettings.list();
      const coachesForCategory = allCoachSettings.filter(s => 
        s.categorias_entrena?.includes(selectedCategory)
      );
      
      for (const coachSetting of coachesForCategory) {
        await base44.entities.AppNotification.create({
          usuario_email: coachSetting.entrenador_email,
          titulo: `⚽ Nuevo mensaje en ${selectedCategory}`,
          mensaje: `${user.full_name}: ${mensaje.substring(0, 100)}${mensaje.length > 100 ? '...' : ''}`,
          tipo: "importante",
          icono: "⚽",
          enlace: "CoachParentChat",
          vista: false
        });
      }

      const settings = allCoachSettings.find(s => 
        s.categorias_entrena?.includes(selectedCategory)
      );
      
      if (settings?.modo_ausente === true && settings?.mensaje_ausente) {
        await base44.entities.ChatMessage.create({
          grupo_id,
          deporte: selectedCategory,
          tipo: "entrenador_a_grupo",
          remitente_email: "sistema@entrenador",
          remitente_nombre: "🤖 Entrenador (automático)",
          mensaje: settings.mensaje_ausente,
          archivos_adjuntos: [],
          prioridad: "Normal",
          leido: false
        });
        return;
      }

      if (settings?.horario_laboral_activo === true && settings?.horario_inicio && settings?.horario_fin && settings?.dias_laborales?.length > 0) {
        const now = new Date();
        const dayName = DIAS_SEMANA[now.getDay() === 0 ? 6 : now.getDay() - 1];
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const isWorkingDay = settings.dias_laborales.includes(dayName);
        const isWithinHours = currentTime >= settings.horario_inicio && currentTime <= settings.horario_fin;

        if (!isWorkingDay || !isWithinHours) {
          await base44.entities.ChatMessage.create({
            grupo_id,
            deporte: selectedCategory,
            tipo: "entrenador_a_grupo",
            remitente_email: "sistema@entrenador",
            remitente_nombre: "🤖 Entrenador (automático)",
            mensaje: settings.mensaje_fuera_horario || "Tu mensaje ha sido recibido. El entrenador te responderá en su horario laboral.",
            archivos_adjuntos: [],
            prioridad: "Normal",
            leido: false
          });
        }
      }
    },
    onMutate: async (newMensaje) => {
      await queryClient.cancelQueries({ queryKey: ['coachGroupMessages'] });
      
      const previousMessages = queryClient.getQueryData(['coachGroupMessages', selectedCategory, user?.email]);
      
      const optimisticMessage = {
        id: 'temp-' + Date.now(),
        grupo_id: selectedCategory.toLowerCase().replace(/\s+/g, '_'),
        tipo: "padre_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        mensaje: newMensaje,
        created_date: new Date().toISOString(),
        leido: false,
        archivos_adjuntos: []
      };
      
      queryClient.setQueryData(['coachGroupMessages', selectedCategory, user?.email], old => [...(old || []), optimisticMessage]);
      
      return { previousMessages };
    },
    onError: (err, newMensaje, context) => {
      queryClient.setQueryData(['coachGroupMessages', selectedCategory, user?.email], context.previousMessages);
      toast.error("Error al enviar mensaje");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['allCoachGroupMessages'] }),
        queryClient.refetchQueries({ queryKey: ['coachGroupMessages'] }),
      ]);
    },
  });

  const votePollMutation = useMutation({
    mutationFn: async ({ messageId, optionIndex }) => {
      const msg = messages.find(m => m.id === messageId);
      const poll = msg.encuesta || msg.poll;
      const votos = poll?.votos || [];
      
      votos.push({
        usuario_email: user.email,
        usuario_nombre: user.full_name,
        opcion_index: optionIndex,
        fecha: new Date().toISOString()
      });

      const updateData = msg.encuesta 
        ? { encuesta: { ...poll, votos } }
        : { poll: { ...poll, votos } };

      await base44.entities.ChatMessage.update(messageId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
      toast.success("Voto registrado");
    },
  });

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

    await base44.entities.ChatMessage.update(messageId, {
      reacciones: newReactions
    });

    queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
    setShowReactions(null);
  };

  const handleSend = () => {
    if (!messageText.trim()) return;
    const textToSend = messageText;
    setMessageText(""); // Limpiar inmediatamente
    sendMessageMutation.mutate(textToSend);
  };

  const togglePlayAudio = (audioUrl) => {
    if (playingAudio === audioUrl) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudio(audioUrl);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-slate-500 text-sm">Cargando chat...</p>
        </div>
      </div>
    );
  }

  if (!user || myPlayers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold mb-2">No hay jugadores registrados</p>
          <p className="text-slate-500 text-sm">Para acceder al chat del entrenador, primero debes tener jugadores activos registrados.</p>
        </div>
      </div>
    );
    }

    const categories = [...new Set(myPlayers.map(p => p.deporte))];

    return (
    <>
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      {/* Preview de imagen */}
      {showImagePreview && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowImagePreview(null)}>
          <img src={showImagePreview} alt="Preview" className="max-w-full max-h-full rounded" onClick={e => e.stopPropagation()} />
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

    <div className="fixed inset-0 lg:inset-auto lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:bottom-0 flex flex-col overflow-hidden pt-[100px] lg:pt-0 pb-0">
      <Card className="border-blue-200 shadow-lg h-full flex flex-col overflow-hidden lg:rounded-lg rounded-none">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4" />
              Chat Entrenador
            </CardTitle>
            <EscalateToCoordinatorButton 
              user={user} 
              categoria={selectedCategory}
              recentMessages={messages}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
          {categories.some(cat => getUnreadCountByCategory(cat) > 0) && (
            <div className="px-2 py-1 bg-blue-50 border-b border-blue-200 text-blue-800 text-xs flex gap-2 overflow-x-auto">
              <span className="font-semibold">Nuevos:</span>
              {categories.filter(cat => getUnreadCountByCategory(cat) > 0).map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className="bg-white border border-blue-300 rounded-full px-2 py-0.5 hover:bg-blue-100">
                  {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                  <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1 py-0 h-4 align-middle">
                    {getUnreadCountByCategory(cat)}
                  </Badge>
                </button>
              ))}
            </div>
          )}
          {categories.length > 1 && (
            <div className="flex gap-1.5 p-1.5 bg-slate-50 border-b overflow-x-auto flex-shrink-0">
              {categories.map(cat => {
                const unreadCount = getUnreadCountByCategory(cat);
                return (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="whitespace-nowrap text-xs px-2 py-1 h-7 relative"
                  >
                    {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Perfil del Entrenador */}
          {categoryCoach && (
            <div className="p-2 border-b bg-white flex-shrink-0">
              <CoachProfilePreview coach={categoryCoach} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 min-h-0">
            {selectedCategory && getUnreadCountByCategory(selectedCategory) > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded-lg">
                Tienes {getUnreadCountByCategory(selectedCategory)} mensajes nuevos en {selectedCategory.replace('Fútbol ', '').replace(' (Mixto)', '')}
              </div>
            )}
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">
                  {searchTerm ? "No se encontraron mensajes" : "Aún no hay mensajes"}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, idx) => {
                const showDateSeparator = idx === 0 || 
                  new Date(filteredMessages[idx - 1].created_date).toDateString() !== 
                  new Date(msg.created_date).toDateString();
                const dateLabel = new Date(msg.created_date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                });

                const isMine = msg.remitente_email === user.email;
                const isCoach = msg.tipo === "entrenador_a_grupo";

                // Debug logs
                if (msg.encuesta || msg.poll || msg.ubicacion) {
                  console.log('🔍 Mensaje especial encontrado:', {
                    id: msg.id,
                    tiene_encuesta: !!msg.encuesta,
                    tiene_poll: !!msg.poll,
                    tiene_ubicacion: !!msg.ubicacion,
                    remitente: msg.remitente_nombre
                  });
                }

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-4">
                        <div className="bg-white px-4 py-1 rounded-full text-xs text-slate-600 shadow-sm">
                          {dateLabel}
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      {/* Mensaje de texto, audio o archivos */}
                      {(msg.mensaje || msg.audio_url || msg.archivos_adjuntos?.length > 0) && !msg.encuesta && !msg.poll && !msg.ubicacion && (
                        <div className={`max-w-[75%] ${
                          isMine ? 'bg-slate-700 text-white' : 
                          isCoach ? 'bg-green-600 text-white' : 
                          'bg-white text-slate-900 border'
                        } rounded-2xl p-3 shadow-sm relative`}>
                         <div className="flex items-center gap-2 mb-1">
                           <p className="text-xs font-semibold opacity-70">
                             {isCoach ? '🏃 ' : ''}{msg.remitente_nombre}
                           </p>
                           {isCoach && <Badge className="text-xs bg-green-500 px-1 py-0">Entrenador</Badge>}
                         </div>

                          {msg.mensaje && <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>}

                          {msg.audio_url && (
                            <div className="flex items-center gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant={isMine ? "secondary" : "outline"}
                                onClick={() => togglePlayAudio(msg.audio_url)}
                              >
                                {playingAudio === msg.audio_url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                              <span className="text-sm">🎤 {msg.audio_duracion}s</span>
                            </div>
                          )}

                          {msg.archivos_adjuntos?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.archivos_adjuntos.map((file, idx) => (
                                file.tipo?.startsWith('image/') ? (
                                  <img 
                                    key={idx}
                                    src={file.url} 
                                    alt={file.nombre}
                                    className="rounded cursor-pointer max-w-full h-auto max-h-64 object-contain"
                                    onClick={() => setShowImagePreview(file.url)}
                                  />
                                ) : (
                                  <a
                                    key={idx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-xs p-2 rounded ${isMine ? 'bg-slate-600' : isCoach ? 'bg-green-700' : 'bg-slate-100'}`}
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
                                <span key={idx} className="text-base" title={r.user_nombre}>
                                  {r.emoji}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs opacity-60">
                              {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-50 hover:opacity-100 h-6 w-6 p-0"
                              onClick={() => setShowReactions(msg.id)}
                            >
                              <Smile className="w-3 h-3" />
                            </Button>
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
                      )}

                      {/* Encuesta */}
                      {(msg.encuesta || msg.poll) && (
                        <div className="w-full max-w-[85%]">
                          <div className="mb-1 px-2">
                            <p className="text-xs font-semibold text-slate-600">
                              {isCoach ? '🏃 ' : ''}{msg.remitente_nombre}
                            </p>
                          </div>
                          <PollMessage 
                            encuesta={msg.encuesta || msg.poll} 
                            messageId={msg.id}
                            userEmail={user.email}
                            userName={user.full_name}
                            onVote={(msgId, optionIdx) => votePollMutation.mutate({ messageId: msgId, optionIndex: optionIdx })}
                            isCreator={msg.remitente_email === user.email}
                          />
                          <p className="text-xs text-slate-500 mt-1 px-2">
                            {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                          </p>
                        </div>
                      )}

                      {/* Ubicación */}
                      {msg.ubicacion && (
                        <div className="w-full max-w-[85%]">
                          <div className="mb-1 px-2">
                            <p className="text-xs font-semibold text-slate-600">
                              {isCoach ? '🏃 ' : ''}{msg.remitente_nombre}
                            </p>
                          </div>
                          <LocationMessage ubicacion={msg.ubicacion} />
                          <p className="text-xs text-slate-500 mt-1 px-2">
                            {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                          </p>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-2 bg-white border-t flex-shrink-0">
            <div className="flex gap-2 items-end">
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
                disabled={!messageText.trim()} 
                className="bg-blue-600 hover:bg-blue-700 h-11 w-11 p-0 flex-shrink-0 rounded-full"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
      </>
      );
      }