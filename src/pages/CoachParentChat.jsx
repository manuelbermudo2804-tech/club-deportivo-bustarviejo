import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Paperclip, X, FileText, Download, MessageCircle, Camera, Users, Mic, Square, Search, Pin, Smile, Image as ImageIcon, Folder, BarChart3, Settings } from "lucide-react";
import { Label } from "@/components/ui/label";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import SocialLinks from "../components/SocialLinks";
import ChatInputActions from "../components/chat/ChatInputActions";
import PollMessage from "../components/chat/PollMessage";
import CoachChatHorarioConfig from "../components/coach/CoachChatHorarioConfig";

const QUICK_REPLIES = [
  "✅ Perfecto, gracias",
  "👀 Revisado",
  "📝 Lo consulto y te confirmo",
  "👍 Confirmado",
  "🙏 Gracias por avisar"
];

const REACTIONS = ["👍", "❤️", "😊", "👏", "⚽"];

export default function CoachParentChat() {
  const [user, setUser] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // Verificar si es coach/admin
  const isCoach = user?.es_entrenador === true || user?.role === "admin";

  const { data: messages = [] } = useQuery({
    queryKey: ['coachGroupMessages', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      
      if (selectedCategory === "Todas las categorías") {
        return await base44.entities.ChatMessage.list('-created_date');
      }
      
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      return await base44.entities.ChatMessage.filter({ grupo_id }, 'created_date');
    },
    refetchInterval: 3000,
    enabled: !!selectedCategory,
  });

  // Filtrar mensajes
  const filteredMessages = searchTerm 
    ? messages.filter(m => m.mensaje?.toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;

  // Anclar mensaje
  const togglePinMutation = useMutation({
    mutationFn: async (messageId) => {
      const msg = messages.find(m => m.id === messageId);
      await base44.entities.ChatMessage.update(messageId, {
        anclado: !msg.anclado,
        anclado_por: user.email,
        anclado_fecha: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
      toast.success("Mensaje anclado");
    },
  });

  // Reacción a mensaje
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, reaction }) => {
      const msg = messages.find(m => m.id === messageId);
      const reactions = msg.reacciones || [];
      const existingIdx = reactions.findIndex(r => r.usuario_email === user.email);
      
      if (existingIdx >= 0) {
        reactions[existingIdx] = { usuario_email: user.email, usuario_nombre: user.full_name, reaccion: reaction };
      } else {
        reactions.push({ usuario_email: user.email, usuario_nombre: user.full_name, reaccion: reaction });
      }
      
      await base44.entities.ChatMessage.update(messageId, { reacciones: reactions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
    },
  });

  const allSharedFiles = messages.flatMap(m => m.archivos_adjuntos || []);

  const { data: allPlayers = [], isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  // Inicializar categoría cuando tengamos user y players
  useEffect(() => {
    if (!user || !isCoach || selectedCategory || allPlayers.length === 0) return;
    
    const categories = user.role === "admin" 
      ? ["Todas las categorías", ...new Set(allPlayers.map(p => p.deporte).filter(Boolean))]
      : (user.categorias_entrena || []);
    
    if (categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [user, isCoach, allPlayers, selectedCategory]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  // Grabar audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("🎤 Grabando...");
    } catch (error) {
      toast.error("No se pudo acceder al micrófono");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async () => {
    if (!audioBlob) return;
    
    setUploading(true);
    try {
      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
      
      sendMessageMutation.mutate({
        mensaje: "🎤 Nota de voz",
        adjuntos: [{
          url: file_url,
          nombre: `audio_${Date.now()}.webm`,
          tipo: 'audio/webm',
          tamano: audioBlob.size
        }]
      });
      
      setAudioBlob(null);
    } catch (error) {
      toast.error("Error al enviar audio");
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
      mensaje: "📊 Encuesta Rápida",
      adjuntos: [],
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

  const votePollMutation = useMutation({
    mutationFn: async ({ messageId, optionIndex }) => {
      const msg = messages.find(m => m.id === messageId);
      const votos = msg.encuesta?.votos || [];
      
      // Verificar si ya votó
      const existingVote = votos.find(v => v.usuario_email === user.email);
      if (existingVote) {
        toast.error("Ya has votado en esta encuesta");
        return;
      }
      
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
      toast.success("✅ Voto registrado");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      
      await base44.entities.ChatMessage.create({
        grupo_id,
        deporte: selectedCategory,
        tipo: "entrenador_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        mensaje: data.mensaje,
        archivos_adjuntos: data.adjuntos,
        encuesta: data.encuesta,
        prioridad: "Normal",
        leido: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages', selectedCategory] });
      setMessageText("");
      setAttachments([]);
      toast.success("Mensaje enviado a toda la categoría");
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ mensaje: messageText, adjuntos: attachments });
  };

  // Verificar acceso primero
  if (!user || playersLoading) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo entrenadores pueden acceder a esta sección</p>
      </div>
    );
  }

  // Si aún no se ha inicializado la categoría, mostrar loading
  if (!selectedCategory) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const categories = user?.role === "admin" 
    ? ["Todas las categorías", ...new Set(allPlayers.map(p => p.deporte).filter(Boolean))]
    : (user?.categorias_entrena || []);

  if (categories.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No tienes categorías asignadas. Contacta con el administrador.</p>
      </div>
    );
  }

  const categoryPlayers = selectedCategory === "Todas las categorías" 
    ? allPlayers 
    : allPlayers.filter(p => p.deporte === selectedCategory);

  const parentEmails = [...new Set(categoryPlayers.flatMap(p => 
    [p.email_padre, p.email_tutor_2].filter(Boolean)
  ))];

  // Cargar configuración de horarios del entrenador
  const { data: coachSettings } = useQuery({
    queryKey: ['coachSettings', user?.email],
    queryFn: async () => {
      const allSettings = await base44.entities.CoachSettings.list();
      return allSettings.find(s => s.entrenador_email === user?.email);
    },
    enabled: !!user?.email
  });

  // Verificar si estamos dentro del horario laboral
  const isDentroHorario = () => {
    if (!coachSettings?.horario_laboral_activo) return true;

    const now = new Date();
    const currentDay = now.toLocaleDateString('es-ES', { weekday: 'long' });
    const dayCapitalized = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);
    
    const isDayAllowed = coachSettings.dias_laborales?.includes(dayCapitalized);
    if (!isDayAllowed) return false;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = (coachSettings.horario_inicio || "09:00").split(':').map(Number);
    const [endHour, endMin] = (coachSettings.horario_fin || "20:00").split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    return currentTime >= startTime && currentTime <= endTime;
  };

  const fueraDeHorario = !isDentroHorario();

  return (
    <div className="h-[calc(100vh-100px)] lg:p-4 lg:max-w-6xl lg:mx-auto lg:h-[calc(100vh-110px)] space-y-2">
      <div className="hidden lg:block">
        <SocialLinks />
      </div>

      {/* Modal de configuración */}
      {showSettingsDialog && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">⚙️ Configuración Chat Entrenador</h2>
              <Button variant="ghost" onClick={() => setShowSettingsDialog(false)}>✕</Button>
            </div>
            {user && <CoachChatHorarioConfig user={user} />}
          </div>
        </div>
      )}

      <Card className="border-blue-200 shadow-lg h-full flex flex-col overflow-hidden lg:rounded-lg rounded-none">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-2 sm:p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-xl">
                <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                Chat con Familias
              </CardTitle>
              <p className="text-xs sm:text-sm text-green-100 hidden sm:block">Comunicación con los padres de tu categoría</p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsDialog(!showSettingsDialog)}
                className="text-white hover:bg-white/20"
                title="Configurar horarios"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
                className="text-white hover:bg-white/20"
              >
                <Search className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGallery(!showGallery)}
                className="text-white hover:bg-white/20"
              >
                <Folder className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowParticipants(true)}
                className="text-white hover:bg-white/20 text-xs sm:text-sm"
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">{parentEmails.length} familias</span>
                <span className="sm:hidden">{parentEmails.length}</span>
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
          {showGallery && (
            <div className="p-4 bg-white border-b max-h-[200px] overflow-y-auto flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">📁 Archivos Compartidos ({allSharedFiles.length})</h3>
                <Button size="sm" variant="ghost" onClick={() => setShowGallery(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {allSharedFiles.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No hay archivos compartidos</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {allSharedFiles.map((file, idx) => (
                    file.tipo?.startsWith('image/') ? (
                      <img 
                        key={idx}
                        src={file.url}
                        alt={file.nombre}
                        className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                      />
                    ) : (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 p-2 bg-slate-100 rounded hover:bg-slate-200"
                      >
                        <FileText className="w-6 h-6 text-slate-600" />
                        <span className="text-xs truncate w-full text-center">{file.nombre}</span>
                      </a>
                    )
                  ))}
                </div>
              )}
            </div>
          )}
          
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="h-full flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start overflow-x-auto p-0.5 sm:p-2 bg-slate-50 flex-shrink-0 border-b">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="whitespace-nowrap text-[11px] sm:text-sm px-2 py-1 sm:px-4 sm:py-2">
                  {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {categories.map(cat => (
              <TabsContent key={cat} value={cat} className="flex-1 p-0 m-0 flex flex-col overflow-hidden min-h-0 data-[state=active]:flex" style={{ display: selectedCategory === cat ? 'flex' : 'none' }}>
                <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 bg-slate-50">
                  {/* Banner de Horario Laboral */}
                  {fueraDeHorario && (
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 mb-3">
                      <p className="text-sm font-bold text-yellow-900 mb-1">⏰ Fuera de Horario</p>
                      <p className="text-xs text-yellow-800">
                        {coachSettings?.mensaje_fuera_horario || "Estoy fuera de mi horario de atención. Te responderé lo antes posible."}
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        📅 Horario: {coachSettings?.horario_inicio} - {coachSettings?.horario_fin} ({coachSettings?.dias_laborales?.join(", ")})
                      </p>
                    </div>
                  )}
                  {/* Mensajes anclados */}
                  {filteredMessages.filter(m => m.anclado).map(msg => (
                    <div key={`pinned-${msg.id}`} className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 mb-2">
                      <div className="flex items-start gap-2">
                        <Pin className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-yellow-900 mb-1">{msg.remitente_nombre}</p>
                          <p className="text-sm text-slate-900">{msg.mensaje}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => togglePinMutation.mutate(msg.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-xs sm:text-sm">
                        {searchTerm ? "No se encontraron mensajes" : "Aún no hay mensajes"}
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const nonPinnedMessages = filteredMessages.filter(m => !m.anclado);
                      return nonPinnedMessages.map((msg, idx) => {
                        const isMine = msg.remitente_email === user?.email;
                        const isCoachMsg = msg.tipo === "entrenador_a_grupo";

                        // Separador de fecha
                        const showDateSeparator = idx === 0 || 
                          new Date(nonPinnedMessages[idx - 1]?.created_date || 0).toDateString() !== 
                          new Date(msg.created_date).toDateString();
                        const dateLabel = new Date(msg.created_date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        });

                        return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div className="flex justify-center my-4">
                              <div className="bg-white px-4 py-1 rounded-full text-xs text-slate-600 shadow-sm">
                                {dateLabel}
                              </div>
                            </div>
                          )}
                          
                          <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
                            <div className={`max-w-[75%] sm:max-w-[70%] ${
                              isMine ? 'bg-green-600 text-white' : 
                              isCoachMsg ? 'bg-green-600 text-white' : 
                              'bg-slate-200 text-slate-900'
                            } rounded-2xl p-2 sm:p-3 shadow-sm relative`}>
                            <div className="flex items-center gap-1 sm:gap-2 mb-1 justify-between">
                              <div className="flex items-center gap-1">
                                <p className="text-[10px] sm:text-xs font-semibold opacity-70">
                                  {isCoachMsg && !isMine ? '🏃 ' : ''}{msg.remitente_nombre}
                                </p>
                                {isCoachMsg && <Badge className="text-[10px] sm:text-xs bg-green-500 px-1 py-0">Entrenador</Badge>}
                              </div>
                              {isMine && (
                                <button 
                                  onClick={() => togglePinMutation.mutate(msg.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Pin className={`w-3 h-3 ${msg.anclado ? 'text-yellow-400' : 'text-white/60'}`} />
                                </button>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.mensaje}</p>

                            {msg.encuesta && (
                             <div className="mt-2">
                               <PollMessage 
                                 encuesta={msg.encuesta} 
                                 messageId={msg.id}
                                 userEmail={user?.email}
                                 userName={user?.full_name}
                                 onVote={(msgId, optionIdx) => votePollMutation.mutate({ messageId: msgId, optionIndex: optionIdx })}
                               />
                             </div>
                            )}

                            {msg.archivos_adjuntos?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.archivos_adjuntos.map((file, idx) => (
                                  file.tipo?.startsWith('audio/') ? (
                                    <audio key={idx} controls className="max-w-full">
                                      <source src={file.url} type={file.tipo} />
                                    </audio>
                                  ) : file.tipo?.startsWith('image/') ? (
                                    <img 
                                      key={idx}
                                      src={file.url}
                                      alt={file.nombre}
                                      className="rounded max-w-full h-auto"
                                    />
                                  ) : (
                                    <a
                                      key={idx}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-xs p-2 rounded bg-black/20"
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
                              <div className="flex gap-1 mt-2">
                                {REACTIONS.map(emoji => {
                                  const count = msg.reacciones.filter(r => r.reaccion === emoji).length;
                                  if (count === 0) return null;
                                  const hasMyReaction = msg.reacciones.some(r => r.reaccion === emoji && r.usuario_email === user.email);
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => addReactionMutation.mutate({ messageId: msg.id, reaction: emoji })}
                                      className={`text-xs px-2 py-0.5 rounded-full ${
                                        hasMyReaction ? 'bg-white/30' : 'bg-black/10'
                                      }`}
                                    >
                                      {emoji} {count}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] sm:text-xs opacity-60">
                                {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                              </p>
                              {!isMine && (
                                <div className="flex gap-1">
                                  {REACTIONS.map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => addReactionMutation.mutate({ messageId: msg.id, reaction: emoji })}
                                      className="opacity-0 group-hover:opacity-100 text-sm hover:scale-125 transition-all"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        </React.Fragment>
                        );
                      });
                    })()
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-2 sm:p-4 bg-white border-t flex-shrink-0">
                  {showQuickReplies && (
                    <div className="mb-2 flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg">
                      {QUICK_REPLIES.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setMessageText(reply);
                            setShowQuickReplies(false);
                          }}
                          className="text-xs px-3 py-1.5 bg-white border rounded-lg hover:bg-slate-100"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {audioBlob && (
                    <div className="mb-2 bg-green-50 rounded-lg p-2 flex items-center gap-2">
                      <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1" />
                      <Button size="sm" onClick={sendAudioMessage} disabled={uploading} className="bg-green-600">
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAudioBlob(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
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
                  
                  <div className="flex gap-1 sm:gap-2 items-end">
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      multiple 
                      accept="*/*" 
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
                    
                    <ChatInputActions
                      onFileClick={() => fileInputRef.current?.click()}
                      onCameraClick={() => cameraInputRef.current?.click()}
                      onAudioClick={isRecording ? stopRecording : startRecording}
                      onLocationClick={() => {}}
                      onPollClick={() => setShowPollDialog(true)}
                      onQuickRepliesClick={() => setShowQuickReplies(!showQuickReplies)}
                      uploading={uploading}
                      isRecording={isRecording}
                      showLocation={false}
                      showPoll={true}
                    />
                    
                    <Textarea
                      placeholder="Escribe..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="flex-1 min-h-[36px] sm:min-h-[44px] resize-none text-sm"
                      rows={1}
                    />
                    
                    <Button 
                      onClick={handleSend} 
                      disabled={!messageText.trim() && attachments.length === 0} 
                      className="bg-green-600 hover:bg-green-700 h-9 w-9 sm:h-10 sm:w-10 p-0"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>👥 Participantes del Grupo - {selectedCategory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear Encuesta Rápida */}
      <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📊 Crear Encuesta Rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Pregunta</Label>
              <Input
                placeholder="¿Quién puede llevar botellas de agua?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Opciones</Label>
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
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setShowPollDialog(false)}>Cancelar</Button>
              <Button onClick={sendPoll} className="bg-green-600 hover:bg-green-700">
                <BarChart3 className="w-4 h-4 mr-2" />
                Enviar Encuesta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}