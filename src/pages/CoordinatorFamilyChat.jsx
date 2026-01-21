import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Settings, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import CoordinatorChatWindow from "../components/coordinator/CoordinatorChatWindow";
import CoordinatorAwayMode from "../components/coordinator/CoordinatorAwayMode";

export default function CoordinatorFamilyChat({ embedded = false }) {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // Cargar conversaciones del coordinador
  const { data: conversations = [] } = useQuery({
    queryKey: ['coordinatorFamilyConversations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allConvs = await base44.entities.CoordinatorConversation.list('-ultimo_mensaje_fecha', 100);
      return allConvs.filter(c => c.padre_email);
    },
    enabled: !!user?.email,
    staleTime: 10000,
    refetchInterval: 5000,
  });

  // Auto-seleccionar primera conversación
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, selectedConversation]);

  // Filtrar conversaciones por búsqueda
  const filteredConversations = conversations.filter(conv =>
    conv.padre_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.jugadores_asociados?.some(j => j.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const isCoordinator = user?.es_coordinador || user?.role === "admin";

  if (!isCoordinator) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo coordinadores pueden acceder a esta sección</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No hay conversaciones aún</p>
      </div>
    );
  }

  if (embedded) {
    return (
      <>
        {/* Modal de configuración */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                ⚙️ Configuración Chat Coordinador
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <CoordinatorAwayMode user={user} />
            </div>
          </DialogContent>
        </Dialog>

        <Card className="h-full flex flex-col overflow-hidden border-cyan-200 shadow-lg rounded-none">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white flex-shrink-0">
            <div className="p-2 flex items-center justify-between border-b border-cyan-500/30">
              <h1 className="text-base font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Chat Familias
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                title="Configuración"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            {/* Búsqueda */}
            <div className="p-2 border-b border-cyan-500/30">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-cyan-200" />
                <Input
                  placeholder="Buscar familia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs bg-cyan-500/20 border-cyan-400 text-white placeholder:text-cyan-200"
                />
              </div>
            </div>
          </div>

          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-2 space-y-1">
              {filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                    selectedConversation?.id === conv.id
                      ? 'bg-cyan-100'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {conv.padre_nombre}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {conv.ultimo_mensaje?.substring(0, 50)}
                      </p>
                    </div>
                    {conv.no_leidos_coordinador > 0 && (
                      <Badge className="bg-red-500 text-white text-xs flex-shrink-0">
                        {conv.no_leidos_coordinador}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <div className="fixed inset-0 lg:inset-auto lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:bottom-0 flex flex-col overflow-hidden pt-[100px] lg:pt-0 pb-0">
      {/* Modal de configuración */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              ⚙️ Configuración Chat Coordinador
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <CoordinatorAwayMode user={user} />
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex h-full overflow-hidden gap-0">
        {/* Panel izquierdo - Lista de conversaciones */}
        <div className="w-80 border-r border-slate-200 flex flex-col overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Familias
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-cyan-200" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-cyan-500/20 border-cyan-400 text-white placeholder:text-cyan-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedConversation?.id === conv.id
                    ? 'bg-cyan-100'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {conv.padre_nombre}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {conv.ultimo_mensaje?.substring(0, 50)}
                    </p>
                  </div>
                  {conv.no_leidos_coordinador > 0 && (
                    <Badge className="bg-red-500 text-white text-xs flex-shrink-0 animate-pulse">
                      {conv.no_leidos_coordinador}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Panel derecho - Chat */}
        <div className="flex-1 overflow-hidden min-h-0">
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
                <p className="text-slate-500">Selecciona una familia para empezar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}