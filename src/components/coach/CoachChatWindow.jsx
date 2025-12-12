import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Paperclip, X, FileText, Download, Mic, Play, Pause, Smile, Check, CheckCheck, MapPin, Reply, Edit, Trash2, Users, Image as ImageIcon, Camera } from "lucide-react";
import ChatInputActions from "../chat/ChatInputActions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import PollMessage from "../chat/PollMessage";
import LocationMessage from "../chat/LocationMessage";
import EscalateToCoordinatorButton from "./EscalateToCoordinatorButton";

const REACTIONS = ["👍", "❤️", "✅", "👏", "🎉"];
const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function CoachChatWindow({ selectedCategory, user, allPlayers }) {
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
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
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
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
      
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      return await base44.entities.ChatMessage.filter({ grupo_id }, 'created_date');
    },
    refetchInterval: 3000,
    enabled: !!selectedCategory,
  });

  const { data: chatState } = useQuery({
    queryKey: ['coachChatState', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return null;
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      const logs = await base44.entities.CoachChatLog.filter({ grupo_id });
      return logs[0] || null;
    },
    refetchInterval: 2000,
    enabled: !!selectedCategory,
  });

  const anyoneTyping = chatState?.padre_escribiendo;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, anyoneTyping]);

  const handleTyping = async () => {
    if (!selectedCategory) return;
    
    const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
    
    clearTimeout(typingTimeoutRef.current);
    
    const existingLog = await base44.entities.CoachChatLog.filter({ grupo_id });
    if (existingLog.length > 0) {
      await base44.entities.CoachChatLog.update(existingLog[0].id, {
        entrenador_escribiendo: true,
        ultima_actividad_escribiendo: new Date().toISOString()
      });
    } else {
      await base44.entities.CoachChatLog.create({
        grupo_id,
        categoria: selectedCategory,
        entrenador_escribiendo: true,
        padre_escribiendo: false,
        ultima_actividad_escribiendo: new Date().toISOString()
      });
    }

    typingTimeoutRef.current = setTimeout(async () => {
      const log = await base44.entities.CoachChatLog.filter({ grupo_id });
      if (log.length > 0) {
        await base44.entities.CoachChatLog.update(log[0].id, {
          entrenador_escribiendo: false
        });
      }
    }, 3000);
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

  const sendPoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      toast.error("Necesitas una pregunta y al menos 2 opciones");
      return;
    }

    sendMessageMutation.mutate({
      mensaje: "📊 Encuesta",
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const startTime = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioDuration(duration);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      toast.error("No se pudo acceder al micrófono");
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
        adjuntos: []
      });
      
      cancelAudio();
    } catch (error) {
      toast.error("Error al enviar el audio");
    }
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
            adjuntos: [],
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
        audio_url: data.audio_url,
        audio_duracion: data.audio_duracion,
        adjuntos: data.adjuntos,
        encuesta: data.encuesta,
        ubicacion: data.ubicacion,
        respuesta_a: data.respuesta_a,
        mensaje_citado: data.mensaje_citado,
        archivos_adjuntos: data.adjuntos || [],
        prioridad: "Normal",
        leido: false,
        reacciones: []
      });

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
          mensaje: `${data.mensaje.substring(0, 100)}${data.mensaje.length > 100 ? '...' : ''}`,
          tipo: "importante",
          icono: "⚽",
          enlace: "ParentCoachChat",
          vista: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
      setMessageText("");
      setAttachments([]);
      setReplyingTo(null);
    },
  });

  const handleSend = () => {
    if (editingMessage) {
      editMessageMutation.mutate({
        id: editingMessage.id,
        mensaje: messageText
      });
    } else {
      if (!messageText.trim() && attachments.length === 0) return;
      
      const messageData = { 
        mensaje: messageText, 
        adjuntos: attachments 
      };
      
      if (replyingTo) {
        messageData.respuesta_a = replyingTo.id;
        messageData.mensaje_citado = {
          autor_nombre: replyingTo.remitente_nombre,
          mensaje: replyingTo.mensaje.substring(0, 100)
        };
      }
      
      sendMessageMutation.mutate(messageData);
    }
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
      setEditingMessage(null);
      setMessageText("");
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

  const categoryPlayers = selectedCategory === "Todas las categorías" 
    ? allPlayers.filter(p => p.activo === true)
    : allPlayers.filter(p => p.deporte === selectedCategory && p.activo === true);

  const parentEmails = [...new Set(categoryPlayers.flatMap(p => 
    [p.email_padre, p.email_tutor_2].filter(Boolean)
  ))];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white">
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      {/* Header mínimo */}
      <div className="p-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-xs truncate">
              {selectedCategory.replace('Fútbol ', '').replace(' (Mixto)', '')}
            </h2>
            <p className="text-xs text-green-100">
              {parentEmails.length} familias
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

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
        {replyingTo && (
          <div className="sticky top-0 z-10 bg-blue-50 border-l-4 border-blue-500 p-2 rounded flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-900">Respondiendo a {replyingTo.remitente_nombre}</p>
              <p className="text-xs text-blue-700 truncate">{replyingTo.mensaje}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.eliminado) return null;
          
          const isMine = msg.remitente_email === user?.email;
          const isCoachMsg = msg.tipo === "entrenador_a_grupo";
          
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[75%] ${
                isMine ? 'bg-green-600 text-white' : 'bg-white text-slate-900 border'
              } rounded-2xl p-3 shadow-sm relative`}>
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
                        onClick={() => {
                          setEditingMessage(msg);
                          setMessageText(msg.mensaje);
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
                    >
                      {playingAudio === msg.audio_url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <span className="text-sm">{msg.audio_duracion}s</span>
                  </div>
                ) : msg.encuesta ? (
                  // NO mostrar el texto cuando hay encuesta
                  null
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {msg.mensaje}
                    {msg.editado && <span className="text-xs opacity-50 ml-2">(editado)</span>}
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
                          className="rounded cursor-pointer max-w-full h-auto"
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
                  />
                )}

                {msg.reacciones?.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {msg.reacciones.map((r, idx) => (
                      <span key={idx} className="text-lg" title={r.user_nombre}>
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
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
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

      {/* Input */}
      <div className="p-2 bg-white border-t flex-shrink-0">
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

        {audioBlob && (
          <div className="mb-2 flex items-center gap-2 bg-green-50 rounded-lg p-2">
            <Mic className="w-4 h-4 text-green-600" />
            <span className="text-sm flex-1">Audio {audioDuration}s</span>
            <Button size="sm" onClick={sendAudio} className="h-7">Enviar</Button>
            <Button size="sm" variant="outline" onClick={cancelAudio} className="h-7">✕</Button>
          </div>
        )}

        <div className="flex gap-2 items-end">
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
            onAudioClick={recording ? stopRecording : startRecording}
            onLocationClick={() => setShowLocationDialog(true)}
            onPollClick={() => setShowPollDialog(true)}
            uploading={uploading}
            isRecording={recording}
            showCamera={true}
            showAudio={true}
            showLocation={true}
            showPoll={true}
            showQuickReplies={false}
          />

          <Textarea
            placeholder="Escribe..."
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
            className="flex-1 min-h-[80px] lg:min-h-[60px] resize-none text-base"
            rows={3}
            disabled={recording || audioBlob}
          />

          <Button 
            onClick={handleSend} 
            disabled={!messageText.trim() && attachments.length === 0 && !audioBlob}
            size="icon"
            className="h-12 w-12 lg:h-10 lg:w-10 bg-green-600 hover:bg-green-700 p-0 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

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
    </div>
  );
}