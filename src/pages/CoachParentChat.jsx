import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, Paperclip, X, FileText, Download, MessageCircle, Camera, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function CoachParentChat() {
  const [user, setUser] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const coach = currentUser.es_entrenador === true || currentUser.role === "admin";
      setIsCoach(coach);
      
      if (coach) {
        const categories = currentUser.role === "admin" 
          ? ["Todas"] 
          : (currentUser.categorias_entrena || []);
        
        if (categories.length > 0 && !selectedCategory) {
          setSelectedCategory(categories[0]);
        }
      }
    };
    fetchUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['coachGroupMessages', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      
      if (selectedCategory === "Todas") {
        return await base44.entities.ChatMessage.list('-created_date');
      }
      
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      return await base44.entities.ChatMessage.filter({ grupo_id }, 'created_date');
    },
    refetchInterval: 3000,
    enabled: !!selectedCategory,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

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
        tipo: "entrenador_a_grupo",
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
      toast.success("Mensaje enviado a toda la categoría");
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ mensaje: messageText, adjuntos: attachments });
  };

  if (!isCoach) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo entrenadores pueden acceder a esta sección</p>
      </div>
    );
  }

  const categories = user?.role === "admin" 
    ? ["Todas las categorías", ...new Set(allPlayers.map(p => p.deporte))]
    : (user?.categorias_entrena || []);

  const categoryPlayers = selectedCategory === "Todas las categorías" 
    ? allPlayers 
    : allPlayers.filter(p => p.deporte === selectedCategory);

  const parentEmails = [...new Set(categoryPlayers.flatMap(p => 
    [p.email_padre, p.email_tutor_2].filter(Boolean)
  ))];

  return (
    <div className="p-4 lg:max-w-6xl lg:mx-auto">
      <Card className="border-blue-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                Chat Grupal con Familias
              </CardTitle>
              <p className="text-sm text-blue-100">Comunicación con los padres de tu categoría</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-100">Familias en este grupo:</p>
              <Badge className="bg-white text-blue-700 text-lg font-bold">
                <Users className="w-4 h-4 mr-1" />
                {parentEmails.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="w-full justify-start overflow-x-auto p-2 bg-slate-50">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="whitespace-nowrap">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {categories.map(cat => (
              <TabsContent key={cat} value={cat} className="h-[calc(100vh-300px)] flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Aún no hay mensajes en este grupo</p>
                      <p className="text-slate-400 text-xs mt-2">Envía el primer mensaje a las familias</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.remitente_email === user.email;
                      const isCoach = msg.tipo === "entrenador_a_grupo";
                      
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${
                            isMine ? 'bg-blue-600 text-white' : 
                            isCoach ? 'bg-green-600 text-white' : 
                            'bg-white text-slate-900 border'
                          } rounded-2xl p-3 shadow-sm`}>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-semibold opacity-70">
                                {isCoach && !isMine ? '🏃 ' : ''}{msg.remitente_nombre}
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

                <div className="p-4 bg-white border-t">
                  {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
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
                  
                  <div className="flex gap-2 items-end">
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
                        className="h-10 w-10"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="w-5 h-5" />
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
                        className="h-10 w-10"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    <Textarea
                      placeholder={`Mensaje a ${parentEmails.length} familias...`}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="flex-1 min-h-[44px] resize-none"
                      rows={1}
                    />
                    
                    <Button 
                      onClick={handleSend} 
                      disabled={!messageText.trim() && attachments.length === 0} 
                      className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}