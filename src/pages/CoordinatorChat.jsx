import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Search, Archive, ArchiveRestore, Users, Filter, Star, Settings, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import CoordinatorChatWindow from "../components/coordinator/CoordinatorChatWindow";
import SocialLinks from "../components/SocialLinks";
import CoordinatorAwayMode from "../components/coordinator/CoordinatorAwayMode";
import { UnifiedChatNotificationStore } from "../components/notifications/UnifiedChatNotificationStore";

export default function CoordinatorChat({ embedded = false }) {
  const navigate = useNavigate();
   const [user, setUser] = useState(null);
   const [isCoordinator, setIsCoordinator] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    if (userLoaded) return;
    
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsCoordinator(currentUser.es_coordinador === true || currentUser.role === "admin");
        setUserLoaded(true);
      } catch (error) {
        console.error("Error loading user:", error);
        setUserLoaded(true);
      }
    };
    fetchUser();
  }, [userLoaded]);

  const { data: conversations = [] } = useQuery({
    queryKey: ['coordinatorConversations'],
    queryFn: async () => {
      return await base44.entities.CoordinatorConversation.list('-ultimo_mensaje_fecha');
    },
    enabled: isCoordinator,
    refetchInterval: false,
    staleTime: 60000,
  });

  // REAL-TIME: Suscripción a conversaciones
  useEffect(() => {
    if (!isCoordinator) return;
    
    const unsub = base44.entities.CoordinatorConversation.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
    });
    
    return unsub;
  }, [isCoordinator, queryClient]);

  // ✅ CRÍTICO: Marcar como leído AL ENTRAR en conversación - Persiste en BD con last_read_at
  useEffect(() => {
    if (!selectedConversation?.id || !user?.email) return;

    // ENTRAR: marca como leído Y decrementa badge
    (async () => {
      try {
        // 1. Decrementar badge en memoria
        const unreadInThisConv = selectedConversation.no_leidos_coordinador || 0;
        if (unreadInThisConv > 0) {
          for (let i = 0; i < unreadInThisConv; i++) {
            UnifiedChatNotificationStore.decrement(user.email, 'coordinator');
          }
          console.log(`✅ [CoordinatorChat] Badge decrementado x${unreadInThisConv} al ENTRAR`);
        }

        // 2. Actualizar BD: guardar last_read_at (NO poner no_leidos a 0)
        await base44.entities.CoordinatorConversation.update(selectedConversation.id, {
          last_read_coordinador_at: new Date().toISOString()
        });

        // 3. Marcar AppNotifications como vistas
        const notifs = await base44.entities.AppNotification.filter({
          usuario_email: user.email,
          enlace: "CoordinatorChat",
          vista: false
        });
        for (const n of notifs) {
          await base44.entities.AppNotification.update(n.id, { vista: true, fecha_vista: new Date().toISOString() });
        }

        await base44.functions.invoke('chatMarkRead', { chatType: 'coordinator', conversationId: selectedConversation.id });
      } catch (err) {
        console.error('Error marking as read on enter:', err);
      }
    })();
  }, [selectedConversation?.id, user?.email]);

  const archiveMutation = useMutation({
    mutationFn: ({ id, archivada }) => 
      base44.entities.CoordinatorConversation.update(id, { 
        archivada,
        fecha_archivado: archivada ? new Date().toISOString() : null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorConversations'] });
    },
  });

  if (!isCoordinator) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo el coordinador puede acceder a esta sección</p>
      </div>
    );
  }

  const activeConversations = conversations.filter(c => !c.archivada);
  const archivedConversations = conversations.filter(c => c.archivada);

  const filteredActive = activeConversations.filter(conv => {
    const matchesSearch = conv.padre_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.jugadores_asociados?.some(j => j.jugador_nombre.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || 
      conv.jugadores_asociados?.some(j => j.categoria === categoryFilter);

    const matchesLabel = labelFilter === "all" || conv.etiqueta === labelFilter;

    return matchesSearch && matchesCategory && matchesLabel;
  });

  const categories = [...new Set(
    conversations.flatMap(c => c.jugadores_asociados?.map(j => j.categoria) || [])
  )].sort();

  const totalUnread = activeConversations.reduce((sum, c) => sum + (c.no_leidos_coordinador || 0), 0);



   return (
       <div className="fixed inset-0 lg:inset-auto lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:bottom-0 flex flex-col lg:flex-row overflow-hidden pt-[100px] lg:pt-0">
      {/* Modal de configuración */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">⚙️ Configuración Chat Coordinador</h2>
              <Button variant="ghost" onClick={() => setShowSettings(false)}>✕</Button>
            </div>
            {user && <CoordinatorAwayMode user={user} />}
          </div>
        </div>
      )}
      
      {/* Lista de conversaciones */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r bg-slate-50 min-h-0 flex-col h-full overflow-y-auto`}>
        <div className="p-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-sm font-bold flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="text-white hover:bg-white/20 h-7 w-7 p-0"
                  title="Volver atrás"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <MessageCircle className="w-4 h-4" />
                Chat Coordinador
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-white hover:bg-white/20 h-7 w-7 p-0"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 bg-white h-8 text-xs"
            />
          </div>
        </div>

        <Tabs defaultValue="active" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-3">
            <TabsTrigger value="active" className="flex-1">
              Activas ({filteredActive.length})
              {totalUnread > 0 && (
                <Badge className="ml-2 bg-red-500">{totalUnread}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex-1">
              Archivadas ({archivedConversations.length})
            </TabsTrigger>
          </TabsList>

          <div className="px-4 py-2 space-y-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Select value={labelFilter} onValueChange={setLabelFilter}>
              <SelectTrigger className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las etiquetas</SelectItem>
                <SelectItem value="Horarios">Horarios</SelectItem>
                <SelectItem value="Quejas">Quejas</SelectItem>
                <SelectItem value="Consulta Partido">Consulta Partido</SelectItem>
                <SelectItem value="Equipación">Equipación</SelectItem>
                <SelectItem value="Transporte">Transporte</SelectItem>
                <SelectItem value="Lesiones">Lesiones</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeConversations.some(c => (c.no_leidos_coordinador || 0) > 0) && (
            <div className="px-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs flex flex-wrap gap-2">
                <span className="text-yellow-800 font-semibold mr-1">🔔 Nuevos mensajes:</span>
                {activeConversations.filter(c => (c.no_leidos_coordinador || 0) > 0).map(c => (
                  <button key={c.id} onClick={() => setSelectedConversation(c)} className="bg-yellow-200 border border-yellow-400 rounded-full px-2 py-0.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-300 transition-colors whitespace-nowrap">
                    {c.padre_nombre}
                    <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1 py-0 h-4 animate-pulse">{c.no_leidos_coordinador}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

           <TabsContent value="active" className="flex-1 overflow-y-auto px-2">
            {filteredActive.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No hay conversaciones</p>
              </div>
            ) : (
              filteredActive.map(conv => (
                <Card
                  key={conv.id}
                  className={`mb-2 cursor-pointer hover:shadow-md transition-all ${
                    selectedConversation?.id === conv.id ? 'ring-2 ring-cyan-500' : ''
                  } ${conv.escalada_desde_entrenador ? 'border-l-4 border-orange-500' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 flex-wrap">
                           <p className="font-bold text-sm text-slate-900 truncate">{conv.padre_nombre}</p>
                           {conv.escalada_desde_entrenador && (
                             <Badge className="bg-orange-100 text-orange-700 text-xs flex-shrink-0">
                               ⚽ Escalada
                             </Badge>
                           )}
                           {conv.prioritaria && <Star className="w-3 h-3 text-orange-500 fill-orange-500 flex-shrink-0" />}
                         </div>
                         <div className="flex items-center gap-2 flex-wrap mt-0.5">
                           {conv.etiqueta && <Badge variant="outline" className="text-xs flex-shrink-0">{conv.etiqueta}</Badge>}
                           <p className="text-xs text-slate-500 truncate">
                             {conv.jugadores_asociados?.map(j => `${j.jugador_nombre} (${j.categoria})`).join(', ')}
                           </p>
                         </div>
                         {conv.escalada_desde_entrenador && (
                           <p className="text-xs text-orange-600 mt-1">
                             Escalado por {conv.entrenador_nombre_que_escalo || 'Entrenador'}
                           </p>
                         )}
                       </div>
                       {conv.no_leidos_coordinador > 0 && (
                         <Badge className="bg-red-500 text-white font-bold text-xs flex-shrink-0 px-2 py-1 rounded-full min-w-6 text-center">{conv.no_leidos_coordinador}</Badge>
                       )}
                    </div>
                    <p className="text-xs text-slate-600 truncate">{conv.ultimo_mensaje}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-400">
                        {conv.ultimo_mensaje_fecha && format(new Date(conv.ultimo_mensaje_fecha), "dd MMM, HH:mm", { locale: es })}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveMutation.mutate({ id: conv.id, archivada: true });
                        }}
                      >
                        <Archive className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="archived" className="flex-1 overflow-y-auto px-2">
            {archivedConversations.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No hay conversaciones archivadas</p>
              </div>
            ) : (
              archivedConversations.map(conv => (
                <Card key={conv.id} className="mb-2 opacity-60">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="font-bold text-sm text-slate-900">{conv.padre_nombre}</p>
                        <p className="text-xs text-slate-500">
                          {conv.jugadores_asociados?.map(j => j.jugador_nombre).join(', ')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => archiveMutation.mutate({ id: conv.id, archivada: false })}
                      >
                        <ArchiveRestore className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{conv.ultimo_mensaje}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Ventana de chat */}
      <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 min-h-0 h-full overflow-hidden`}>
        {selectedConversation ? (
          <CoordinatorChatWindow
            conversation={selectedConversation}
            user={user}
            onClose={() => setSelectedConversation(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Selecciona una conversación para empezar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}