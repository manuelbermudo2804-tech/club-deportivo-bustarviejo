import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Paperclip, X, FileText, Download, MessageCircle, Users, Mic, Square, Play, Search, Smile } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import ChatInputActions from "../components/chat/ChatInputActions";
import SocialLinks from "../components/SocialLinks";

export default function ParentCoachChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
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
    };
    fetchUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['coachGroupMessages', selectedCategory, user?.email],
    queryFn: async () => {
      if (!selectedCategory || !user) return [];
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      const allMessages = await base44.entities.ChatMessage.filter({ grupo_id }, 'created_date');
      
      // Filtrar: solo mensajes grupales (sin destinatario) O mensajes privados para este usuario
      return allMessages.filter(msg => 
        !msg.destinatario_email || 
        msg.destinatario_email === user.email
      );
    },
    refetchInterval: 3000,
    enabled: !!selectedCategory && !!user,
  });

  // Filtrar mensajes por búsqueda
  const filteredMessages = searchTerm 
    ? messages.filter(m => m.mensaje?.toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const categoryPlayers = allPlayers.filter(p => p.deporte === selectedCategory && p.activo);
  const parentEmails = [...new Set(categoryPlayers.flatMap(p => 
    [p.email_padre, p.email_tutor_2].filter(Boolean)
  ))];

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
        // PADRES: BLOQUEAR IMÁGENES - solo permitir documentos
        if (file.type.startsWith('image/')) {
          toast.error("❌ No puedes enviar fotos. Solo documentos (PDF, Word, Excel, etc.)");
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
        toast.success("Documentos adjuntados");
      }
    } catch (error) {
      toast.error("Error al subir archivos");
    } finally {
      setUploading(false);
    }
  };

  // Indicador "escribiendo..."
  const handleTyping = () => {
    // Implementar lógica de typing si es necesario
  };

  // Grabar audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("🎤 Grabando audio...");
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
      
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      await base44.entities.ChatMessage.create({
        grupo_id,
        deporte: selectedCategory,
        tipo: "padre_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        mensaje: "🎤 Audio",
        archivos_adjuntos: [{
          url: file_url,
          nombre: `audio_${Date.now()}.webm`,
          tipo: 'audio/webm',
          tamano: audioBlob.size
        }],
        prioridad: "Normal",
        leido: false
      });
      
      setAudioBlob(null);
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
      toast.success("Audio enviado");
    } catch (error) {
      toast.error("Error al enviar audio");
    } finally {
      setUploading(false);
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      
      await base44.entities.ChatMessage.create({
        grupo_id,
        deporte: selectedCategory,
        tipo: "padre_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        mensaje: data.mensaje,
        archivos_adjuntos: data.adjuntos,
        prioridad: "Normal",
        leido: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages', selectedCategory] });
      setMessageText("");
      setAttachments([]);
      toast.success("Mensaje enviado");
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ mensaje: messageText, adjuntos: attachments });
  };

  if (!user || myPlayers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Cargando chats...</p>
        </div>
      </div>
    );
  }

  const categories = [...new Set(myPlayers.map(p => p.deporte))];

  return (
    <div className="h-[calc(100vh-100px)] lg:p-4 lg:max-w-5xl lg:mx-auto lg:h-[calc(100vh-110px)] space-y-2">
      <div className="hidden lg:block">
        <SocialLinks />
      </div>
      <Card className="border-blue-200 shadow-lg h-full flex flex-col overflow-hidden lg:rounded-lg rounded-none">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0 p-2 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-xl">
                <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                Chat Entrenador
              </CardTitle>
            </div>
            <div className="flex gap-1">
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
                  {filteredMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-xs sm:text-sm">
                        {searchTerm ? "No se encontraron mensajes" : "Aún no hay mensajes"}
                      </p>
                    </div>
                  ) : (
                    filteredMessages.map((msg, idx) => {
                      // Separador de fecha
                      const showDateSeparator = idx === 0 || 
                        new Date(filteredMessages[idx - 1].created_date).toDateString() !== 
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
                      const isMine = msg.remitente_email === user.email;
                      const isCoach = msg.tipo === "entrenador_a_grupo";
                      
                      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] sm:max-w-[70%] ${
                          isMine ? 'bg-slate-700 text-white' : 
                          isCoach ? 'bg-green-600 text-white' : 
                          'bg-white text-slate-900 border'
                        } rounded-2xl p-2 sm:p-3 shadow-sm`}>
                            <div className="flex items-center gap-1 sm:gap-2 mb-1">
                              <p className="text-[10px] sm:text-xs font-semibold opacity-70">
                                {isCoach ? '🏃 ' : ''}{msg.remitente_nombre}
                              </p>
                              {isCoach && <Badge className="text-[10px] sm:text-xs bg-green-500 px-1 py-0">Entrenador</Badge>}
                            </div>
                            <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.mensaje}</p>

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
                                      className={`flex items-center gap-2 text-xs p-2 rounded ${
                                        isMine || isCoach ? 'bg-black/20' : 'bg-slate-100'
                                      }`}
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span className="flex-1 truncate">{file.nombre}</span>
                                      <Download className="w-3 h-3" />
                                    </a>
                                  )
                                ))}
                              </div>
                            )}
                            
                            <p className="text-[10px] sm:text-xs opacity-60 mt-1">
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

                <div className="p-2 sm:p-4 bg-white border-t flex-shrink-0">
                  {audioBlob && (
                    <div className="mb-2 bg-blue-50 rounded-lg p-2 flex items-center gap-2">
                      <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1" />
                      <Button size="sm" onClick={sendAudioMessage} disabled={uploading} className="bg-blue-600">
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
                          <div className="bg-slate-100 rounded px-2 py-1 text-xs flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">{file.nombre}</span>
                            <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-1 sm:gap-2 items-end">
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      multiple 
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      disabled={uploading} 
                    />
                    
                    <ChatInputActions
                      onFileClick={() => fileInputRef.current?.click()}
                      onCameraClick={() => {}}
                      onAudioClick={isRecording ? stopRecording : startRecording}
                      onLocationClick={() => {}}
                      onPollClick={() => {}}
                      uploading={uploading}
                      isRecording={isRecording}
                      showCamera={false}
                      showLocation={false}
                      showPoll={false}
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
                      className="flex-1 min-h-[36px] sm:min-h-[44px] resize-none text-sm"
                      rows={1}
                    />

                    <Button 
                      onClick={handleSend} 
                      disabled={!messageText.trim() && attachments.length === 0} 
                      className="bg-blue-600 hover:bg-blue-700 h-9 w-9 sm:h-10 sm:w-10 p-0"
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
            <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
              <p className="text-sm font-bold text-blue-900">🏃 Entrenador de la categoría</p>
            </div>
            
            <div>
              <p className="text-sm font-bold text-slate-900 mb-2">👨‍👩‍👧 Familias ({parentEmails.length})</p>
              <div className="space-y-2">
                {categoryPlayers.map((player, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-3 border">
                    <p className="text-sm font-medium text-slate-900">⚽ {player.nombre}</p>
                    <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                      {player.nombre_tutor_legal && <p>👤 {player.nombre_tutor_legal}</p>}
                      {player.nombre_tutor_2 && <p>👤 {player.nombre_tutor_2}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}