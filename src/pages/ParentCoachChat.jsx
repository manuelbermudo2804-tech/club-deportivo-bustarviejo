import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Paperclip, X, FileText, Download, MessageCircle, Camera, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function ParentCoachChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
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
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({
          url: file_url,
          nombre: file.name,
          tipo: file.type,
          tamano: file.size
        });
      }
      setAttachments([...attachments, ...uploaded]);
      toast.success("Archivos adjuntados");
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
    <div className="p-2 sm:p-4 lg:max-w-5xl lg:mx-auto h-[calc(100vh-110px)]">
      <Card className="border-blue-200 shadow-lg h-full flex flex-col overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                Chat con Entrenador
              </CardTitle>
              <p className="text-xs sm:text-sm text-blue-100 hidden sm:block">Comunicación con el entrenador y otras familias</p>
            </div>
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
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start overflow-x-auto p-1 sm:p-2 bg-slate-50 flex-shrink-0">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">
                  {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {categories.map(cat => (
              <TabsContent key={cat} value={cat} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3 bg-slate-50 min-h-0">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Aún no hay mensajes en este grupo</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.remitente_email === user.email;
                      const isCoach = msg.tipo === "entrenador_a_grupo";
                      
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${
                            isMine ? 'bg-slate-800 text-white' : 
                            isCoach ? 'bg-blue-600 text-white' : 
                            'bg-white text-slate-900 border'
                          } rounded-2xl p-3 shadow-sm`}>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-semibold opacity-70">
                                {isCoach ? '🏃 ' : ''}{msg.remitente_nombre}
                              </p>
                              {isCoach && <Badge className="text-xs bg-green-500">Entrenador</Badge>}
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                            
                            {msg.archivos_adjuntos?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.archivos_adjuntos.map((file, idx) => (
                                  file.tipo?.startsWith('image/') ? (
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
                            
                            <p className="text-xs opacity-60 mt-1">
                              {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-2 sm:p-4 bg-white border-t flex-shrink-0">
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
                    <div className="flex flex-col gap-1">
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        multiple 
                        accept="*/*" 
                        className="hidden" 
                        onChange={handleFileUpload} 
                        disabled={uploading} 
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        disabled={uploading} 
                        className="h-9 w-9 sm:h-10 sm:w-10"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>

                      <input 
                        ref={cameraInputRef}
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={handleCameraCapture} 
                        disabled={uploading} 
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        disabled={uploading} 
                        className="h-9 w-9 sm:h-10 sm:w-10"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </div>

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