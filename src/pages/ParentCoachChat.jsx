import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Users, Search, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function ParentCoachChat() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef(null);
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
      
      return allMessages.filter(msg => 
        !msg.destinatario_email || 
        msg.destinatario_email === user.email
      );
    },
    refetchInterval: 3000,
    enabled: !!selectedCategory && !!user,
  });

  const filteredMessages = searchTerm 
    ? messages.filter(m => m.mensaje?.toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (mensaje) => {
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      await base44.entities.ChatMessage.create({
        grupo_id,
        deporte: selectedCategory,
        tipo: "padre_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        mensaje: mensaje,
        archivos_adjuntos: [],
        prioridad: "Normal",
        leido: false
      });

      // Notificar al entrenador de esta categoría
      const allUsers = await base44.entities.User.list();
      const coaches = allUsers.filter(u => 
        (u.es_entrenador === true || u.role === "admin") &&
        (u.role === "admin" || u.categorias_entrena?.includes(selectedCategory))
      );
      
      for (const coach of coaches) {
        await base44.entities.AppNotification.create({
          usuario_email: coach.email,
          titulo: `⚽ Nuevo mensaje en ${selectedCategory}`,
          mensaje: `${user.full_name}: ${mensaje.substring(0, 100)}${mensaje.length > 100 ? '...' : ''}`,
          tipo: "importante",
          icono: "⚽",
          enlace: "CoachParentChat",
          vista: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages'] });
      setMessageText("");
      toast.success("Mensaje enviado");
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-slate-500 text-sm">Cargando chat...</p>
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
    <div className="h-[calc(100vh-100px)] lg:p-4 lg:max-w-5xl lg:mx-auto lg:h-[calc(100vh-110px)]">
      <Card className="border-blue-200 shadow-lg h-full flex flex-col overflow-hidden lg:rounded-lg rounded-none">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              Chat Entrenador
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className="text-white hover:bg-white/20"
            >
              <Search className="w-4 h-4" />
            </Button>
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
          {categories.length > 1 && (
            <div className="flex gap-2 p-2 bg-slate-50 border-b overflow-x-auto">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="whitespace-nowrap"
                >
                  {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                </Button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">
                  {searchTerm ? "No se encontraron mensajes" : "Aún no hay mensajes"}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, idx) => {
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
                      <div className={`max-w-[75%] ${
                        isMine ? 'bg-slate-700 text-white' : 
                        isCoach ? 'bg-green-600 text-white' : 
                        'bg-white text-slate-900 border'
                      } rounded-2xl p-3 shadow-sm`}>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-semibold opacity-70">
                            {isCoach ? '🏃 ' : ''}{msg.remitente_nombre}
                          </p>
                          {isCoach && <Badge className="text-xs bg-green-500 px-1 py-0">Entrenador</Badge>}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>
                        <p className="text-xs opacity-60 mt-1">
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

          <div className="p-4 bg-white border-t flex-shrink-0">
            <div className="flex gap-2 items-end">
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
                className="flex-1 min-h-[44px] resize-none text-sm"
                rows={1}
              />
              <Button 
                onClick={handleSend} 
                disabled={!messageText.trim()} 
                className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}