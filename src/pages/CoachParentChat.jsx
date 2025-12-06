import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, Search, Archive, ArchiveRestore, Users, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import CoachChatWindow from "../components/coach/CoachChatWindow";

export default function CoachParentChat() {
  const [user, setUser] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsCoach(currentUser.es_entrenador === true || currentUser.role === "admin");
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: conversations = [] } = useQuery({
    queryKey: ['coachParentConversations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.CoachConversation.list('-ultimo_mensaje_fecha');
      
      // Filtrar por categorías que entrena
      if (user.role === "admin") {
        return all;
      }
      
      const myCategories = user.categorias_entrena || [];
      return all.filter(c => myCategories.includes(c.categoria));
    },
    enabled: !!user?.email && isCoach,
    refetchInterval: 5000,
  });

  if (!isCoach) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo los entrenadores pueden acceder a esta sección</p>
      </div>
    );
  }

  const activeConversations = conversations.filter(c => !c.archivada);
  const archivedConversations = conversations.filter(c => c.archivada);

  const filteredActive = activeConversations.filter(conv => {
    const matchesSearch = conv.padre_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.jugadores_asociados?.some(j => j.jugador_nombre.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || conv.categoria === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(conversations.map(c => c.categoria))].sort();
  const totalUnread = activeConversations.reduce((sum, c) => sum + (c.no_leidos_entrenador || 0), 0);

  return (
    <div className="fixed inset-0 flex lg:static lg:min-h-[calc(100vh-4rem)]">
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r bg-slate-50 flex-col overflow-hidden`}>
        <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2 mb-1">
            <MessageCircle className="w-6 h-6" />
            Chat con Familias
          </h1>
          <p className="text-xs text-blue-100 mb-3">
            Comunicación directa con los padres
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

          <div className="px-4 py-2">
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
                    selectedConversation?.id === conv.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="font-bold text-sm text-slate-900">{conv.padre_nombre}</p>
                        <p className="text-xs text-slate-500">{conv.categoria}</p>
                        <p className="text-xs text-slate-400">
                          {conv.jugadores_asociados?.map(j => j.jugador_nombre).join(', ')}
                        </p>
                      </div>
                      {conv.no_leidos_entrenador > 0 && (
                        <Badge className="bg-red-500 text-white">{conv.no_leidos_entrenador}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate">{conv.ultimo_mensaje}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {conv.ultimo_mensaje_fecha && format(new Date(conv.ultimo_mensaje_fecha), "dd MMM, HH:mm", { locale: es })}
                    </p>
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
                    <p className="font-bold text-sm text-slate-900">{conv.padre_nombre}</p>
                    <p className="text-xs text-slate-500">{conv.categoria}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 overflow-hidden`}>
        {selectedConversation ? (
          <CoachChatWindow
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