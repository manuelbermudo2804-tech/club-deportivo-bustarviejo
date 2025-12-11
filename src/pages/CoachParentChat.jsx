import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, MessageCircle, Search, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function CoachParentChat() {
  const [user, setUser] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const categories = currentUser.role === "admin" 
        ? ["Todas las categorías"]
        : (currentUser.categorias_entrena || []);
      
      if (categories.length > 0 && !selectedCategory) {
        setSelectedCategory(categories[0]);
      }
    };
    fetchUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['coachGroupMessages', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      
      if (selectedCategory === "Todas las categorías") {
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

  const filteredMessages = searchTerm 
    ? messages.filter(m => m.mensaje?.toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
        archivos_adjuntos: [],
        prioridad: "Normal",
        leido: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachGroupMessages', selectedCategory] });
      setMessageText("");
      toast.success("Mensaje enviado a toda la categoría");
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate({ mensaje: messageText });
  };

  if (!user) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const isCoach = user?.es_entrenador === true || user?.role === "admin";

  if (!isCoach) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo entrenadores pueden acceder a esta sección</p>
      </div>
    );
  }

  const categories = user?.role === "admin" 
    ? ["Todas las categorías", ...new Set(allPlayers.map(p => p.deporte).filter(Boolean))]
    : (user?.categorias_entrena || []);

  if (categories.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No tienes categorías asignadas. Contacta con el administrador.</p>
      </div>
    );
  }

  const categoryPlayers = selectedCategory === "Todas las categorías" 
    ? allPlayers 
    : allPlayers.filter(p => p.deporte === selectedCategory);

  const parentEmails = [...new Set(categoryPlayers.flatMap(p => 
    [p.email_padre, p.email_tutor_2].filter(Boolean)
  ))];

  return (
    <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-110px)] flex flex-col lg:flex-row">
      {/* Lista de categorías */}
      <div className={`${selectedCategory ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r bg-slate-50 flex-col h-full overflow-hidden`}>
        <div className="p-4 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                Chat con Familias
              </h1>
              <p className="text-xs text-green-100">
                Comunicación grupal con los padres de tu categoría
              </p>
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
            </div>
          </div>
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar mensajes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 px-3 py-2 rounded-lg text-slate-900 text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {categories.map(cat => {
            const catPlayers = allPlayers.filter(p => p.deporte === cat);
            const parentCount = [...new Set(catPlayers.flatMap(p => 
              [p.email_padre, p.email_tutor_2].filter(Boolean)
            ))].length;

            return (
              <Card
                key={cat}
                className={`mb-2 cursor-pointer hover:shadow-md transition-all ${
                  selectedCategory === cat ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3" />
                        {parentCount} familias · {catPlayers.length} jugadores
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Ventana de chat */}
      <div className={`${selectedCategory ? 'flex' : 'hidden lg:flex'} flex-1 h-full`}>
        {selectedCategory ? (
          <Card className="border-blue-200 shadow-lg h-full flex flex-col overflow-hidden w-full rounded-none lg:rounded-lg">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="lg:hidden mr-2 hover:bg-white/20 rounded p-1"
                >
                  ←
                </button>
                {selectedCategory?.replace('Fútbol ', '').replace(' (Mixto)', '')}
              </CardTitle>
              <p className="text-xs text-green-100 mt-1">
                {parentEmails.length} familias
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowParticipants(!showParticipants)}
              className="text-white hover:bg-white/20"
            >
              <Users className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
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
                        new Date(filteredMessages[idx - 1]?.created_date || 0).toDateString() !== 
                        new Date(msg.created_date).toDateString();
                      const dateLabel = new Date(msg.created_date).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      });

                      const isMine = msg.remitente_email === user?.email;
                      const isCoachMsg = msg.tipo === "entrenador_a_grupo";

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
                              isMine ? 'bg-green-600 text-white' : 
                              isCoachMsg ? 'bg-green-600 text-white' : 
                              'bg-slate-200 text-slate-900'
                            } rounded-2xl p-3 shadow-sm`}>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-semibold opacity-70">
                                  {isCoachMsg && !isMine ? '🏃 ' : ''}{msg.remitente_nombre}
                                </p>
                                {isCoachMsg && <Badge className="text-xs bg-green-500 px-1 py-0">Entrenador</Badge>}
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
                      className="bg-green-600 hover:bg-green-700 h-10 w-10 p-0"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
        </CardContent>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Selecciona una categoría para empezar</p>
            </div>
          </div>
        )}
      </div>
    </div>

      {showParticipants && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowParticipants(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">👥 Participantes - {selectedCategory}</h3>
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                <p className="text-sm font-bold text-green-900">🏃 Entrenador</p>
                <p className="text-xs text-green-700 mt-1">{user?.full_name}</p>
              </div>
              
              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">👨‍👩‍👧 Familias ({parentEmails.length})</p>
                <div className="space-y-2">
                  {categoryPlayers.map((player, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-3 border">
                      <p className="text-sm font-medium text-slate-900">{player.nombre}</p>
                      <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                        {player.email_padre && <p>📧 {player.email_padre}</p>}
                        {player.email_tutor_2 && <p>📧 {player.email_tutor_2}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}