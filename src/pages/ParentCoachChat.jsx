import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users, Search, X, FileText, Download, Play, Pause, Smile } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import PollMessage from "../components/chat/PollMessage";
import LocationMessage from "../components/chat/LocationMessage";
import EscalateToCoordinatorButton from "../components/coach/EscalateToCoordinatorButton";
import CoachProfilePreview from "../components/coach/CoachProfilePreview";
import ParentChatInput from "../components/chat/ParentChatInput";
import EmojiScaler from "../components/chat/EmojiScaler";
import { useChatUnreadCounts } from "../components/chat/useChatUnreadCounts";

const REACTIONS = ["👍", "❤️", "😊", "👏", "🎉", "⚽"];

// Normalización de categorías (ignora paréntesis/acentos y espacios)
const normalizeCategory = (s = "") =>
  s
    .toString()
    .replace(/\(.*?\)/g, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const toGroupId = (s = "") => normalizeCategory(s).replace(/\s+/g, "_");

export default function ParentCoachChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [lockedCategory, setLockedCategory] = useState(null);
  const { counts, markRead, clearActiveChat } = useChatUnreadCounts(user);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [categoryCoach, setCategoryCoach] = useState(null);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const queryClient = useQueryClient();



  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const allPlayers = await base44.entities.Player.list();
        const players = allPlayers.filter(p => 
          (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email || p.email_jugador === currentUser.email) && p.activo
        );
        setMyPlayers(players);
        
        if (players.length > 0 && !selectedCategory) {
          // Si viene ?category=... desde el hub, bloquear en esa categoría (sin pestañas)
          const urlParams = new URLSearchParams(window.location.search);
          const urlCategory = urlParams.get('category');
          if (urlCategory && players.some(p => (p.categoria_principal || p.deporte) === urlCategory)) {
            setSelectedCategory(urlCategory);
            setLockedCategory(urlCategory);
          } else {
            const firstCat = players[0].categoria_principal || players[0].deporte;
            setSelectedCategory(firstCat);
          }
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

  // Obtener todos los mensajes del chat entrenador-familias
  const { data: messages = [] } = useQuery({
    queryKey: ['coachParentChatMessages'],
    queryFn: async () => {
      if (!user) return [];
      const [byType, byMine] = await Promise.all([
        base44.entities.ChatMessage.filter({ tipo: { $in: ['padre_a_grupo', 'entrenador_a_grupo'] } }, 'created_date'),
        base44.entities.ChatMessage.filter({ remitente_email: user.email }, 'created_date')
      ]);
      const merged = [...byType, ...byMine].reduce((acc, m) => { acc[m.id] = m; return acc; }, {});
      return Object.values(merged).sort((a,b)=>new Date(a.created_date)-new Date(b.created_date));
    },
    enabled: !!user,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });

  // REAL-TIME: Suscripción a mensajes
  useEffect(() => {
    if (!user) return;
    
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if ((event.data?.tipo === 'padre_a_grupo' || event.data?.tipo === 'entrenador_a_grupo') && event.data?.remitente_email !== user.email) {
        queryClient.invalidateQueries({ queryKey: ['coachParentChatMessages'] });
      }
    });
    
    return unsub;
  }, [user?.email, queryClient]);

  const getUnreadCountByCategory = (categoria) => {
    if (!user) return 0;
    const key = toGroupId(categoria);
    // 1) Usa el contador oficial del backend (evita parpadeos)
    const backendCount = counts?.team_chats?.[key];
    if (typeof backendCount === 'number') return backendCount;
    // 2) Fallback con mensajes locales si aún no tenemos el mapeo
    const normCat = normalizeCategory(categoria);
    return messages.filter(m => {
      const normMsgCat = normalizeCategory(m.deporte || "");
      const matchGroup = m.grupo_id && m.grupo_id === key;
      const matchName = normMsgCat && (normMsgCat === normCat || normMsgCat.startsWith(normCat) || normCat.startsWith(normMsgCat));
      return (matchGroup || matchName) &&
        (m.tipo === 'entrenador_a_grupo' || m.tipo === 'padre_a_grupo') &&
        (!m.leido_por || !m.leido_por.some(lp => lp.email === user.email));
    }).length;
  };

  // Marcar como leído cada vez que se entra en una categoría (con lógica anti-parpadeo en el hook)
  useEffect(() => {
    if (!user?.email || !selectedCategory) return;
    const gid = toGroupId(selectedCategory);
    if (gid) {
      markRead('team', gid);
    }
  }, [user?.email, selectedCategory]);

  // Al salir del chat, limpiar el chat activo para que vuelvan a contar los +1
  useEffect(() => {
    return () => {
      try { clearActiveChat(); } catch {}
    };
  }, []);

  const categoryKey = toGroupId(selectedCategory || "");
  const categoryMessages = selectedCategory
    ? messages
        .filter(m => {
          const normMsgCat = normalizeCategory(m.deporte || "");
          const normSel = normalizeCategory(selectedCategory || "");
          const matchGroup = m.grupo_id === categoryKey;
          const matchName = normMsgCat && (normMsgCat === normSel || normMsgCat.startsWith(normSel) || normSel.startsWith(normMsgCat));
          return (matchGroup || matchName) && (m.tipo === 'padre_a_grupo' || m.tipo === 'entrenador_a_grupo');
        })
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  const filteredMessages = searchTerm 
    ? categoryMessages.filter(m => m.mensaje?.toLowerCase().includes(searchTerm.toLowerCase()))
    : categoryMessages;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedCategory]);



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
    onMutate: async (messageData) => {
      await queryClient.cancelQueries({ queryKey: ['coachParentChatMessages'] });
      const previousMessages = queryClient.getQueryData(['coachParentChatMessages']);

      const categoryKey = toGroupId(selectedCategory || "");
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        mensaje: messageData.mensaje,
        tipo: "padre_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        adjuntos: messageData.adjuntos || [],
        archivos_adjuntos: messageData.adjuntos || [],
        audio_url: messageData.audio_url,
        audio_duracion: messageData.audio_duracion,
        created_date: new Date().toISOString(),
        grupo_id: categoryKey,
        deporte: selectedCategory,
        leido_por: [{ email: user.email, nombre: user.full_name, fecha: new Date().toISOString() }],
      };

      queryClient.setQueryData(['coachParentChatMessages'], (old = []) => [...old, optimisticMessage]);
      return { previousMessages, tempId: optimisticMessage.id };
    },
    onError: (err, vars, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['coachParentChatMessages'], context.previousMessages);
      }
      toast.error("Error al enviar mensaje");
    },
    mutationFn: async (messageData) => {
       const categoryKey = toGroupId(selectedCategory || "");

       const newMessage = await base44.entities.ChatMessage.create({
         tipo: "padre_a_grupo",
         remitente_email: user.email,
         remitente_nombre: user.full_name,
         mensaje: messageData.mensaje,
         audio_url: messageData.audio_url,
         audio_duracion: messageData.audio_duracion,
         archivos_adjuntos: messageData.adjuntos || [],
         grupo_id: categoryKey,
         deporte: selectedCategory,
         leido_por: [{ email: user.email, nombre: user.full_name, fecha: new Date().toISOString() }],
       });

       // Obtener entrenadores de esta categoría y crear notificaciones
       try {
         const allSettings = await base44.entities.CoachSettings.list();
         const coachesForCategory = allSettings.filter(s => s.categorias_entrena?.includes(selectedCategory));
         
         const categoryShort = selectedCategory.replace('Fútbol ', '').replace(' (Mixto)', '');
         
         for (const coach of coachesForCategory) {
           if (coach.entrenador_email && coach.entrenador_email !== user.email) {
             await base44.entities.AppNotification.create({
               usuario_email: coach.entrenador_email,
               titulo: `⚽ ${categoryShort}: Mensaje de ${user.full_name}`,
               mensaje: `${messageData.mensaje.substring(0, 100)}${messageData.mensaje.length > 100 ? '...' : ''}`,
               tipo: "importante",
               icono: "⚽",
               enlace: "CoachParentChat",
               vista: false
             });
           }
         }
       } catch (e) {
         console.log('Error notificando al entrenador:', e);
       }

       return newMessage;
    },
    onSuccess: async (createdMessage, vars, context) => {
      // Reemplazar el mensaje optimista por el real para evitar el "parpadeo"
      queryClient.setQueryData(['coachParentChatMessages'], (old = []) => {
        if (!old || old.length === 0) return [createdMessage];
        return old.map(m => (m.id === context?.tempId ? createdMessage : m));
      });
      // Refresco en segundo plano para sincronizar
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['coachParentChatMessages'] });
      }, 300);
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
      queryClient.invalidateQueries({ queryKey: ['coachParentChatMessages'] });
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

    queryClient.invalidateQueries({ queryKey: ['coachParentChatMessages'] });
    setShowReactions(null);
  };

  const handleSendMessage = useCallback((messageData) => {
    sendMessageMutation.mutate(messageData);
  }, [sendMessageMutation]);

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

    const categories = Array.from(new Map(
      myPlayers
        .map(p => (p.categoria_principal || p.deporte))
        .filter(Boolean)
        .map(cat => [normalizeCategory(cat), cat]) // dedup por normalizado, conserva etiqueta original
    ).values());

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
          {/* Solo mostrar pestañas de categorías si NO viene de URL con categoría fija */}
          {!lockedCategory && categories.some(cat => getUnreadCountByCategory(cat) > 0) && (
            <div className="px-2 py-1.5 bg-yellow-50 border-b border-yellow-200 flex gap-2 overflow-x-auto flex-wrap">
              <span className="text-xs font-semibold text-yellow-800 whitespace-nowrap">🔔 Nuevos mensajes:</span>
              {categories.filter(cat => getUnreadCountByCategory(cat) > 0).map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)} 
                  className="bg-yellow-200 border border-yellow-400 rounded-full px-2 py-0.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-300 transition-colors whitespace-nowrap"
                >
                  {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                  <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1 py-0 h-4 animate-pulse">
                    {getUnreadCountByCategory(cat)}
                  </Badge>
                </button>
              ))}
            </div>
          )}
          {!lockedCategory && categories.length > 1 && (
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
                      <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
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

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0 min-h-0" style={{backgroundColor: '#E5DDD5'}}>
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
                    
                    <div className={`flex ${isMine ? 'justify-end mr-2' : 'justify-start ml-2'} mb-1.5`}>
                      {/* Mensaje de texto, audio o archivos */}
                      {(msg.mensaje || msg.audio_url || msg.archivos_adjuntos?.length > 0) && !msg.encuesta && !msg.poll && !msg.ubicacion && (
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
                         <div className="flex items-center gap-1 mb-1">
                           <p className="text-xs font-semibold opacity-70">
                             {isCoach ? '🏃 ' : ''}{msg.remitente_nombre}
                           </p>
                           {isCoach && <Badge className="text-[10px] bg-green-500 px-1 py-0 h-4">Entrenador</Badge>}
                         </div>

                          {msg.mensaje && (
                            <p style={{fontSize: '15px', lineHeight: '1.4', fontWeight: 400, whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>
                              <EmojiScaler content={msg.mensaje} />
                            </p>
                          )}

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
                                   loading="lazy"
                                   className="rounded cursor-pointer max-w-full h-auto max-h-64 object-contain bg-slate-100"
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
                            <EmojiScaler reactions={msg.reacciones} />
                          )}

                          <div className="flex items-center gap-1 justify-end mt-1">
                            <p style={{fontSize: '11px', opacity: 0.6}}>
                              {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                            </p>
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

          <ParentChatInput
             onSendMessage={handleSendMessage}
             uploading={uploading}
             placeholder="Escribe tu mensaje..."
           />
        </CardContent>
      </Card>
      </div>
      </>
      );
      }