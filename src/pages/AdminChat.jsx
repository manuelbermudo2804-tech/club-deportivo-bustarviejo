import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Search, Clock, AlertCircle, X, Users, Check, CheckCheck, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

import FileAttachmentButton from "../components/chat/FileAttachmentButton";
import MessageAttachments from "../components/chat/MessageAttachments";
import QuickPollDialog from "../components/chat/QuickPollDialog";
import PollMessage from "../components/chat/PollMessage";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Lock, Shield } from "lucide-react";

export default function AdminChat() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState("all"); // "all" o email específico
  const [isMobile, setIsMobile] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("grupos");
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [auditReason, setAuditReason] = useState("");
  const [auditAccess, setAuditAccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    staleTime: 5000,
    gcTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

  const { data: players } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: privateMessages } = useQuery({
    queryKey: ['privateMessages'],
    queryFn: () => base44.entities.PrivateMessage.list('-created_date'),
    initialData: [],
    enabled: auditAccess,
  });

  const { data: privateConversations } = useQuery({
    queryKey: ['privateConversations'],
    queryFn: () => base44.entities.PrivateConversation.list('-updated_date'),
    initialData: [],
    enabled: auditAccess,
  });

  const voteOnPollMutation = useMutation({
    mutationFn: async ({ messageId, optionIndex }) => {
      const message = messages.find(m => m.id === messageId);
      if (!message || !message.poll) return;

      const votes = message.poll.votes || [];
      const existingVote = votes.find(v => v.user_email === user.email);
      
      if (!existingVote) {
        votes.push({
          user_email: user.email,
          user_name: user.full_name,
          option_index: optionIndex,
          voted_at: new Date().toISOString()
        });

        const updatedPoll = { ...message.poll, votes };
        await base44.entities.ChatMessage.update(messageId, {
          ...message,
          poll: updatedPoll
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      if (messageData.sendToAll) {
        const allGroups = Object.keys(groups);
        const promises = allGroups.map(grupoId => {
          return base44.entities.ChatMessage.create({
            ...messageData,
            deporte: grupoId,
            grupo_id: grupoId,
            sendToAll: undefined
          });
        });
        
        const newMessages = await Promise.all(promises);
        
        if (messageData.prioridad === "Importante" || messageData.prioridad === "Urgente") {
          const allParentEmails = [...new Set(players.map(p => p.email_padre).filter(Boolean))];
          const priorityEmoji = messageData.prioridad === "Urgente" ? "🔴" : "⚠️";
          
          const emailPromises = allParentEmails.map(email => 
            base44.integrations.Core.SendEmail({
              to: email,
              subject: `${priorityEmoji} [${messageData.prioridad.toUpperCase()}] CD Bustarviejo - Anuncio General`,
              body: `Anuncio ${messageData.prioridad.toLowerCase()} del club para todos los grupos.\n\n${messageData.mensaje}\n\nAccede a la app para ver más detalles.`
            }).catch(err => console.error("Error sending email:", err))
          );
          
          await Promise.all(emailPromises);
        }
        
        return newMessages;
      } else {
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
              descripcion: img.nombre || messageData.mensaje || "",
              jugadores_etiquetados: []
            })),
            visible_para_padres: true,
            destacado: false
          };
          
          await base44.entities.PhotoGallery.create(albumData);
        }
        
        if (messageData.prioridad === "Importante" || messageData.prioridad === "Urgente") {
          const groupPlayers = players.filter(p => p.deporte === messageData.deporte);
          const parentEmails = [...new Set(groupPlayers.map(p => p.email_padre).filter(Boolean))];
          const priorityEmoji = messageData.prioridad === "Urgente" ? "🔴" : "⚠️";
          
          const emailPromises = parentEmails.map(email => 
            base44.integrations.Core.SendEmail({
              to: email,
              subject: `${priorityEmoji} [${messageData.prioridad.toUpperCase()}] CD Bustarviejo - ${messageData.deporte}`,
              body: `Nuevo mensaje ${messageData.prioridad.toLowerCase()} del club.\n\n${messageData.mensaje}\n\nAccede a la app para ver más detalles.`
            }).catch(err => console.error("Error sending email:", err))
          );
          
          await Promise.all(emailPromises);
        }
        
        return newMessage;
      }
    },
    onSuccess: async (result, variables) => {
      setOptimisticMessages([]);
      setIsSending(false);
      setPriority("Normal");
      setSendToAll(false);
      setSelectedRecipient("all");
      
      // Enviar PUSH real para TODOS los mensajes de chat
      try {
        const groupPlayers = variables.sendToAll 
          ? players 
          : players.filter(p => p.deporte === variables.deporte);
        const recipientEmails = [...new Set(groupPlayers.flatMap(p => [p.email_padre, p.email_tutor_2].filter(Boolean)))];
        
        await base44.functions.invoke('triggerChatPush', {
          messageContent: variables.mensaje,
          senderName: variables.remitente_nombre,
          groupId: variables.grupo_id,
          prioridad: variables.prioridad,
          recipientEmails
        });
        console.log('✅ Push enviado para mensaje de chat');
      } catch (pushErr) {
        console.error('Error enviando push:', pushErr);
      }
      
      await queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      await refetchMessages();
    },
    onError: () => {
      setOptimisticMessages([]);
      setIsSending(false);
      toast.error("Error al enviar mensaje");
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

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) => base44.entities.ChatMessage.delete(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      toast.success("Mensaje eliminado");
    },
  });

  const handleRequestAuditAccess = () => {
    if (!auditReason.trim() || auditReason.length < 10) {
      toast.error("Debes indicar un motivo válido (mínimo 10 caracteres)");
      return;
    }
    
    // Registrar el acceso
    console.log(`[AUDIT LOG] Admin ${user?.email} accedió a mensajes privados. Motivo: ${auditReason}. Fecha: ${new Date().toISOString()}`);
    
    // Enviar notificación de auditoría
    base44.integrations.Core.SendEmail({
      from_name: "CD Bustarviejo - Sistema",
      to: "cdbustarviejo@gmail.com",
      subject: "🔒 Acceso a Mensajes Privados - Auditoría",
      body: `El administrador ${user?.full_name} (${user?.email}) ha accedido a la sección de mensajes privados.\n\nMotivo: ${auditReason}\n\nFecha: ${new Date().toLocaleString('es-ES')}\n\nEste acceso queda registrado en el sistema.`
    }).catch(err => console.error("Error sending audit email:", err));
    
    setAuditAccess(true);
    setShowAuditDialog(false);
    setAuditReason("");
    toast.success("Acceso concedido. Este acceso ha quedado registrado.");
  };

  const isBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 20;
  };

  const normalizeDeporte = (deporte) => {
    if (!deporte) return null;
    let normalized = deporte.trim();
    normalized = normalized.replace(/_undefined$/, '');
    normalized = normalized.replace(/_$/, '');
    return normalized;
  };

  const groups = useMemo(() => {
    const groupsMap = {};
    
    // Agregar Chat Interno Entrenadores para que admin lo vea
    groupsMap["Chat Interno Entrenadores"] = {
      id: "Chat Interno Entrenadores",
      deporte: "Chat Interno Entrenadores",
      players: [],
      messages: [],
      unreadCount: 0,
      urgentCount: 0,
      lastMessageDate: null,
      tipo: 'interno'
    };

    // Agregar Coordinación Deportiva para que admin lo vea
    groupsMap["Coordinación Deportiva"] = {
      id: "Coordinación Deportiva",
      deporte: "Coordinación Deportiva",
      players: [],
      messages: [],
      unreadCount: 0,
      urgentCount: 0,
      lastMessageDate: null,
      tipo: 'coordinacion'
    };
    
    players.forEach(player => {
      const deporteNormalizado = normalizeDeporte(player.deporte);
      if (!deporteNormalizado) return;
      
      if (!groupsMap[deporteNormalizado]) {
        groupsMap[deporteNormalizado] = {
          id: deporteNormalizado,
          deporte: deporteNormalizado,
          players: [],
          messages: [],
          unreadCount: 0,
          urgentCount: 0,
          lastMessageDate: null
        };
      }
      groupsMap[deporteNormalizado].players.push(player);
    });

    messages.forEach(msg => {
      let deporteRaw = msg.grupo_id || msg.deporte;
      const deporteNormalizado = normalizeDeporte(deporteRaw);
      
      if (!deporteNormalizado) return;
      
      if (!groupsMap[deporteNormalizado]) {
        groupsMap[deporteNormalizado] = {
          id: deporteNormalizado,
          deporte: deporteNormalizado,
          players: [],
          messages: [],
          unreadCount: 0,
          urgentCount: 0,
          lastMessageDate: null
        };
      }
      
      if (!groupsMap[deporteNormalizado].messages.find(m => m.id === msg.id)) {
        groupsMap[deporteNormalizado].messages.push(msg);
        
        // Contar no leídos según el tipo de grupo
        const esInterno = deporteNormalizado === "Chat Interno Entrenadores";
        const esCoordinacion = deporteNormalizado === "Coordinación Deportiva";
        
        if (!msg.leido) {
          if (esInterno && msg.remitente_email !== user?.email) {
            groupsMap[deporteNormalizado].unreadCount++;
          } else if (esCoordinacion && msg.tipo === "padre_a_grupo") {
            groupsMap[deporteNormalizado].unreadCount++;
          } else if (!esInterno && !esCoordinacion && msg.tipo === "padre_a_grupo") {
            groupsMap[deporteNormalizado].unreadCount++;
            if (msg.prioridad === "Urgente") {
              groupsMap[deporteNormalizado].urgentCount++;
            }
          }
        }
        
        const msgDate = new Date(msg.created_date);
        if (!groupsMap[deporteNormalizado].lastMessageDate || msgDate > groupsMap[deporteNormalizado].lastMessageDate) {
          groupsMap[deporteNormalizado].lastMessageDate = msgDate;
        }
      }
    });

    return groupsMap;
  }, [messages, players, user]);

  const sortedGroups = useMemo(() => {
    return Object.values(groups).sort((a, b) => {
      if (!a.lastMessageDate && !b.lastMessageDate) return 0;
      if (!a.lastMessageDate) return 1;
      if (!b.lastMessageDate) return -1;
      return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
    });
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return sortedGroups.filter(group =>
      (group.deporte || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedGroups, searchTerm]);

  const allGroupsList = useMemo(() => {
    return [
      { id: 'todos', deporte: '📢 Todos los Grupos', isSendToAll: true },
      ...sortedGroups
    ];
  }, [sortedGroups]);

  const currentGroup = useMemo(() => {
    if (sendToAll) return null;
    return selectedGroup ? groups[selectedGroup] : null;
  }, [selectedGroup, sendToAll, groups]);

  const handleSendPoll = async (pollData) => {
    if (!user) return;

    const senderName = user.role === "admin" 
      ? "Administración CD Bustarviejo" 
      : user.full_name || "Coordinador";

    const uniqueParents = new Map();
    
    if (sendToAll) {
      players.forEach(p => {
        if (p.email_padre) uniqueParents.set(p.email_padre, { email: p.email_padre, deporte: p.deporte, playerName: p.nombre });
        if (p.email_tutor_2) uniqueParents.set(p.email_tutor_2, { email: p.email_tutor_2, deporte: p.deporte, playerName: p.nombre });
      });
    } else {
      const groupPlayers = players.filter(p => p.deporte === selectedGroup);
      groupPlayers.forEach(p => {
        if (p.email_padre) uniqueParents.set(p.email_padre, { email: p.email_padre, deporte: p.deporte, playerName: p.nombre });
        if (p.email_tutor_2) uniqueParents.set(p.email_tutor_2, { email: p.email_tutor_2, deporte: p.deporte, playerName: p.nombre });
      });
    }

    for (const parent of uniqueParents.values()) {
      await base44.entities.ChatMessage.create({
        remitente_email: user.email,
        remitente_nombre: senderName,
        destinatario_email: parent.email,
        destinatario_nombre: `Padre de ${parent.playerName}`,
        mensaje: `📊 ${pollData.question}`,
        prioridad: priority,
        tipo: "admin_a_grupo",
        deporte: parent.deporte,
        grupo_id: parent.deporte,
        leido: false,
        poll: {
          question: pollData.question,
          options: pollData.options,
          votes: []
        }
      });
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    toast.success("📊 Encuesta enviada");
    queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
  };

  const handleSendMessage = () => {
    if (!user) return;
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error("Escribe un mensaje");
      return;
    }

    if (!sendToAll && !selectedGroup) {
      toast.error("Selecciona un grupo");
      return;
    }
    
    if (isSending) return;

    const senderName = user.role === "admin" 
      ? "Administración CD Bustarviejo" 
      : user.full_name || "Coordinador";

    const msgText = messageContent.trim() || "(Archivo adjunto)";

    // Guardar attachments temporalmente ANTES de limpiar
    const tempAttachments = [...attachments];
    
    // Limpiar input PRIMERO (feedback instantáneo como WhatsApp)
    setMessageContent("");
    setAttachments([]);
    setIsSending(true);

    // Mensaje optimista - aparece INSTANTÁNEAMENTE después de limpiar input
    if (!sendToAll && selectedGroup) {
      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        remitente_email: user.email,
        remitente_nombre: senderName,
        mensaje: msgText,
        prioridad: priority,
        tipo: "admin_a_grupo",
        deporte: selectedGroup,
        grupo_id: selectedGroup,
        leido: false,
        archivos_adjuntos: tempAttachments,
        created_date: new Date().toISOString(),
        _isOptimistic: true
      };
      setOptimisticMessages([optimisticMsg]);
      
      // Scroll inmediato al enviar
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);
    }

    const messageData = {
      remitente_email: user.email,
      remitente_nombre: senderName,
      mensaje: msgText,
      prioridad: priority,
      tipo: "admin_a_grupo",
      deporte: sendToAll ? "Todos" : selectedGroup,
      categoria: "",
      grupo_id: sendToAll ? "todos" : selectedGroup,
      leido: false,
      archivos_adjuntos: tempAttachments,
      sendToAll: sendToAll,
      destinatario_email: selectedRecipient !== "all" ? selectedRecipient : undefined,
      destinatario_nombre: selectedRecipient !== "all" ? getParentName(selectedRecipient) : undefined
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleSelectGroup = (groupId, isSendAll = false) => {
    if (isSendAll) {
      setSendToAll(true);
      setSelectedGroup(null);
    } else {
      setSelectedGroup(groupId);
      setSendToAll(false);
      const group = groups[groupId];
      if (group) {
        const unreadMessageIds = group.messages
          .filter(msg => !msg.leido && msg.tipo === "padre_a_grupo")
          .map(msg => msg.id);
        
        if (unreadMessageIds.length > 0) {
          markAsReadMutation.mutate(unreadMessageIds);
        }
      }
    }
  };

  const handleFileUploaded = (attachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getGroupParents = () => {
    if (!selectedGroup || sendToAll) return [];
    const groupPlayers = players.filter(p => p.deporte === selectedGroup);
    const parentsMap = new Map();
    
    groupPlayers.forEach(p => {
      if (p.email_padre) {
        if (!parentsMap.has(p.email_padre)) {
          parentsMap.set(p.email_padre, { role: 'Padre', kids: [] });
        }
        parentsMap.get(p.email_padre).kids.push(p.nombre);
      }
      if (p.email_tutor_2) {
        if (!parentsMap.has(p.email_tutor_2)) {
          parentsMap.set(p.email_tutor_2, { role: 'Tutor 2', kids: [] });
        }
        parentsMap.get(p.email_tutor_2).kids.push(p.nombre);
      }
    });
    
    return Array.from(parentsMap.entries()).map(([email, data]) => ({
      email,
      name: `${data.role} de ${data.kids.join(', ')}`
    }));
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
    "Baloncesto (Mixto)": "🏀",
    "Chat Interno Entrenadores": "💼",
    "Coordinación Deportiva": "🎓"
  };

  const getParentName = (email) => {
    const parents = getGroupParents();
    const parent = parents.find(p => p.email === email);
    return parent?.name || email;
  };

  const prevMessagesCountRef = useRef(0);
  
  // Scroll INTELIGENTE - solo cuando hay mensajes nuevos y el usuario está abajo
  useEffect(() => {
    const currentCount = (currentGroup?.messages?.length || 0) + optimisticMessages.length;
    
    // Solo hacer scroll si aumentó el contador (hay mensajes nuevos)
    if (prevMessagesCountRef.current > 0 && currentCount > prevMessagesCountRef.current) {
      const container = messagesEndRef.current?.parentElement;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        
        // Solo scroll automático si el usuario está cerca del final
        if (isNearBottom) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
          }, 100);
        }
      }
    }
    
    prevMessagesCountRef.current = currentCount;
  }, [currentGroup?.messages?.length, optimisticMessages.length]);

  const getReadStatus = (msg) => {
    if (msg.tipo !== "admin_a_grupo") return null;
    return msg.leido ? "read" : "sent";
  };

  return (
    <>
      <QuickPollDialog
        isOpen={showPollDialog}
        onClose={() => setShowPollDialog(false)}
        onSend={handleSendPoll}
        groupName={currentGroup?.name || selectedGroup}
      />

      {/* Dialog de Auditoría */}
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Shield className="w-5 h-5" />
              Acceso a Mensajes Privados
            </DialogTitle>
            <DialogDescription>
              Esta acción quedará registrada en el sistema. Solo debe accederse ante quejas formales, problemas de seguridad o auditorías específicas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Aviso:</strong> El acceso a conversaciones privadas debe estar justificado. Se enviará una notificación de auditoría.
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700">Motivo del acceso *</label>
              <Textarea
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="Ej: Queja formal del padre X sobre comunicación con coordinador Y..."
                className="mt-1"
                rows={3}
              />
              <p className="text-xs text-slate-500 mt-1">Mínimo 10 caracteres</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRequestAuditAccess}
              className="bg-red-600 hover:bg-red-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              Confirmar Acceso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className={`${isMobile ? 'fixed inset-0 flex flex-col bg-white' : 'p-4 lg:p-6 min-h-screen bg-slate-50'}`} style={isMobile ? { top: '120px' } : {}}>
        
        {/* Tabs de navegación */}
        <div className="bg-white border-b px-4 py-2 flex-shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="grupos">💬 Chats de Grupos</TabsTrigger>
              <TabsTrigger value="auditoria" className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Auditoría Privados
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === "auditoria" && !auditAccess && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
              <p className="text-slate-600 mb-4">
                Los mensajes privados entre padres y coordinadores son confidenciales. 
                Solo debes acceder ante una justificación válida.
              </p>
              <Button 
                onClick={() => setShowAuditDialog(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Eye className="w-4 h-4 mr-2" />
                Solicitar Acceso de Auditoría
              </Button>
            </div>
          </div>
        )}

        {activeTab === "auditoria" && auditAccess && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                🔒 <strong>Modo Auditoría Activo.</strong> Tu acceso ha quedado registrado.
              </p>
            </div>
            
            {privateConversations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Lock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay conversaciones privadas registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {privateConversations.map(conv => {
                  const convMessages = privateMessages.filter(m => m.conversacion_id === conv.id);
                  return (
                    <div key={conv.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                      <div className="bg-slate-100 px-4 py-3 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{conv.participante1_nombre} ↔ {conv.participante2_nombre}</p>
                            <p className="text-xs text-slate-500">
                              {convMessages.length} mensajes • Última actividad: {conv.updated_date ? format(new Date(conv.updated_date), "d MMM yyyy HH:mm", { locale: es }) : '-'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {conv.archivada ? 'Archivada' : 'Activa'}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 max-h-60 overflow-y-auto space-y-2 bg-slate-50">
                        {convMessages.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center">Sin mensajes</p>
                        ) : (
                          convMessages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)).map(msg => (
                            <div key={msg.id} className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-slate-700">{msg.remitente_nombre}</span>
                                <span className="text-[10px] text-slate-400">
                                  {format(new Date(msg.created_date), "d MMM HH:mm", { locale: es })}
                                </span>
                              </div>
                              <p className="text-sm text-slate-800">{msg.contenido}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "grupos" && (
          <>
          {/* MÓVIL: Lista de grupos (sin chat visible) */}
          {isMobile && !selectedGroup && !sendToAll && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white flex-shrink-0">
                <h2 className="text-xl font-bold">💬 Chats</h2>
                <p className="text-sm text-orange-100">{allGroupsList.length} grupos disponibles</p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {allGroupsList.map(group => {
                  const displayGroup = group.isSendToAll ? { ...group, unreadCount: 0, urgentCount: 0 } : groups[group.id] || group;
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleSelectGroup(group.id, group.isSendToAll)}
                      className="w-full p-4 flex items-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                        group.isSendToAll ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        <span className="text-2xl">{group.isSendToAll ? '📢' : sportEmojis[group.deporte] || '⚽'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 truncate text-base">{group.isSendToAll ? '📢 Todos los Grupos' : group.deporte}</div>
                        <div className="text-sm text-slate-600 truncate">
                          {group.isSendToAll ? 'Anuncio general' : `${displayGroup.messages?.length || 0} mensajes`}
                        </div>
                      </div>
                      {displayGroup.unreadCount > 0 && (
                        <Badge className={`${
                          displayGroup.urgentCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-orange-600'
                        } text-white text-sm h-8 min-w-8 rounded-full flex items-center justify-center shadow-lg font-bold`}>
                          {displayGroup.unreadCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

      {/* DESKTOP: Chat area con sidebar */}
      {!isMobile && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {(selectedGroup || sendToAll) && (
              <>
                <div className={`p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0 ${
                  sendToAll ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-orange-600 to-orange-700'
                }`}>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    {sendToAll ? <Users className="w-6 h-6" /> : <span className="text-xl">{sportEmojis[currentGroup?.deporte]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-base truncate">
                      {sendToAll ? '📢 Anuncio a Todos los Grupos' : currentGroup?.deporte}
                    </h2>
                    <p className="text-xs opacity-90 truncate">
                      {sendToAll ? `${Object.keys(groups).length} grupos • ${players.length} jugadores` : `${currentGroup?.players.length || 0} jugadores`}
                    </p>
                  </div>
                </div>

          {sendToAll && (
            <div className="p-4 flex-shrink-0">
              <Alert className="bg-blue-50 border-blue-300">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  Tu mensaje se enviará a todos los grupos del club.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: '#e5ddd5'
            }}
          >
            {sendToAll ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Escribe tu anuncio abajo</p>
                </div>
              </div>
            ) : currentGroup?.messages.length === 0 && optimisticMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay mensajes</p>
                </div>
              </div>
            ) : (
              [...(currentGroup?.messages || []), ...optimisticMessages]
                .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                .map((msg) => {
                  const readStatus = getReadStatus(msg);
                  const isJugador = msg.tipo === "jugador_a_equipo";
                  const isPadre = msg.tipo === "padre_a_grupo";
                  const isAdmin = msg.tipo === "admin_a_grupo";
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-1 w-full px-1 group`}
                    >
                      <div
                        className={`max-w-[85%] lg:max-w-[75%] rounded-lg shadow-sm overflow-hidden relative ${
                          isAdmin
                            ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-br-none'
                            : isJugador
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-bl-none'
                            : 'bg-white text-slate-900 rounded-bl-none'
                        } ${msg._isOptimistic ? 'opacity-70' : ''}`}
                      >
                        <button
                          onClick={() => {
                            if (confirm('¿Eliminar este mensaje?')) {
                              deleteMessageMutation.mutate(msg.id);
                            }
                          }}
                          className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-semibold truncate ${
                              isAdmin ? 'text-green-100' : isJugador ? 'text-blue-100' : 'text-orange-700'
                            }`}>
                              {isAdmin ? '🎓 ' : isJugador ? '⚽ ' : '👨‍👩‍👧 '}{msg.remitente_nombre}
                            </span>
                            {msg.destinatario_nombre && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                                isAdmin ? 'bg-green-800 text-green-100' : 'bg-slate-200 text-slate-700'
                              }`}>
                                → {msg.destinatario_nombre}
                              </span>
                            )}
                            {msg.prioridad !== "Normal" && (
                              <span className="text-xs flex-shrink-0">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">{msg.mensaje}</p>

                          {msg.poll && (
                            <div className="mt-3">
                              <PollMessage 
                                poll={msg.poll} 
                                onVote={(msgId, optIdx) => voteOnPollMutation.mutate({ messageId: msgId, optionIndex: optIdx })}
                                userEmail={user.email}
                                messageId={msg.id}
                              />
                            </div>
                          )}

                          {msg.archivos_adjuntos?.length > 0 && (
                            <div className="mt-2">
                              <MessageAttachments attachments={msg.archivos_adjuntos} />
                            </div>
                          )}
                          
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className={`text-[10px] ${isAdmin ? 'text-green-100' : isJugador ? 'text-blue-100' : 'text-slate-500'}`}>
                              {format(new Date(msg.created_date), "HH:mm")}
                            </span>
                            {msg._isOptimistic && <span className="text-[10px] text-green-200" title="Enviando...">⏳</span>}
                            {isAdmin && !msg._isOptimistic && (
                              <span className="ml-1" title={readStatus === "read" ? "Leído" : "Entregado"}>
                                {readStatus === "read" ? (
                                  <CheckCheck className="w-3 h-3 text-cyan-300" />
                                ) : (
                                  <Check className="w-3 h-3 text-green-200" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t p-3 flex-shrink-0">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((att, index) => (
                  <div key={index} className="bg-slate-100 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                    <span className="text-xs truncate max-w-[150px]">{att.nombre}</span>
                    <button onClick={() => handleRemoveAttachment(index)} className="text-slate-500 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-2">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">📝 Normal</SelectItem>
                  <SelectItem value="Importante">⚠️ Importante</SelectItem>
                  <SelectItem value="Urgente">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
              
              {!sendToAll && selectedGroup && (
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">👥 Todos del grupo</SelectItem>
                    {getGroupParents().map(parent => (
                      <SelectItem key={parent.email} value={parent.email}>
                        👤 {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2 items-end">
              <FileAttachmentButton
                onFileUploaded={handleFileUploaded}
                disabled={sendMessageMutation.isPending}
              />
              
              <Button
                onClick={() => setShowPollDialog(true)}
                disabled={!isBusinessHours()}
                variant="ghost"
                size="icon"
                className="text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                title="Crear encuesta rápida"
              >
                📊
              </Button>
              
              <Input
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 rounded-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              <Button
                onClick={handleSendMessage}
                disabled={(!messageContent.trim() && attachments.length === 0) || isSending}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar Desktop */}
          <div className="w-80 border-l bg-slate-50 flex-col overflow-hidden flex">
          <div className="p-4 bg-white border-b">
            <h3 className="font-bold text-slate-900">Chats</h3>
            <p className="text-xs text-slate-600 mt-1">{filteredGroups.length} grupos disponibles</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <button
              onClick={() => handleSelectGroup(null, true)}
              className={`w-full p-4 flex items-center gap-3 border-b transition-all text-left ${
                sendToAll
                  ? 'bg-green-100 border-l-4 border-l-green-600'
                  : 'bg-white hover:bg-slate-100 border-l-4 border-l-transparent'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                sendToAll ? 'bg-green-600' : 'bg-slate-200'
              }`}>
                <span className="text-xl">📢</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">Todos los Grupos</div>
                <div className="text-xs text-slate-600 truncate">
                  Anuncio general
                </div>
              </div>
            </button>
            {filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => handleSelectGroup(group.id, false)}
                className={`w-full p-4 flex items-center gap-3 border-b transition-all text-left ${
                  selectedGroup === group.id && !sendToAll
                    ? 'bg-orange-100 border-l-4 border-l-orange-600'
                    : 'bg-white hover:bg-slate-100 border-l-4 border-l-transparent'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedGroup === group.id && !sendToAll ? 'bg-orange-600' : 'bg-slate-200'
                }`}>
                  <span className="text-xl">{sportEmojis[group.deporte]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{group.deporte}</div>
                  <div className="text-xs text-slate-600 truncate">
                    {group.messages.length} mensajes • {group.players.length} jugadores
                  </div>
                </div>
                {group.unreadCount > 0 && (
                  <Badge className={`${
                    group.urgentCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-orange-600'
                  } text-white text-xs h-6 min-w-6 rounded-full flex items-center justify-center`}>
                    {group.unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
        </div>
      )}

      {/* MÓVIL: Chat a pantalla completa */}
      {isMobile && (selectedGroup || sendToAll) && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`p-4 text-white flex items-center gap-3 shadow-md flex-shrink-0 ${
            sendToAll ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-orange-600 to-orange-700'
          }`}>
            <button
              onClick={() => {
                setSelectedGroup(null);
                setSendToAll(false);
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors -ml-1"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              {sendToAll ? <Users className="w-6 h-6" /> : <span className="text-2xl">{sportEmojis[currentGroup?.deporte]}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">
                {sendToAll ? '📢 Todos' : currentGroup?.deporte}
              </h2>
              <p className="text-xs opacity-90 truncate">
                {sendToAll ? `${Object.keys(groups).length} grupos` : `${currentGroup?.players.length || 0} jugadores`}
              </p>
            </div>
          </div>

          {sendToAll && (
            <div className="px-4 pt-3 pb-2 flex-shrink-0 bg-slate-50">
              <Alert className="bg-blue-50 border-blue-300">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  Tu mensaje se enviará a todos los grupos del club.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: '#e5ddd5'
            }}
          >
            {sendToAll ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500 bg-white/80 rounded-xl p-6">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Escribe tu anuncio abajo</p>
                </div>
              </div>
            ) : currentGroup?.messages.length === 0 && optimisticMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500 bg-white/80 rounded-xl p-6">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay mensajes</p>
                </div>
              </div>
            ) : (
              [...(currentGroup?.messages || []), ...optimisticMessages]
                .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                .map((msg) => {
                  const readStatus = getReadStatus(msg);
                  const isJugador = msg.tipo === "jugador_a_equipo";
                  const isPadre = msg.tipo === "padre_a_grupo";
                  const isAdmin = msg.tipo === "admin_a_grupo";
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-2 px-1`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl shadow-md overflow-hidden ${
                          isAdmin
                            ? 'bg-gradient-to-r from-green-600 to-green-700 text-white rounded-br-sm'
                            : isJugador
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-bl-sm'
                            : 'bg-white text-slate-900 rounded-bl-sm'
                        } ${msg._isOptimistic ? 'opacity-70' : ''}`}
                      >
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-bold truncate ${
                              isAdmin ? 'text-green-100' : isJugador ? 'text-blue-100' : 'text-orange-700'
                            }`}>
                              {isAdmin ? '🎓 ' : isJugador ? '⚽ ' : '👨‍👩‍👧 '}{msg.remitente_nombre}
                            </span>
                            {msg.destinatario_nombre && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                                isAdmin ? 'bg-green-800 text-green-100' : 'bg-slate-200 text-slate-700'
                              }`}>
                                → {msg.destinatario_nombre}
                              </span>
                            )}
                            {msg.prioridad !== "Normal" && (
                              <span className="text-xs flex-shrink-0">{msg.prioridad === "Urgente" ? "🔴" : "⚠️"}</span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed break-words">{msg.mensaje}</p>

                          {msg.poll && (
                            <div className="mt-3">
                              <PollMessage 
                                poll={msg.poll} 
                                onVote={(msgId, optIdx) => voteOnPollMutation.mutate({ messageId: msgId, optionIndex: optIdx })}
                                userEmail={user.email}
                                messageId={msg.id}
                              />
                            </div>
                          )}

                          {msg.archivos_adjuntos?.length > 0 && (
                            <div className="mt-2">
                              <MessageAttachments attachments={msg.archivos_adjuntos} />
                            </div>
                          )}
                          
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className={`text-[10px] ${isAdmin ? 'text-green-100' : isJugador ? 'text-blue-100' : 'text-slate-500'}`}>
                              {format(new Date(msg.created_date), "HH:mm")}
                            </span>
                            {msg._isOptimistic && <span className="text-[10px] text-green-200" title="Enviando...">⏳</span>}
                            {isAdmin && !msg._isOptimistic && (
                              <span className="ml-1" title={readStatus === "read" ? "Leído" : "Entregado"}>
                                {readStatus === "read" ? (
                                  <CheckCheck className="w-3 h-3 text-cyan-300" />
                                ) : (
                                  <Check className="w-3 h-3 text-green-200" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t p-3 flex-shrink-0 safe-area-bottom">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((att, index) => (
                  <div key={index} className="bg-slate-100 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                    <span className="text-xs truncate max-w-[150px]">{att.nombre}</span>
                    <button onClick={() => handleRemoveAttachment(index)} className="text-slate-500 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-2">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">📝 Normal</SelectItem>
                  <SelectItem value="Importante">⚠️ Importante</SelectItem>
                  <SelectItem value="Urgente">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
              
              {!sendToAll && selectedGroup && (
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">👥 Todos</SelectItem>
                    {getGroupParents().map(parent => (
                      <SelectItem key={parent.email} value={parent.email}>
                        👤 {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2 items-end">
              <FileAttachmentButton
                onFileUploaded={handleFileUploaded}
                disabled={sendMessageMutation.isPending}
              />
              
              <Button
                onClick={() => setShowPollDialog(true)}
                disabled={!isBusinessHours()}
                variant="ghost"
                size="icon"
                className="text-slate-600 hover:text-orange-600 hover:bg-orange-50 flex-shrink-0"
                title="Crear encuesta rápida"
              >
                📊
              </Button>
              
              <Input
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 rounded-full text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              <Button
                onClick={handleSendMessage}
                disabled={(!messageContent.trim() && attachments.length === 0) || isSending}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-lg flex-shrink-0"
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      </>
        )}
      </div>
    </>
  );
}