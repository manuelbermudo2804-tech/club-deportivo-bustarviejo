import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Send, Paperclip, X, FileText, Download, MessageCircle, Users, Mic, Square, Play, Search, Smile, AlertTriangle, UserCircle, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea as DialogTextarea } from "@/components/ui/textarea";
import ChatInputActions from "../components/chat/ChatInputActions";
import SocialLinks from "../components/SocialLinks";
import ChatTermsDialog from "../components/chat/ChatTermsDialog";
import CoachChatBanner from "../components/chat/CoachChatBanner";

export default function ParentCoachChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showCoachProfile, setShowCoachProfile] = useState(false);
  const [coachData, setCoachData] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dailyMessageCount, setDailyMessageCount] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
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

        // Verificar si ya aceptó las condiciones
        if (!currentUser.condiciones_chat_aceptadas) {
          setShowTermsDialog(true);
        } else {
          setTermsAccepted(true);
        }

        // Contar mensajes del día
        const today = new Date().toISOString().split('T')[0];
        const todayMessages = await base44.entities.ChatMessage.filter({});
        const myTodayMessages = todayMessages.filter(m => 
          m.remitente_email === currentUser.email && 
          m.created_date?.startsWith(today)
        );
        setDailyMessageCount(myTodayMessages.length);
      } catch (error) {
        console.error("Error loading chat:", error);
        toast.error("Error al cargar el chat");
      } finally {
        setLoading(false);
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

  // Obtener todos los entrenadores para mostrar el perfil
  const { data: allCoaches } = useQuery({
    queryKey: ['allCoaches'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.es_entrenador === true);
    },
    enabled: !!selectedCategory
  });

  // Actualizar datos del entrenador cuando cambia la categoría
  useEffect(() => {
    if (!selectedCategory || !allCoaches) return;
    const coach = allCoaches.find(c => 
      c.categorias_entrena?.includes(selectedCategory)
    );
    setCoachData(coach);
  }, [selectedCategory, allCoaches]);

  // Obtener conversación privada con el entrenador
  const { data: coachConversations = [] } = useQuery({
    queryKey: ['myCoachConversations', user?.email, selectedCategory],
    queryFn: async () => {
      if (!user?.email || !selectedCategory) return [];
      const convs = await base44.entities.CoachConversation.filter({ 
        padre_email: user.email,
        categoria: selectedCategory
      });
      return convs;
    },
    enabled: !!user?.email && !!selectedCategory,
  });

  useEffect(() => {
    if (coachConversations.length > 0) {
      setCurrentConversation(coachConversations[0]);
    }
  }, [coachConversations]);

  const reportConversationMutation = useMutation({
    mutationFn: async () => {
      if (!currentConversation) return;
      await base44.entities.CoachConversation.update(currentConversation.id, {
        reportada_admin: true,
        reportada_por: user.email,
        reportada_nombre: user.full_name,
        fecha_reporte: new Date().toISOString(),
        motivo_reporte: reportReason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCoachConversations'] });
      setShowReportDialog(false);
      setReportReason("");
      toast.success("✅ Conversación reportada. El administrador la revisará pronto.");
    },
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

  // Marcar mensajes como leídos INMEDIATAMENTE al abrir el chat
  useEffect(() => {
    if (!user || !messages || messages.length === 0) return;

    const markAsRead = async () => {
      const unreadMessages = messages.filter(m => 
        m.remitente_email !== user.email && !m.leido
      );

      if (unreadMessages.length === 0) return;

      // Marcar INMEDIATAMENTE
      for (const msg of unreadMessages) {
        await base44.entities.ChatMessage.update(msg.id, { leido: true });
      }

      // Invalidar queries INMEDIATAMENTE
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['chatMessages'] }),
        queryClient.refetchQueries({ queryKey: ['coachGroupMessages'] }),
        queryClient.refetchQueries({ queryKey: ['chatMessages'] })
      ]);
    };

    markAsRead();
  }, [messages.length, user?.email, selectedCategory, queryClient]);

  const handleFileUpload = async (e) => {
    // FAMILIAS: COMPLETAMENTE BLOQUEADO
    toast.error("❌ Las familias no pueden enviar archivos por este chat. Solo mensajes de texto.");
    e.target.value = null;
    return;
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
      const currentSeason = (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
      })();

      // SI EL USUARIO ES COORDINADOR O ENTRENADOR, SALTAR TODAS LAS VALIDACIONES
      if (user.es_coordinador === true || user.es_entrenador === true || user.role === "admin") {
        const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
        await base44.entities.ChatMessage.create({
          grupo_id,
          deporte: selectedCategory,
          tipo: "padre_a_grupo",
          remitente_email: user.email,
          remitente_nombre: user.full_name,
          mensaje: data.mensaje,
          archivos_adjuntos: data.adjuntos || [],
          prioridad: "Normal",
          leido: false
        });
        return;
      }

      // VALIDACIONES SOLO PARA PADRES NORMALES:

      // LLAMAR AL CHATBOT PRIMERO
      try {
        const myPlayer = myPlayers.find(p => p.deporte === selectedCategory);
        const botResponse = await base44.functions.invoke('chatbotResponse', {
          mensajePadre: data.mensaje,
          categoria: selectedCategory,
          padreEmail: user.email,
          padreNombre: user.full_name,
          jugadorId: myPlayer?.id
        });

        if (botResponse.data.usarBot || botResponse.data.escalar) {
          // El bot respondió - enviar mensaje del padre primero
          const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
          await base44.entities.ChatMessage.create({
            grupo_id,
            deporte: selectedCategory,
            tipo: "padre_a_grupo",
            remitente_email: user.email,
            remitente_nombre: user.full_name,
            mensaje: data.mensaje,
            archivos_adjuntos: data.adjuntos || [],
            prioridad: "Normal",
            leido: false
          });

          // Luego enviar respuesta del bot
          setTimeout(async () => {
            await base44.entities.ChatMessage.create({
              grupo_id,
              deporte: selectedCategory,
              tipo: "entrenador_a_grupo",
              remitente_email: "bot@cdbustarviejo",
              remitente_nombre: botResponse.data.modoTransparente ? "🤖 Asistente Entrenador" : coachData?.full_name || "Entrenador",
              mensaje: botResponse.data.respuesta,
              prioridad: "Normal",
              leido: false,
              es_respuesta_bot: true
            });

            // Si se escaló, notificar al entrenador
            if (botResponse.data.escalar && coachData) {
              await base44.integrations.Core.SendEmail({
                from_name: "CD Bustarviejo - Chatbot",
                to: coachData.email,
                subject: `🚨 Mensaje Urgente de ${user.full_name}`,
                body: `
                  <h2>🚨 Mensaje Escalado por el Chatbot</h2>
                  <p><strong>De:</strong> ${user.full_name} (${user.email})</p>
                  <p><strong>Categoría:</strong> ${selectedCategory}</p>
                  <p><strong>Razón:</strong> ${botResponse.data.razon}</p>
                  <hr>
                  <p><strong>Mensaje:</strong></p>
                  <p>${data.mensaje}</p>
                  <hr>
                  <p style="font-size: 12px;">Fecha: ${new Date().toLocaleString('es-ES')}</p>
                `
              });
            }
          }, 1500);

          setDailyMessageCount(prev => prev + 1);
          return; // No continuar con el flujo normal
        }
      } catch (botError) {
        console.log("Bot no disponible, continuar con flujo normal:", botError);
      }

      // LÍMITE DE MENSAJES POR DÍA (10 mensajes)
      if (dailyMessageCount >= 10) {
        toast.error("📏 Has alcanzado el límite de 10 mensajes por día. Si necesitas comunicarte más, usa el Chat Coordinador.");
        throw new Error("Límite diario alcanzado");
      }

      // LÍMITE DE CARACTERES (1000)
      if (data.mensaje.length > 1000) {
        toast.error("📏 Mensaje demasiado largo (máx 1000 caracteres). Usa el Chat Coordinador para mensajes extensos.");
        throw new Error("Mensaje muy largo");
      }

      // FILTRO DE PALABRAS OFENSIVAS
      const palabrasProhibidas = [
        "idiota", "estupido", "estúpido", "imbecil", "imbécil", "tonto", 
        "basura", "mierda", "maldito", "puto", "puta", "joder", "coño",
        "gilipollas", "capullo", "hijo de", "desgraciado", "inutil", "inútil"
      ];
      
      const mensajeLower = data.mensaje.toLowerCase();
      const palabraEncontrada = palabrasProhibidas.find(p => mensajeLower.includes(p));
      
      if (palabraEncontrada) {
        toast.error("🚫 Mensaje bloqueado por lenguaje inapropiado. Si tienes un problema, usa el Chat Coordinador.");
        
        // Notificar a coordinador y admin
        try {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo - Sistema de Chats",
            to: "cdbustarviejo@gmail.com",
            subject: `🚫 Mensaje Bloqueado - ${user.full_name}`,
            body: `
              <h2>⚠️ Mensaje Bloqueado por Lenguaje Inapropiado</h2>
              <p><strong>Usuario:</strong> ${user.full_name} (${user.email})</p>
              <p><strong>Chat:</strong> Entrenador - ${selectedCategory}</p>
              <p><strong>Palabra detectada:</strong> "${palabraEncontrada}"</p>
              <p><strong>Mensaje completo:</strong> "${data.mensaje}"</p>
              <hr>
              <p style="color: red; font-size: 12px;">El mensaje NO fue enviado al chat.</p>
              <p style="font-size: 12px;">Fecha: ${new Date().toLocaleString('es-ES')}</p>
            `
          });
        } catch (e) {
          console.error("Error notificando:", e);
        }

        // Registrar en log
        await base44.entities.CoachChatLog.create({
          categoria: selectedCategory,
          padre_email: user.email,
          padre_nombre: user.full_name,
          accion: "mensaje_bloqueado",
          detalles: `Palabra bloqueada: "${palabraEncontrada}"`,
          palabra_bloqueada: palabraEncontrada,
          temporada: currentSeason,
          notificado_admin: true
        });
        
        throw new Error("Mensaje bloqueado");
      }

      // DETECTAR FRASES DE DISCUSIÓN
      const frasesDiscusion = [
        "no estoy de acuerdo", "esto es injusto", "siempre el mismo",
        "mi hijo no juega", "por qué", "otra vez", "no entiendo",
        "mal entrenador", "favoritos", "parcial", "discrimina"
      ];
      
      const fraseEncontrada = frasesDiscusion.find(f => mensajeLower.includes(f));
      
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      
      // Enviar mensaje de la familia
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

      // Si detectó frase de discusión, enviar mensaje automático del sistema
      if (fraseEncontrada) {
        setTimeout(async () => {
          await base44.entities.ChatMessage.create({
            grupo_id,
            deporte: selectedCategory,
            tipo: "sistema",
            remitente_email: "sistema@cdbustarviejo",
            remitente_nombre: "🤖 Sistema del Club",
            mensaje: `⚠️ AVISO AUTOMÁTICO PARA ${user.full_name}:

Hemos detectado que tu mensaje puede requerir una conversación más profunda.

Si tienes dudas sobre decisiones deportivas o necesitas resolver algún problema, por favor usa el 💬 Chat Coordinador (menú lateral) donde podremos atenderte mejor de forma privada.

Este chat es solo para avisos rápidos. Gracias por tu comprensión.`,
            prioridad: "Normal",
            leido: false
          });
        }, 1000);

        // Registrar en log
        await base44.entities.CoachChatLog.create({
          categoria: selectedCategory,
          padre_email: user.email,
          padre_nombre: user.full_name,
          accion: "discusion_detectada",
          detalles: `Frase detectada: "${fraseEncontrada}"`,
          frase_discusion: fraseEncontrada,
          temporada: currentSeason
        });
      }

      // Incrementar contador diario
      setDailyMessageCount(prev => prev + 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages', selectedCategory] });
      setMessageText("");
      setAttachments([]);
      toast.success("Mensaje enviado");
    },
    onError: (error) => {
      // No mostrar toast si ya se mostró en el filtro
    }
  });

  const handleSend = () => {
    if (!termsAccepted) {
      toast.error("Debes aceptar las condiciones de uso antes de enviar mensajes");
      setShowTermsDialog(true);
      return;
    }
    
    // VERIFICAR SI EL USUARIO ESTÁ BLOQUEADO
    if (user?.chat_bloqueado === true) {
      toast.error("🚫 Tu acceso al chat ha sido restringido por el administrador.");
      return;
    }
    
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ mensaje: messageText, adjuntos: attachments });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-slate-500 text-sm">Cargando chats...</p>
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
      {user && (
        <ChatTermsDialog
          open={showTermsDialog}
          onAccept={() => {
            setShowTermsDialog(false);
            setTermsAccepted(true);
          }}
          onDecline={() => {
            toast.error("Debes aceptar las condiciones para usar el chat");
            window.history.back();
          }}
          user={user}
          tipoChat="entrenador"
        />
      )}
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
                {currentConversation?.reportada_admin && (
                  <Badge className="bg-red-500 text-white text-xs ml-2">
                    🔴 Bajo revisión
                  </Badge>
                )}
              </CardTitle>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCoachProfile(true)}
                className="text-white hover:bg-white/20"
                title="Ver perfil del entrenador"
              >
                <UserCircle className="w-4 h-4" />
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
                onClick={() => setShowParticipants(true)}
                className="text-white hover:bg-white/20 text-xs sm:text-sm"
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">{parentEmails.length} familias</span>
                <span className="sm:hidden">{parentEmails.length}</span>
              </Button>
              {currentConversation && !currentConversation.reportada_admin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowReportDialog(true)}
                  className="text-white hover:bg-white/20"
                  title="Reportar conversación al administrador"
                >
                  <AlertTriangle className="w-4 h-4" />
                </Button>
              )}
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
                {/* Banner informativo */}
                <div className="p-2 sm:p-4 flex-shrink-0">
                  <CoachChatBanner isOutsideHours={false} horario={null} />
                </div>

                {currentConversation?.reportada_admin && selectedCategory === cat && (
                  <Alert className="m-2 bg-red-50 border-red-300 flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800 text-xs">
                      <strong>🔴 Esta conversación está bajo revisión administrativa</strong>
                      <br />
                      Reportado el {format(new Date(currentConversation.fecha_reporte), "d 'de' MMM", { locale: es })}
                      {currentConversation.motivo_reporte && <><br />Motivo: {currentConversation.motivo_reporte}</>}
                    </AlertDescription>
                  </Alert>
                )}
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

                      const isMine = msg.remitente_email === user.email;
                      const isCoach = msg.tipo === "entrenador_a_grupo";
                      const isBot = msg.es_respuesta_bot === true;

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
                            <div className={`max-w-[75%] sm:max-w-[70%] ${
                              isMine ? 'bg-slate-700 text-white' : 
                              isBot ? 'bg-blue-500 text-white' :
                              isCoach ? 'bg-green-600 text-white' : 
                              'bg-white text-slate-900 border'
                            } rounded-2xl p-2 sm:p-3 shadow-sm`}>
                              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                <p className="text-[10px] sm:text-xs font-semibold opacity-70">
                                  {isBot ? '🤖 ' : isCoach ? '🏃 ' : ''}{msg.remitente_nombre}
                                </p>
                                {isBot && <Badge className="text-[10px] sm:text-xs bg-blue-400 px-1 py-0">Bot</Badge>}
                                {isCoach && !isBot && <Badge className="text-[10px] sm:text-xs bg-green-500 px-1 py-0">Entrenador</Badge>}
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
                  {user?.chat_bloqueado && (
                    <Alert className="mb-2 bg-red-50 border-red-300">
                      <AlertDescription className="text-red-800 text-sm">
                        🚫 <strong>Tu acceso al chat ha sido restringido</strong>
                        {user?.motivo_bloqueo_chat && <><br />Motivo: {user.motivo_bloqueo_chat}</>}
                        <br />
                        <span className="text-xs">Contacta con el administrador del club para más información.</span>
                      </AlertDescription>
                    </Alert>
                  )}
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
                    
                    {/* FAMILIAS: SIN BOTONES DE ARCHIVOS/MEDIA */}

                    <Textarea
                      placeholder={user?.chat_bloqueado ? "Chat bloqueado" : "Escribe..."}
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
                      disabled={user?.chat_bloqueado}
                    />

                    <Button 
                      onClick={handleSend} 
                      disabled={!messageText.trim() && attachments.length === 0 || user?.chat_bloqueado} 
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

      {/* Dialog: Perfil del Entrenador */}
      <Dialog open={showCoachProfile} onOpenChange={setShowCoachProfile}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-blue-600" />
              Perfil del Entrenador
            </DialogTitle>
          </DialogHeader>
          {coachData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {coachData.foto_perfil_url ? (
                  <img
                    src={coachData.foto_perfil_url}
                    alt={coachData.full_name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-blue-100 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold border-4 border-blue-100 shadow-lg">
                    {coachData.full_name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900">{coachData.full_name}</h3>
                  <p className="text-sm text-slate-600">🏃 Entrenador</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {coachData.categorias_entrena?.map(cat => (
                      <Badge key={cat} className="bg-blue-100 text-blue-700 text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {coachData.bio_entrenador && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-700 italic">"{coachData.bio_entrenador}"</p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 text-sm">Información de Contacto</h4>
                {coachData.mostrar_email_publico && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <a href={`mailto:${coachData.email}`} className="hover:text-blue-600 underline">
                      {coachData.email}
                    </a>
                  </div>
                )}
                {coachData.mostrar_telefono_publico && coachData.telefono_contacto && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <a href={`tel:${coachData.telefono_contacto}`} className="hover:text-blue-600 underline">
                      {coachData.telefono_contacto}
                    </a>
                  </div>
                )}
                {!coachData.mostrar_email_publico && !coachData.mostrar_telefono_publico && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-800">
                      💬 Usa el chat de la app para contactar con el entrenador
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">No hay información del entrenador disponible</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Reportar Conversación */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              ⚠️ Reportar Conversación con Entrenador
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Solo usa esto si hay un problema serio que requiera supervisión del administrador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-red-50 border-red-300">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800 ml-2 text-sm">
                <strong>Al reportar:</strong> El administrador podrá ver esta conversación completa con el entrenador de <strong>{selectedCategory}</strong> para resolver el problema.
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-slate-700">✋ Solo reporta si hay:</p>
              <ul className="text-xs text-slate-600 space-y-1 ml-4">
                <li>• Conflicto serio con el entrenador</li>
                <li>• Falta de comunicación importante</li>
                <li>• Cualquier problema que requiera intervención administrativa</li>
              </ul>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Describe brevemente el problema (opcional):
              </label>
              <DialogTextarea
                placeholder="Ej: No responde a mis mensajes sobre la lesión de mi hijo..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => reportConversationMutation.mutate()}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!currentConversation}
            >
              ⚠️ Sí, reportar conversación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}