import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Search, Archive, ArchiveRestore, Users, Filter, Star, AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import CoordinatorChatWindow from "../components/coordinator/CoordinatorChatWindow";

export default function AdminCoordinatorChats() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [withAdminOnly, setWithAdminOnly] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [userLoaded, setUserLoaded] = useState(false);
  
  const queryClient = useQueryClient();

  const [isCoordinator, setIsCoordinator] = useState(false);

  useEffect(() => {
    if (userLoaded) return;
    
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        setIsCoordinator(currentUser.es_coordinador === true);
        setUserLoaded(true);
      } catch (error) {
        console.error("Error loading user:", error);
        setUserLoaded(true);
      }
    };
    fetchUser();
  }, [userLoaded]);

  const canAccess = isAdmin || isCoordinator;

  const { data: conversations = [] } = useQuery({
    queryKey: ['adminCoordinatorConversations'],
    queryFn: async () => {
      return await base44.entities.CoordinatorConversation.filter({}, '-ultimo_mensaje_fecha', 200);
    },
    enabled: canAccess,
    refetchInterval: false,
    staleTime: 60000,
  });

  // Conversaciones ADMIN abiertas desde escaladas del coordinador
  const { data: adminConversations = [] } = useQuery({
    queryKey: ['adminConversationsFromCoordinator'],
    queryFn: async () => {
      return await base44.entities.AdminConversation.filter({ escalada_desde_coordinador: true, resuelta: false }, '-ultimo_mensaje_fecha', 200);
    },
    enabled: canAccess,
    refetchInterval: false,
    staleTime: 60000,
  });

  // REAL-TIME: Suscripción a conversaciones
  useEffect(() => {
    if (!canAccess) return;
    
    const unsub = base44.entities.CoordinatorConversation.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['adminCoordinatorConversations'] });
    });
    
    return unsub;
  }, [canAccess, queryClient]);

  // REAL-TIME: Suscripción a AdminConversation
  useEffect(() => {
    if (!canAccess) return;
    const unsub = base44.entities.AdminConversation.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['adminConversationsFromCoordinator'] });
    });
    return unsub;
  }, [canAccess, queryClient]);

  // Marcar como leído AL ABRIR conversación - DESACTIVADO (sistema nuevo)
  useEffect(() => {
    if (!selectedConversation?.id || !user) return;
    
    // TODO: Implementar nuevo sistema de last_read_at
  }, [selectedConversation?.id, user?.email]);

  const openAdminChatMutation = useMutation({
    mutationFn: async (conv) => {
      const existing = await base44.entities.AdminConversation.list();
      const active = existing.find(c => c.padre_email === conv.padre_email && !c.resuelta);
      if (active) return active;

      const contexto = conv.contexto_escalacion_admin || conv.contexto_escalacion || '';
      const motivo = conv.motivo_escalacion_admin || conv.etiqueta || 'Escalada';
      const newConv = await base44.entities.AdminConversation.create({
        padre_email: conv.padre_email,
        padre_nombre: conv.padre_nombre,
        jugadores_asociados: conv.jugadores_asociados,
        escalada_desde_coordinador: true,
        coordinador_que_escalo: user.email,
        coordinador_nombre_que_escalo: user.full_name,
        fecha_escalacion: new Date().toISOString(),
        contexto_escalacion: contexto,
        motivo_escalacion: motivo,
        ultimo_mensaje: "Conversación creada por Admin",
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: "admin",
        no_leidos_admin: 0,
        no_leidos_padre: 1,
        criticidad: "Alta",
        etiqueta: "Escalada"
      });

      const mensajeInicial = `🛡️ ADMIN ↔ PADRE\n\nPadre: ${conv.padre_nombre}\nJugadores: ${conv.jugadores_asociados?.map(j => `${j.jugador_nombre} (${j.categoria})`).join(', ')}\nFecha: ${new Date().toLocaleString('es-ES')}\n\n⚠️ Motivo: ${motivo}\n\n📎 Contexto:\n${contexto || 'Sin contexto'}`;

      await base44.entities.AdminMessage.create({
        conversacion_id: newConv.id,
        autor: "admin",
        autor_email: user.email,
        autor_nombre: user.full_name,
        mensaje: mensajeInicial,
        leido_admin: true,
        leido_padre: false,
        es_nota_interna: true
      });

      try {
        await base44.entities.AppNotification.create({
          usuario_email: conv.padre_email,
          titulo: "📣 Administración contactará contigo",
          mensaje: "Un administrador abrirá un chat directo en breve.",
          tipo: "importante",
          icono: "📣",
          enlace: "ParentDirectMessages",
          vista: false
        });
      } catch {}

      return newConv;
    },
    onSuccess: (newConv) => {
      const url = createPageUrl('AdminChat') + `?convId=${newConv.id}`;
      window.location.href = url;
    }
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archivada }) => 
      base44.entities.CoordinatorConversation.update(id, { 
        archivada,
        fecha_archivado: archivada ? new Date().toISOString() : null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCoordinatorConversations'] });
    },
  });

  if (!canAccess) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo administradores y coordinadores pueden acceder a esta sección</p>
      </div>
    );
  }

  // Separar conversaciones según rol:
  // - Coordinador: ve SOLO las escaladas por entrenadores (CoordinatorConversation con escalada_desde_entrenador)
  // - Admin: ve SOLO las escaladas por coordinador (AdminConversation) - NO ve las de entrenadores
  const parentsWithAdminChats = new Set((adminConversations || []).filter(ac => ac.resuelta === false).map(ac => ac.padre_email));
  const escalatedConversations = isAdmin
    ? [] // Admin NO ve escaladas de entrenadores aquí, las ve como AdminConversation en la pestaña "admin"
    : conversations.filter(c => !c.archivada && c.escalada_desde_entrenador === true);
  const normalActiveConversations = [];
  const archivedConversations = isAdmin
    ? [] // Admin no gestiona archivo de CoordinatorConversation
    : conversations.filter(c => c.archivada && c.escalada_desde_entrenador === true);

  // Aplicar filtros
  const applyFilters = (convList) => {
    return convList.filter(conv => {
      const matchesSearch = conv.padre_nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.jugadores_asociados?.some(j => j.jugador_nombre?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === "all" || 
        conv.jugadores_asociados?.some(j => j.categoria === categoryFilter);

      const matchesLabel = labelFilter === "all" || conv.etiqueta === labelFilter;

      const matchesPriority = priorityFilter === "all" || (priorityFilter === "prioritaria" ? !!conv.prioritaria : !conv.prioritaria);

      const matchesAdmin = !withAdminOnly || parentsWithAdminChats.has(conv.padre_email);

      return matchesSearch && matchesCategory && matchesLabel && matchesPriority && matchesAdmin;
    });
  };

  const filteredEscalated = applyFilters(escalatedConversations);
  const filteredNormal = applyFilters(normalActiveConversations);

  const categories = [...new Set(
    conversations.flatMap(c => c.jugadores_asociados?.map(j => j.categoria) || [])
  )].sort();

  const totalUnread = conversations.reduce((sum, c) => sum + (c.no_leidos_coordinador || 0), 0);
  const escalatedUnread = escalatedConversations.reduce((sum, c) => sum + (c.no_leidos_coordinador || 0), 0);
  const totalEscalatedCount = escalatedConversations.length;
  const escalatedPriorityCount = escalatedConversations.filter(c => c.prioritaria).length;
  const escalatedWithAdminActive = escalatedConversations.filter(c => parentsWithAdminChats.has(c.padre_email)).length;
  const archivedCount = archivedConversations.length;

  const ConversationCard = ({ conv }) => (
    <Card
      key={conv.id}
      className={`mb-2 cursor-pointer hover:shadow-md transition-all ${
        selectedConversation?.id === conv.id ? 'ring-2 ring-cyan-500' : ''
      } ${(conv.escalada_desde_entrenador || conv.escalada_a_admin) ? 'border-l-4 border-orange-500' : ''}`}
      onClick={() => setSelectedConversation(conv)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm text-slate-900 truncate">{conv.padre_nombre}</p>
              {(conv.escalada_desde_entrenador || conv.escalada_a_admin) && (
                <Badge className="bg-orange-100 text-orange-700 text-xs flex-shrink-0">
                  🚨 Escalada
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
                📤 Escalado por {conv.entrenador_nombre_que_escalo || 'Entrenador'}
              </p>
            )}
          </div>
          {conv.no_leidos_coordinador > 0 && (
            <Badge className="bg-red-500 text-white font-bold text-xs flex-shrink-0 px-2 py-1 rounded-full">{conv.no_leidos_coordinador}</Badge>
          )}
        </div>
        <p className="text-xs text-slate-600 truncate">{conv.ultimo_mensaje}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            {conv.escalada_a_admin && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={(e) => { e.stopPropagation(); openAdminChatMutation.mutate(conv); }}
              >
                Abrir chat con el padre
              </Button>
            )}
          </div>
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
  );

  return (
    <div className="h-full min-h-0 flex flex-col lg:flex-row overflow-hidden">
      {/* Lista de conversaciones */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r bg-slate-50 min-h-0 flex-col h-full overflow-y-auto`}>
        <div className="p-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Conversaciones Escaladas
            </h1>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white/10 rounded-lg p-2 flex items-center justify-between">
              <span>Escaladas</span>
              <Badge className="bg-white text-cyan-700">{totalEscalatedCount}</Badge>
            </div>
            <div className="bg-white/10 rounded-lg p-2 flex items-center justify-between">
              <span>Sin leer</span>
              <Badge className="bg-red-500">{escalatedUnread}</Badge>
            </div>
            <div className="bg-white/10 rounded-lg p-2 flex items-center justify-between">
              <span>Con Admin</span>
              <Badge className="bg-white text-cyan-700">{escalatedWithAdminActive}</Badge>
            </div>
            <div className="bg-white/10 rounded-lg p-2 flex items-center justify-between">
              <span>Prioritarias</span>
              <Badge className="bg-orange-500">{escalatedPriorityCount}</Badge>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar familias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white h-9"
            />
          </div>
        </div>

        <Tabs defaultValue="escalated" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-3">
            <TabsTrigger value="escalated" className="flex-1">
              🚨 Escaladas ({filteredEscalated.length})
              {escalatedUnread > 0 && (
                <Badge className="ml-2 bg-red-500 animate-pulse">{escalatedUnread}</Badge>
              )}
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
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="prioritaria">Solo prioritarias</SelectItem>
                <SelectItem value="normal">Solo normales</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
              <span>Con chat Admin activo</span>
              <Switch checked={withAdminOnly} onCheckedChange={setWithAdminOnly} />
            </div>
          </div>

          {/* Banner informativo según rol */}
          {isAdmin && adminConversations.length > 0 && (
            <div className="px-4">
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-900 font-bold">🚨 Conversaciones escaladas por el coordinador</span>
                </div>
                <p className="text-red-800 text-xs">
                  Tienes {adminConversations.length} conversaciones que requieren tu intervención directa con los padres
                </p>
              </div>
            </div>
          )}
          {!isAdmin && escalatedConversations.length > 0 && (
            <div className="px-4">
              <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-900 font-bold">🚨 Conversaciones escaladas por entrenadores</span>
                </div>
                <p className="text-orange-800 text-xs">
                  Tienes {escalatedConversations.length} conversaciones que requieren tu intervención como coordinador
                </p>
              </div>
            </div>
          )}

          <TabsContent value="escalated" className="flex-1 overflow-y-auto px-2">
            {filteredEscalated.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">✅ No hay conversaciones escaladas</p>
                <p className="text-xs text-slate-400 mt-1">Las conversaciones urgentes aparecerán aquí</p>
              </div>
            ) : (
              <>
                {filteredEscalated.some(c => (c.no_leidos_coordinador || 0) > 0) && (
                  <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2 text-xs">
                    <span className="text-red-800 font-bold">🔴 Mensajes sin leer:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {filteredEscalated.filter(c => (c.no_leidos_coordinador || 0) > 0).map(c => (
                        <button 
                          key={c.id} 
                          onClick={() => setSelectedConversation(c)}
                          className="bg-red-200 border border-red-400 rounded-full px-2 py-0.5 text-xs font-semibold text-red-900 hover:bg-red-300 transition-colors"
                        >
                          {c.padre_nombre}
                          <Badge className="ml-1 bg-red-600 text-white text-[10px] px-1 py-0 h-4 animate-pulse">{c.no_leidos_coordinador}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end mb-2">
                  <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}>
                    {viewMode === 'list' ? 'Ver Kanban' : 'Ver Lista'}
                  </Button>
                </div>

                {viewMode === 'kanban' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-1">🔶 Pendientes</p>
                      <div className="space-y-2">
                        {filteredEscalated.filter(c => !c.prioritaria && !parentsWithAdminChats.has(c.padre_email)).map(c => (
                          <ConversationCard key={c.id} conv={c} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-1">⭐ Prioritarias</p>
                      <div className="space-y-2">
                        {filteredEscalated.filter(c => c.prioritaria).map(c => (
                          <ConversationCard key={c.id} conv={c} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-1">🛡️ Con Admin</p>
                      <div className="space-y-2">
                        {filteredEscalated.filter(c => parentsWithAdminChats.has(c.padre_email)).map(c => (
                          <ConversationCard key={c.id} conv={c} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {filteredEscalated.map(conv => <ConversationCard key={conv.id} conv={conv} />)}
                  </>
                )}
              </>
              )}
              </TabsContent>

          <TabsContent value="active" className="flex-1 overflow-y-auto px-2">
            {filteredNormal.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No hay conversaciones activas</p>
              </div>
            ) : (
              filteredNormal.map(conv => <ConversationCard key={conv.id} conv={conv} />)
            )}
          </TabsContent>

          <TabsContent value="admin" className="flex-1 overflow-y-auto px-2">
            {adminConversations.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No hay chats de Admin abiertos</p>
                <p className="text-xs text-slate-400 mt-1">Cuando un coordinador escale, el chat Admin aparecerá aquí</p>
              </div>
            ) : (
              adminConversations.map((ac) => (
                <Card key={ac.id} className="mb-2 hover:shadow-md transition-all">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{ac.padre_nombre}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {ac.jugadores_asociados?.map(j => `${j.jugador_nombre} (${j.categoria})`).join(', ')}
                        </p>
                        {ac.motivo_escalacion && (
                          <p className="text-xs text-orange-700 mt-1">⚠️ {ac.motivo_escalacion}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {ac.no_leidos_admin > 0 && (
                          <Badge className="bg-red-500 text-white font-bold text-xs px-2 py-1 rounded-full">{ac.no_leidos_admin}</Badge>
                        )}
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => {
                            const url = createPageUrl('AdminChat') + `?convId=${ac.id}`;
                            window.location.href = url;
                          }}
                        >
                          Abrir chat
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-1">{ac.ultimo_mensaje}</p>
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
              <p className="text-slate-500 font-medium mb-2">Supervisa las conversaciones del coordinador</p>
              <p className="text-xs text-slate-400 max-w-md">
                Desde aquí puedes ver todas las conversaciones, especialmente las que fueron <strong>escaladas</strong> por el coordinador por requerir intervención administrativa.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}