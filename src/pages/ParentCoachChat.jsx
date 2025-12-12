import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Users, Search, X, FileText, Download, Image as ImageIcon, Play, Pause } from "lucide-react";
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

  // Obtener entrenador de la categoría seleccionada
  useEffect(() => {
    const fetchCategoryCoach = async () => {
      if (!selectedCategory) return;
      try {
        console.log('🔍 Buscando entrenador para categoría:', selectedCategory);
        const users = await base44.entities.User.list();
        console.log('👥 Total usuarios:', users.length);
        console.log('🏃 Entrenadores:', users.filter(u => u.es_entrenador).map(u => ({ 
          nombre: u.full_name, 
          categorias: u.categorias_entrena 
        })));
        
        const coach = users.find(u => 
          u.es_entrenador === true && 
          u.categorias_entrena?.includes(selectedCategory)
        );
        
        console.log('✅ Entrenador encontrado:', coach ? coach.full_name : 'NINGUNO');
        setCategoryCoach(coach || null);
      } catch (error) {
        console.error("Error fetching coach:", error);
      }
    };
    fetchCategoryCoach();
  }, [selectedCategory]);

  const { data: messages = [] } = useQuery({
    queryKey: ['coachGroupMessages', selectedCategory, user?.email],
    queryFn: async () => {
      if (!selectedCategory || !user) return [];
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      const allMessages = await base44.entities.ChatMessage.filter({ grupo_id }, 'created_date');
      
      return allMessages.filter(msg => 
        !msg.destinatario_email || 
        msg.destinatario_email === user.email
      );
    },
    refetchInterval: 3000,
    enabled: !!selectedCategory && !!user,
  });

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
        
        // 3. Invalidar queries INMEDIATAMENTE
        if (unreadCoachMessages.length > 0 || notifications.length > 0) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['appNotifications'] }),
            queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] }),
            queryClient.refetchQueries({ queryKey: ['appNotifications'] })
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

  const sendMessageMutation = useMutation({
    mutationFn: async (mensaje) => {
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      await base44.entities.ChatMessage.create({
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

      // Notificar al entrenador de esta categoría
      const allUsers = await base44.entities.User.list();
      const coaches = allUsers.filter(u => 
        (u.es_entrenador === true || u.role === "admin") &&
        (u.role === "admin" || u.categorias_entrena?.includes(selectedCategory))
      );
      
      for (const coach of coaches) {
        await base44.entities.AppNotification.create({
          usuario_email: coach.email,
          titulo: `⚽ Nuevo mensaje en ${selectedCategory}`,
          mensaje: `${user.full_name}: ${mensaje.substring(0, 100)}${mensaje.length > 100 ? '...' : ''}`,
          tipo: "importante",
          icono: "⚽",
          enlace: "CoachParentChat",
          vista: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
      setMessageText("");
      toast.success("Mensaje enviado");
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

  const handleSend = () => {
    if (!messageText.trim()) return;
    const msgToSend = messageText;
    setMessageText("");
    sendMessageMutation.mutate(msgToSend);
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

    <div className="h-[calc(100vh-100px)] lg:p-4 lg:max-w-5xl lg:mx-auto lg:h-[calc(100vh-110px)]">
      <Card className="border-blue-200 shadow-lg h-full flex flex-col overflow-hidden lg:rounded-lg rounded-none">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              Chat Entrenador
            </CardTitle>
            <div className="flex items-center gap-2">
              <EscalateToCoordinatorButton 
                user={user} 
                categoria={selectedCategory}
                recentMessages={messages}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
                className="text-white hover:bg-white/20"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {showSearch && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Buscar mensajes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-slate-900 text-sm"
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
          {categories.length > 1 && (
            <div className="flex gap-2 p-2 bg-slate-50 border-b overflow-x-auto">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="whitespace-nowrap"
                >
                  {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                </Button>
              ))}
            </div>
          )}

          {/* Perfil del Entrenador */}
          {categoryCoach && (
            <div className="p-3 border-b bg-white">
              <CoachProfilePreview coach={categoryCoach} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
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

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-4">
                        <div className="bg-white px-4 py-1 rounded-full text-xs text-slate-600 shadow-sm">
                          {dateLabel}
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] ${
                        isMine ? 'bg-slate-700 text-white' : 
                        isCoach ? 'bg-green-600 text-white' : 
                        'bg-white text-slate-900 border'
                      } rounded-2xl p-3 shadow-sm`}>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-semibold opacity-70">
                            {isCoach ? '🏃 ' : ''}{msg.remitente_nombre}
                          </p>
                          {isCoach && <Badge className="text-xs bg-green-500 px-1 py-0">Entrenador</Badge>}
                        </div>

                        {/* Encuesta */}
                        {(msg.encuesta || msg.poll) && (
                          <PollMessage 
                            encuesta={msg.encuesta || msg.poll} 
                            messageId={msg.id}
                            userEmail={user.email}
                            userName={user.full_name}
                            onVote={(msgId, optionIdx) => votePollMutation.mutate({ messageId: msgId, optionIndex: optionIdx })}
                          />
                        )}

                        {/* Ubicación */}
                        {msg.ubicacion && (
                          <LocationMessage ubicacion={msg.ubicacion} />
                        )}

                        {/* Audio */}
                        {msg.audio_url && (
                          <div className="flex items-center gap-2">
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

                        {/* Archivos Adjuntos */}
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

                        {/* Mensaje de texto (solo si no hay encuesta/ubicación/audio) */}
                        {!msg.audio_url && !msg.encuesta && !msg.poll && !msg.ubicacion && msg.mensaje && (
                          <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                        )}

                        <p className="text-xs opacity-60 mt-1">
                          {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t flex-shrink-0">
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
                className="flex-1 min-h-[44px] resize-none text-sm"
                rows={1}
              />
              <Button 
                onClick={handleSend} 
                disabled={!messageText.trim()} 
                className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0"
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