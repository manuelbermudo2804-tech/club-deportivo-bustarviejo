
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Clock, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";

export default function PlayerChat() {
  const [messageContent, setMessageContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const allPlayers = await base44.entities.Player.list();
      const myPlayer = allPlayers.find(p => p.email === currentUser.email);
      setPlayer(myPlayer);
    };
    fetchUser();
  }, []);

  const { data: messages, isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 3000,
  });

  const { data: teamPlayers } = useQuery({
    queryKey: ['teamPlayers', player?.deporte],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => p.deporte === player?.deporte);
    },
    enabled: !!player?.deporte,
    initialData: [],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const newMessage = await base44.entities.ChatMessage.create(messageData);
      
      const imageAttachments = messageData.archivos_adjuntos.filter(att => att.tipo === "imagen");
      if (imageAttachments.length > 0) {
        const albumData = {
          titulo: `Chat - ${messageData.deporte} (${format(new Date(), "d MMM yyyy", { locale: es })})`,
          descripcion: messageData.mensaje || "Fotos del chat",
          fecha_evento: new Date().toISOString().split('T')[0],
          categoria: messageData.deporte,
          tipo_evento: "Otro",
          fotos: imageAttachments.map(img => ({
            url: img.url,
            descripcion: messageData.mensaje || "",
            jugadores_etiquetados: []
          })),
          visible_para_padres: true,
          destacado: false
        };
        
        await base44.entities.PhotoGallery.create(albumData);
      }
      
      return newMessage;
    },
    onSuccess: async () => {
      setMessageContent("");
      setAttachments([]);
      await refetchMessages();
      toast.success("Mensaje enviado");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      const updatePromises = messageIds.map(id => 
        base44.entities.ChatMessage.update(id, { leido: true })
      );
      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    let normalized = deporte.trim();
    normalized = normalized.replace(/_undefined$/, '');
    normalized = normalized.replace(/_$/, '');
    return normalized;
  };

  const filteredMessages = messages.filter(msg => {
    if (!player) return false;
    const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
    const playerDeporte = normalizeDeporte(player.deporte);
    return msgDeporte === playerDeporte;
  });

  useEffect(() => {
    if (filteredMessages.length > 0 && user) { // Ensure user is available for email comparison
      const unreadMessageIds = filteredMessages
        .filter(msg => !msg.leido && msg.tipo === "admin_a_grupo" && msg.remitente_email !== user.email)
        .map(msg => msg.id);
      
      if (unreadMessageIds.length > 0) {
        markAsReadMutation.mutate(unreadMessageIds);
      }
    }
  }, [filteredMessages.length, user]); // Added user to dependencies

  const isBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 20;
  };

  const handleSendMessage = () => {
    if (!user || !player) return;
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje");
      return;
    }

    if (!isBusinessHours()) {
      toast.error("Solo entre 10:00 y 20:00");
      return;
    }

    const messageData = {
      remitente_email: user.email,
      remitente_nombre: player.nombre || user.full_name,
      mensaje: messageContent || "(Archivo adjunto)",
      prioridad: "Normal",
      tipo: "jugador_a_equipo",
      deporte: player.deporte,
      categoria: "",
      grupo_id: player.deporte,
      leido: false,
      archivos_adjuntos: attachments
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleFileUploaded = (attachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sportEmojis = {
    "Fútbol Pre-Benjamín (Mixto)": "⚽",
    "Fútbol Benjamín (Mixto)": "⚽",
    "Fútbol Alevín (Mixto)": "⚽",
    "Fútbol Infantil (Mixto)": "⚽",
    "Fútbol Cadete": "⚽",
    "Fútbol Juvenil": "⚽",
    "Fútbol Aficionado": "⚽",
    "Fútbol Femenino": "⚽",
    "Baloncesto (Mixto)": "🏀"
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  if (loadingMessages || !player) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 text-white flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-xl">{sportEmojis[player.deporte]}</span>
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-base">{player.deporte}</h2>
          <p className="text-xs text-orange-100">
            Chat del equipo • {teamPlayers.length} jugadores
          </p>
        </div>
        {!isBusinessHours() && (
          <Badge className="bg-white/20 text-white text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Fuera de horario
          </Badge>
        )}
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#e5ddd5'
        }}
      >
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay mensajes</p>
            </div>
          </div>
        ) : (
          filteredMessages
            .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
            .map((msg) => {
              const isMyMessage = msg.remitente_email === user?.email;
              const isAdmin = msg.tipo === "admin_a_grupo";
              const isJugador = msg.tipo === "jugador_a_equipo";
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-1`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg shadow-sm ${
                      isMyMessage
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-none'
                        : isAdmin
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-bl-none'
                        : isJugador
                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-bl-none'
                        : 'bg-white text-slate-900 rounded-bl-none' // Fallback for other message types
                    }`}
                  >
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${
                          isMyMessage ? 'text-blue-100' : isAdmin ? 'text-green-100' : isJugador ? 'text-orange-100' : 'text-slate-700'
                        }`}>
                          {isAdmin ? '🎓 ' : isJugador ? '⚽ ' : '👨‍👩‍👧 '}{msg.remitente_nombre}
                        </span>
                        {msg.prioridad !== "Normal" && (
                          <span className="text-xs">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed break-words">{msg.mensaje}</p>
                      
                      {msg.archivos_adjuntos?.length > 0 && (
                        <div className="mt-2">
                          <MessageAttachments attachments={msg.archivos_adjuntos} />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`text-[10px] ${
                          isMyMessage ? 'text-blue-100' : isAdmin ? 'text-green-100' : isJugador ? 'text-orange-100' : 'text-slate-500'
                        }`}>
                          {format(new Date(msg.created_date), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t p-3">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att, index) => (
              <div key={index} className="bg-slate-100 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                <span className="text-xs truncate max-w-[150px]">{att.nombre}</span>
                <button
                  onClick={() => handleRemoveAttachment(index)}
                  className="text-slate-500 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <FileAttachmentButton
            onFileUploaded={handleFileUploaded}
            disabled={!isBusinessHours() || sendMessageMutation.isPending}
          />
          
          <Input
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder={isBusinessHours() ? "Escribe un mensaje..." : "Horario: 10:00 - 20:00"}
            className="flex-1 rounded-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={!isBusinessHours()}
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={(!messageContent.trim() && attachments.length === 0) || sendMessageMutation.isPending || !isBusinessHours()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
