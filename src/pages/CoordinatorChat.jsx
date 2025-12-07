import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Search, Archive, ArchiveRestore, Users, Filter, Star } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import CoordinatorChatWindow from "../components/coordinator/CoordinatorChatWindow";

export default function CoordinatorChat() {
  const [user, setUser] = useState(null);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsCoordinator(currentUser.es_coordinador === true || currentUser.role === "admin");
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: conversations = [] } = useQuery({
    queryKey: ['coordinatorConversations'],
    queryFn: () => base44.entities.CoordinatorConversation.list('-ultimo_mensaje_fecha'),
    enabled: isCoordinator,
    refetchInterval: 5000,
  });

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
    <div className="h-screen sm:h-[calc(100vh-110px)] flex">
      {/* Lista de conversaciones */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r bg-slate-50 flex-col h-full`}>
        <div className="p-4 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2 mb-1">
            <MessageCircle className="w-6 h-6" />
            Chat Coordinador
          </h1>
          <p className="text-xs text-cyan-100 mb-3">
            Resuelve dudas deportivas, quejas y consultas de las familias
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar padre o jugador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
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
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900">{conv.padre_nombre}</p>
                          {conv.prioritaria && <Star className="w-3 h-3 text-orange-500 fill-orange-500" />}
                          {conv.etiqueta && <Badge variant="outline" className="text-xs">{conv.etiqueta}</Badge>}
                        </div>
                        <p className="text-xs text-slate-500">
                          {conv.jugadores_asociados?.map(j => `${j.jugador_nombre} (${j.categoria})`).join(', ')}
                        </p>
                      </div>
                      {conv.no_leidos_coordinador > 0 && (
                        <Badge className="bg-red-500 text-white">{conv.no_leidos_coordinador}</Badge>
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
      <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 h-full`}>
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