import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, FileText, Download, MessageCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ParentCoordinatorChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);
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

      // Buscar o crear conversación
      const conversations = await base44.entities.CoordinatorConversation.filter({ 
        padre_email: currentUser.email 
      });

      if (conversations.length > 0) {
        setConversation(conversations[0]);
      } else {
        // Crear conversación nueva
        const newConv = await base44.entities.CoordinatorConversation.create({
          padre_email: currentUser.email,
          padre_nombre: currentUser.full_name,
          jugadores_asociados: players.map(p => ({
            jugador_id: p.id,
            jugador_nombre: p.nombre,
            categoria: p.deporte
          })),
          no_leidos_coordinador: 0,
          no_leidos_padre: 0,
          archivada: false
        });
        setConversation(newConv);
      }
    };
    fetchUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['parentCoordinatorMessages', conversation?.id],
    queryFn: () => base44.entities.CoordinatorMessage.filter({ conversacion_id: conversation.id }, 'created_date'),
    enabled: !!conversation,
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Marcar como leído cuando abre el chat
  useEffect(() => {
    if (!conversation) return;

    const markAsRead = async () => {
      if (conversation.no_leidos_padre > 0) {
        await base44.entities.CoordinatorConversation.update(conversation.id, {
          no_leidos_padre: 0
        });

        const unreadMessages = messages.filter(m => m.autor === "coordinador" && !m.leido_padre);
        for (const msg of unreadMessages) {
          await base44.entities.CoordinatorMessage.update(msg.id, {
            leido_padre: true,
            fecha_leido_padre: new Date().toISOString()
          });
        }

        queryClient.invalidateQueries({ queryKey: ['parentCoordinatorMessages', conversation.id] });
      }
    };
    markAsRead();
  }, [conversation, messages]);

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
        autor: "padre",
        autor_email: user.email,
        autor_nombre: user.full_name,
        mensaje: data.mensaje,
        adjuntos: data.adjuntos,
        leido_padre: true,
        leido_coordinador: false,
        fecha_leido_padre: new Date().toISOString()
      });

      await base44.entities.CoordinatorConversation.update(conversation.id, {
        ultimo_mensaje: data.mensaje,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: "padre",
        no_leidos_coordinador: (conversation.no_leidos_coordinador || 0) + 1,
        archivada: false
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parentCoordinatorMessages', conversation.id] });
      setMessageText("");
      setAttachments([]);
      toast.success("Mensaje enviado al coordinador");
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ mensaje: messageText, adjuntos: attachments });
  };

  if (!conversation) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <Card className="border-cyan-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Chat con el Coordinador
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Alert className="m-4 bg-cyan-50 border-cyan-200">
            <MessageCircle className="w-4 h-4 text-cyan-600" />
            <AlertDescription className="text-cyan-800 text-xs">
              <strong>💬 Chat con el Coordinador:</strong> Partidos, horarios, equipos, quejas o sugerencias
            </AlertDescription>
          </Alert>

          {/* Mensajes */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">¡Inicia la conversación con el coordinador!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isPadre = msg.autor === "padre";
                return (
                  <div key={msg.id} className={`flex ${isPadre ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isPadre ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border'} rounded-2xl p-3 shadow-sm`}>
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
                              className={`flex items-center gap-2 text-xs p-2 rounded ${isPadre ? 'bg-slate-700' : 'bg-slate-100'}`}
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
                        {isPadre && msg.leido_coordinador && " · Visto"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
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
                placeholder="Escribe tu mensaje..."
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
              <Button onClick={handleSend} disabled={!messageText.trim() && attachments.length === 0} className="bg-cyan-600 hover:bg-cyan-700">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}