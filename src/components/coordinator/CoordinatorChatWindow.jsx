import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function CoordinatorChatWindow({ conversation, user, onClose }) {
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['coordinatorMessages', conversation.id],
    queryFn: () => base44.entities.CoordinatorMessage.filter({ conversacion_id: conversation.id }, 'created_date'),
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Marcar como leído cuando abre la conversación
  useEffect(() => {
    const markAsRead = async () => {
      if (conversation.no_leidos_coordinador > 0) {
        // Marcar conversación como leída
        await base44.entities.CoordinatorConversation.update(conversation.id, {
          no_leidos_coordinador: 0
        });

        // Marcar mensajes individuales como leídos
        const unreadMessages = messages.filter(m => m.autor === "padre" && !m.leido_coordinador);
        for (const msg of unreadMessages) {
          await base44.entities.CoordinatorMessage.update(msg.id, {
            leido_coordinador: true,
            fecha_leido_coordinador: new Date().toISOString()
          });
        }

        queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
        queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      }
    };
    markAsRead();
  }, [conversation.id, conversation.no_leidos_coordinador, messages]);

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

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const newMessage = await base44.entities.CoordinatorMessage.create({
        conversacion_id: conversation.id,
        autor: "coordinador",
        autor_email: user.email,
        autor_nombre: user.full_name || "Coordinador",
        mensaje: data.mensaje,
        adjuntos: data.adjuntos,
        leido_coordinador: true,
        leido_padre: false,
        fecha_leido_coordinador: new Date().toISOString()
      });

      // Actualizar conversación
      await base44.entities.CoordinatorConversation.update(conversation.id, {
        ultimo_mensaje: data.mensaje,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: "coordinador",
        no_leidos_padre: (conversation.no_leidos_padre || 0) + 1,
        archivada: false // Desarchivar si estaba archivada
      });

      // Enviar notificación push al padre
      await base44.entities.AppNotification.create({
        usuario_email: conversation.padre_email,
        titulo: "💬 Mensaje del Coordinador",
        mensaje: data.mensaje.substring(0, 100),
        tipo: "coordinador_chat",
        icono: "💬",
        enlace: "ParentCoordinatorChat",
        vista: false
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorMessages', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
      setMessageText("");
      setAttachments([]);
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ mensaje: messageText, adjuntos: attachments });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-white border-b flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900">{conversation.padre_nombre}</h2>
          <p className="text-sm text-slate-500">
            {conversation.jugadores_asociados?.map(j => `${j.jugador_nombre} (${j.categoria})`).join(', ')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((msg) => {
          const isCoordinator = msg.autor === "coordinador";
          return (
            <div key={msg.id} className={`flex ${isCoordinator ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isCoordinator ? 'bg-cyan-600 text-white' : 'bg-white text-slate-900'} rounded-2xl p-3 shadow-sm`}>
                <p className="text-xs font-semibold mb-1 opacity-70">{msg.autor_nombre}</p>
                <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                {msg.adjuntos?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.adjuntos.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-xs p-2 rounded ${isCoordinator ? 'bg-cyan-700' : 'bg-slate-100'}`}
                      >
                        <FileText className="w-3 h-3" />
                        <span className="flex-1 truncate">{file.nombre}</span>
                        <Download className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
                <p className="text-xs mt-1 opacity-60">
                  {format(new Date(msg.created_date), "HH:mm", { locale: es })}
                  {isCoordinator && msg.leido_padre && " · Visto"}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div key={idx} className="bg-slate-100 rounded px-2 py-1 text-xs flex items-center gap-2">
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{file.nombre}</span>
                <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
            <Button type="button" variant="outline" size="icon" disabled={uploading}>
              <Paperclip className="w-4 h-4" />
            </Button>
          </label>
          <Textarea
            placeholder="Escribe un mensaje..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1"
            rows={2}
          />
          <Button onClick={handleSend} disabled={!messageText.trim() && attachments.length === 0}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}