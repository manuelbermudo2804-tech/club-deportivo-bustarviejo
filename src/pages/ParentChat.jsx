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

export default function ParentChat() {
  const [messageContent, setMessageContent] = useState("");
  const [selectedTab, setSelectedTab] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: messages, isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 2000,
  });

  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        p.email_padre === user?.email || p.email_tutor_2 === user?.email
      );
    },
    enabled: !!user?.email,
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
      await refetchMessages();
      setMessageContent("");
      setAttachments([]);
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

  const uniqueDeportes = [...new Set(
    players.map(p => normalizeDeporte(p.deporte)).filter(Boolean)
  )];
  
  const myGroups = uniqueDeportes.map(deporteNormalizado => {
    const groupMessages = messages.filter(msg => {
      const msgDeporte = normalizeDeporte(msg.grupo_id || msg.deporte);
      return msgDeporte === deporteNormalizado;
    });
    
    const unreadCount = groupMessages.filter(msg => 
      !msg.leido && msg.tipo === "admin_a_grupo"
    ).length;
    
    const urgentCount = groupMessages.filter(msg =>
      !msg.leido && msg.tipo === "admin_a_grupo" && msg.prioridad === "Urgente"
    ).length;
    
    return {
      id: deporteNormalizado,
      deporte: deporteNormalizado,
      messages: groupMessages,
      unreadCount,
      urgentCount
    };
  });

  useEffect(() => {
    if (myGroups.length > 0 && !selectedTab) {
      setSelectedTab(myGroups[0].id);
    }
  }, [myGroups.length]);

  useEffect(() => {
    if (selectedTab) {
      const group = myGroups.find(g => g.id === selectedTab);
      if (group) {
        const unreadMessageIds = group.messages
          .filter(msg => !msg.leido && msg.tipo === "admin_a_grupo")
          .map(msg => msg.id);
        
        if (unreadMessageIds.length > 0) {
          markAsReadMutation.mutate(unreadMessageIds);
        }
      }
    }
  }, [selectedTab]);

  const isBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 20;
  };

  const handleSendMessage = () => {
    if (!user || !selectedTab) return;
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
      remitente_nombre: user.full_name || "Padre/Tutor",
      mensaje: messageContent || "(Archivo adjunto)",
      prioridad: "Normal",
      tipo: "padre_a_grupo",
      deporte: selectedTab,
      categoria: "",
      grupo_id: selectedTab,
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
  }, [selectedTab, messages]);

  if (loadingPlayers || loadingMessages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Cargando chat...</p>
        </div>
      </div>
    );
  }

  if (myGroups.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No hay grupos disponibles</p>
          <p className="text-sm text-slate-400 mt-2">Registra un jugador para acceder al chat</p>
        </div>
      </div>
    );
  }

  const currentGroup = myGroups.find(g => g.id === selectedTab);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Tabs de Grupos */}
      {myGroups.length > 1 && (
        <div className="bg-white border-b overflow-x-auto">
          <div className="flex">
            {myGroups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedTab(group.id)}
                className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all flex-shrink-0 ${
                  selectedTab === group.id
                    ? 'border-orange-600 text-orange-600 bg-orange-50'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{sportEmojis[group.deporte]}</span>
                <span>{group.deporte}</span>
                {group.unreadCount > 0 && (
                  <Badge className="bg-orange-600 text-white text-xs h-5 min-w-5 rounded-full">
                    {group.unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header del Chat */}
      {currentGroup && (
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 text-white flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-xl">{sportEmojis[currentGroup.deporte]}</span>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-base">{currentGroup.deporte}</h2>
            <p className="text-xs text-orange-100">Chat del grupo</p>
          </div>
          {!isBusinessHours() && (
            <Badge className="bg-white/20 text-white text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Fuera de horario
            </Badge>
          )}
        </div>
      )}

      {/* Mensajes */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#e5ddd5'
        }}
      >
        {currentGroup?.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay mensajes</p>
            </div>
          </div>
        ) : (
          currentGroup?.messages
            .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
            .map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.tipo === "padre_a_grupo" ? 'justify-end' : 'justify-start'} mb-1`}
              >
                <div
                  className={`max-w-[75%] rounded-lg shadow-sm ${
                    msg.tipo === "padre_a_grupo"
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-br-none'
                      : 'bg-white text-slate-900 rounded-bl-none'
                  }`}
                >
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${msg.tipo === "padre_a_grupo" ? 'text-green-100' : 'text-orange-700'}`}>
                        {msg.remitente_nombre}
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
                      <span className={`text-[10px] ${msg.tipo === "padre_a_grupo" ? 'text-green-100' : 'text-slate-500'}`}>
                        {format(new Date(msg.created_date), "HH:mm")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
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
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}