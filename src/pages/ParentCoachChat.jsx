import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users, Search, X, FileText, Download, Play, Pause, Smile, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import PollMessage from "../components/chat/PollMessage";
import LocationMessage from "../components/chat/LocationMessage";
import EscalateToCoordinatorButton from "../components/coach/EscalateToCoordinatorButton";
import CoachProfilePreview from "../components/coach/CoachProfilePreview";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ParentChatInput from "../components/chat/ParentChatInput";
import EmojiScaler from "../components/chat/EmojiScaler";
import ChatImageBubble from "../components/chat/ChatImageBubble";
import ChatAudioBubble from "../components/chat/ChatAudioBubble";
import { useChatUnreadCounts } from "../components/chat/useChatUnreadCounts";


const REACTIONS = ["👍", "❤️", "😊", "👏", "🎉", "⚽"];

// Normalización de categorías (ignora paréntesis/acentos y espacios)
const normalizeCategory = (s) =>
  (s || "")
    .toString()
    .replace(/\(.*?\)/g, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const toGroupId = (s) => normalizeCategory(s).replace(/\s+/g, "_");

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

  const categoryKey = toGroupId(selectedCategory || "");

  // Obtener entrenador de la categoría desde CoachSettings (debe declararse ANTES del useEffect que lo usa)
  const { data: coachSettings } = useQuery({
    queryKey: ['coachSettings', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return null;
      const allSettings = await base44.entities.CoachSettings.list('-updated_date', 50);
      return allSettings.find(s => (s.categorias_entrena || []).includes(selectedCategory)) || null;
    },
    enabled: !!selectedCategory,
    staleTime: 120000,
  });

  useEffect(() => {
    let cancelled = false;
    const fetchUser = async (attempt = 0) => {
      try {
        const currentUser = await base44.auth.me();
        if (cancelled) return;
        setUser(currentUser);

        const allPlayers = await base44.entities.Player.filter({
          $or: [
            { email_padre: currentUser.email },
            { email_tutor_2: currentUser.email },
            { email_jugador: currentUser.email }
          ],
          activo: true
        });
        if (cancelled) return;
        setMyPlayers(allPlayers);
        
        if (allPlayers.length > 0 && !selectedCategory) {
          const urlParams = new URLSearchParams(window.location.search);
          const urlCategory = urlParams.get('category');
          if (urlCategory && allPlayers.some(p => (p.categoria_principal || p.deporte) === urlCategory)) {
            setSelectedCategory(urlCategory);
            setLockedCategory(urlCategory);
          } else {
            const firstCat = allPlayers[0].categoria_principal || allPlayers[0].deporte;
            setSelectedCategory(firstCat);
          }
        }
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        const is429 = error?.status === 429 || error?.message?.includes('Rate limit');
        if (is429 && attempt < 3) {
          const delay = Math.min(5000, 1500 * Math.pow(2, attempt));
          console.log(`⏳ Chat: rate limited, reintentando en ${delay}ms...`);
          setTimeout(() => fetchUser(attempt + 1), delay);
          return;
        }
        console.error("Error loading chat:", error);
        setLoading(false);
      }
    };
    fetchUser();
    return () => { cancelled = true; };
  }, []);

  // Actualizar entrenador de la categoría cuando cambie coachSettings
  useEffect(() => {
    if (selectedCategory && coachSettings) {
      setCategoryCoach({
        full_name: coachSettings.entrenador_nombre || coachSettings.entrenador_email,
        email: coachSettings.entrenador_email,
        foto_perfil_url: coachSettings.foto_perfil_url,
        bio_entrenador: coachSettings.bio_entrenador,
        telefono_contacto: coachSettings.telefono_contacto,
        categorias_entrena: coachSettings.categorias_entrena,
        mostrar_email_publico: coachSettings.mostrar_email_publico,
        mostrar_telefono_publico: coachSettings.mostrar_telefono_publico,
      });
    } else {
      setCategoryCoach(null);
    }
  }, [selectedCategory, coachSettings]);

  // Obtener mensajes SOLO del grupo seleccionado
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['coachParentChatMessages', categoryKey],
    queryFn: async () => {
      if (!user || !selectedCategory) return [];
      // Query by deporte (original category name) — works for both old and new messages
      const msgs = await base44.entities.ChatMessage.filter({ deporte: selectedCategory }, 'created_date', 200);
      if (msgs.length > 0) return msgs;
      // Fallback: try normalized grupo_id for messages that only have grupo_id set
      const gid = toGroupId(selectedCategory);
      return await base44.entities.ChatMessage.filter({ grupo_id: gid }, 'created_date', 200);
    },
    enabled: !!user && !!selectedCategory,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  // REAL-TIME: Suscripción a mensajes del grupo activo
  useEffect(() => {
    if (!user || !categoryKey) return;
    
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      // Match by normalized grupo_id OR by deporte name
      const eventGid = toGroupId(event.data?.grupo_id || event.data?.deporte || '');
      if (eventGid === categoryKey && event.data?.remitente_email !== user.email) {
        queryClient.invalidateQueries({ queryKey: ['coachParentChatMessages', categoryKey] });
      }
    });
    
    return unsub;
  }, [user?.email, categoryKey, queryClient]);

  const getUnreadCountByCategory = (categoria) => {
    if (!user) return 0;
    const key = toGroupId(categoria);
    // Use backend counter only — it's the single source of truth
    return counts?.team_chats?.[key] || 0;
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

  // messages ya viene filtrado por grupo_id desde la query
  const categoryMessages = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const filteredMessages = searchTerm 
    ? categoryMessages.filter(m => m.mensaje?.toLowerCase().includes(searchTerm.toLowerCase()))
    : categoryMessages;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedCategory]);



  const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const sendMessageMutation = useMutation({
    onMutate: async (messageData) => {
      const gid = toGroupId(selectedCategory || "");
      await queryClient.cancelQueries({ queryKey: ['coachParentChatMessages', gid] });
      const previousMessages = queryClient.getQueryData(['coachParentChatMessages', gid]);

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
        grupo_id: gid,
        deporte: selectedCategory,
        leido_por: [{ email: user.email, nombre: user.full_name, fecha: new Date().toISOString() }],
      };

      queryClient.setQueryData(['coachParentChatMessages', gid], (old = []) => [...old, optimisticMessage]);
      return { previousMessages, tempId: optimisticMessage.id, gid };
    },
    onError: (err, vars, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['coachParentChatMessages', context.gid], context.previousMessages);
      }
      toast.error("Error al enviar mensaje");
    },
    mutationFn: async (messageData) => {
       const gid = toGroupId(selectedCategory || "");

       const newMessage = await base44.entities.ChatMessage.create({
         tipo: "padre_a_grupo",
         remitente_email: user.email,
         remitente_nombre: user.full_name,
         mensaje: messageData.mensaje,
         audio_url: messageData.audio_url,
         audio_duracion: messageData.audio_duracion,
         archivos_adjuntos: messageData.adjuntos || [],
         grupo_id: gid,
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
      const gid = context?.gid || toGroupId(selectedCategory || "");
      queryClient.setQueryData(['coachParentChatMessages', gid], (old = []) => {
        if (!old || old.length === 0) return [createdMessage];
        return old.map(m => (m.id === context?.tempId ? createdMessage : m));
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['coachParentChatMessages', gid] });
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
      queryClient.invalidateQueries({ queryKey: ['coachParentChatMessages', categoryKey] });
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

    queryClient.invalidateQueries({ queryKey: ['coachParentChatMessages', categoryKey] });
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
        .map(cat => [normalizeCategory(cat), cat])
    ).values());

    // ====== Render mensajes (compartido mobile y desktop) ======
    const renderMessages = () => (
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0 min-h-0" style={{backgroundColor: '#E5DDD5'}}>
          {selectedCategory && getUnreadCountByCategory(selectedCategory) > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded-lg">
              Tienes {getUnreadCountByCategory(selectedCategory)} mensajes nuevos en {selectedCategory.replace('Fútbol ', '').replace(' (Mixto)', '')}
            </div>
          )}
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">{searchTerm ? "No se encontraron mensajes" : "Aún no hay mensajes"}</p>
            </div>
          ) : (
            filteredMessages.map((msg, idx) => {
              const showDateSeparator = idx === 0 || 
                new Date(filteredMessages[idx - 1].created_date).toDateString() !== 
                new Date(msg.created_date).toDateString();
              const dateLabel = new Date(msg.created_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
              const isMine = msg.remitente_email === user.email;
              const isCoach = msg.tipo === "entrenador_a_grupo";

              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-4">
                      <div className="bg-white px-4 py-1 rounded-full text-xs text-slate-600 shadow-sm">{dateLabel}</div>
                    </div>
                  )}
                  <div className={`flex ${isMine ? 'justify-end mr-2' : 'justify-start ml-2'} mb-1.5`}>
                    {(msg.mensaje || msg.audio_url || msg.archivos_adjuntos?.length > 0) && !msg.encuesta && !msg.poll && !msg.ubicacion && (
                      <div className="max-w-[72%] rounded-2xl px-3 py-2 relative" style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        fontSize: '15px', lineHeight: '1.4', fontWeight: 400, wordWrap: 'break-word', whiteSpace: 'pre-wrap',
                        backgroundColor: isMine ? '#DCF8C6' : '#FFFFFF', boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
                      }}>
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-xs font-semibold opacity-70">{isCoach ? '🏃 ' : ''}{msg.remitente_nombre}</p>
                          {isCoach && <Badge className="text-[10px] bg-green-500 px-1 py-0 h-4">Entrenador</Badge>}
                        </div>
                        {msg.mensaje && <p style={{fontSize: '15px', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}><EmojiScaler content={msg.mensaje} /></p>}
                        {msg.audio_url && <div className="mt-1"><ChatAudioBubble url={msg.audio_url} duration={msg.audio_duracion} isMine={isMine} /></div>}
                        {(() => {
                          const attachments = msg.archivos_adjuntos || [];
                          const images = attachments.filter(f => f.tipo?.startsWith('image/') || f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                          const audios = attachments.filter(f => f.tipo?.startsWith('audio/'));
                          const files = attachments.filter(f => !f.tipo?.startsWith('image/') && !f.tipo?.startsWith('audio/'));
                          return (
                            <>
                              {images.length > 0 && <div className="mt-1"><ChatImageBubble images={images} isMine={isMine} /></div>}
                              {audios.map((file, i) => <div key={`a-${i}`} className="mt-1"><ChatAudioBubble url={file.url} duration={file.duracion} isMine={isMine} /></div>)}
                              {files.length > 0 && <div className="mt-1 space-y-1">{files.map((file, i) => (
                                <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs p-2 rounded ${isMine ? 'bg-slate-600' : isCoach ? 'bg-green-700' : 'bg-slate-100'}`}>
                                  <FileText className="w-3 h-3" /><span className="flex-1 truncate">{file.nombre}</span><Download className="w-3 h-3" />
                                </a>
                              ))}</div>}
                            </>
                          );
                        })()}
                        {msg.reacciones?.length > 0 && <EmojiScaler reactions={msg.reacciones} />}
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <p style={{fontSize: '11px', opacity: 0.6}}>{format(new Date(msg.created_date), "HH:mm", { locale: es })}</p>
                          <Button size="sm" variant="ghost" className={`opacity-50 hover:opacity-100 h-5 w-5 p-0 ${isMine ? 'text-white' : 'text-slate-600'}`} onClick={() => setShowReactions(msg.id)}>
                            <Smile className="w-3 h-3" />
                          </Button>
                        </div>
                        {showReactions === msg.id && (
                          <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-xl p-2 flex gap-2 z-10 border">
                            {REACTIONS.map(emoji => (<button key={emoji} onClick={() => addReaction(msg.id, emoji)} className="text-2xl hover:scale-125 transition-transform">{emoji}</button>))}
                            <button onClick={() => setShowReactions(null)} className="ml-2 text-slate-400"><X className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    )}
                    {(msg.encuesta || msg.poll) && (
                      <div className="w-full max-w-[85%]">
                        <div className="mb-1 px-2"><p className="text-xs font-semibold text-slate-600">{isCoach ? '🏃 ' : ''}{msg.remitente_nombre}</p></div>
                        <PollMessage encuesta={msg.encuesta || msg.poll} messageId={msg.id} userEmail={user.email} userName={user.full_name} onVote={(msgId, optionIdx) => votePollMutation.mutate({ messageId: msgId, optionIndex: optionIdx })} isCreator={msg.remitente_email === user.email} />
                        <p className="text-xs text-slate-500 mt-1 px-2">{format(new Date(msg.created_date), "HH:mm", { locale: es })}</p>
                      </div>
                    )}
                    {msg.ubicacion && (
                      <div className="w-full max-w-[85%]">
                        <div className="mb-1 px-2"><p className="text-xs font-semibold text-slate-600">{isCoach ? '🏃 ' : ''}{msg.remitente_nombre}</p></div>
                        <LocationMessage ubicacion={msg.ubicacion} />
                        <p className="text-xs text-slate-500 mt-1 px-2">{format(new Date(msg.created_date), "HH:mm", { locale: es })}</p>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <ParentChatInput onSendMessage={handleSendMessage} uploading={uploading} placeholder="Escribe tu mensaje..." />
      </div>
    );

    return (
    <>
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      {showImagePreview && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowImagePreview(null)}>
          <img src={showImagePreview} alt="Preview" className="max-w-full max-h-full rounded" onClick={e => e.stopPropagation()} />
          <Button variant="ghost" size="icon" onClick={() => setShowImagePreview(null)} className="absolute top-4 right-4 text-white hover:bg-white/20"><X className="w-6 h-6" /></Button>
        </div>
      )}

      {/* ====== Mismo diseño móvil/desktop, centrado en PC ====== */}
      <div className="fixed inset-0 flex flex-col overflow-hidden pt-[100px] lg:pt-0 lg:static lg:h-[calc(100vh-0px)]">
        <Card className="border-blue-200 shadow-lg h-full flex flex-col overflow-hidden rounded-none lg:rounded-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm"><MessageCircle className="w-4 h-4" /> Chat Entrenador</CardTitle>
              <div className="flex items-center gap-1">
                {categoryCoach && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-2.5 py-1 transition-colors">
                        {categoryCoach.foto_perfil_url ? (
                          <img src={categoryCoach.foto_perfil_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <UserCircle className="w-4 h-4" />
                        )}
                        <span className="text-xs font-medium truncate max-w-[80px]">{categoryCoach.full_name?.split(' ')[0]}</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="p-0 max-w-sm">
                      <CoachProfilePreview coach={categoryCoach} defaultOpen />
                    </DialogContent>
                  </Dialog>
                )}
                <EscalateToCoordinatorButton user={user} categoria={selectedCategory} recentMessages={messages} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
            {!lockedCategory && categories.some(cat => getUnreadCountByCategory(cat) > 0) && (
              <div className="px-2 py-1.5 bg-yellow-50 border-b border-yellow-200 flex gap-2 overflow-x-auto flex-wrap">
                <span className="text-xs font-semibold text-yellow-800 whitespace-nowrap">🔔 Nuevos mensajes:</span>
                {categories.filter(cat => getUnreadCountByCategory(cat) > 0).map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className="bg-yellow-200 border border-yellow-400 rounded-full px-2 py-0.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-300 transition-colors whitespace-nowrap">
                    {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                    <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1 py-0 h-4 animate-pulse">{getUnreadCountByCategory(cat)}</Badge>
                  </button>
                ))}
              </div>
            )}
            {!lockedCategory && categories.length > 1 && (
              <div className="flex gap-1.5 p-1.5 bg-slate-50 border-b overflow-x-auto flex-shrink-0">
                {categories.map(cat => {
                  const unreadCount = getUnreadCountByCategory(cat);
                  return (
                    <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)} className="whitespace-nowrap text-xs px-2 py-1 h-7 relative">
                      {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                      {unreadCount > 0 && <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">{unreadCount}</span>}
                    </Button>
                  );
                })}
              </div>
            )}
            {/* Coach profile ahora se muestra como botón en el header */}
            {renderMessages()}
          </CardContent>
        </Card>
      </div>
    </>
    );
    }