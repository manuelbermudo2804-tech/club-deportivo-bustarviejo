import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, Search, Archive, Star, AlertTriangle, CheckCircle, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import AdminChatWindow from "../components/admin/AdminChatWindow";

export default function AdminChat() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMotivo, setFilterMotivo] = useState("all");
  const [filterCriticidad, setFilterCriticidad] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['adminConversations', user?.email],
    queryFn: async () => {
      return await base44.entities.AdminConversation.list('-ultimo_mensaje_fecha');
    },
    refetchInterval: 5000,
    enabled: !!user,
  });

  // REAL-TIME: Suscripción a conversaciones admin
  useEffect(() => {
    if (!user) return;
    
    const unsub = base44.entities.AdminConversation.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['adminConversations'] });
    });
    
    return unsub;
  }, [user, queryClient]);

  const archiveMutation = useMutation({
    mutationFn: async (conversationId) => {
      const conv = conversations.find(c => c.id === conversationId);
      await base44.entities.AdminConversation.update(conversationId, {
        archivada: !conv.archivada,
        fecha_archivado: conv.archivada ? null : new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminConversations'] });
      toast.success("Conversación actualizada");
    },
  });

  const markResolvedMutation = useMutation({
    mutationFn: async ({ conversationId, notas }) => {
      await base44.entities.AdminConversation.update(conversationId, {
        resuelta: true,
        fecha_resolucion: new Date().toISOString(),
        resolucion_notas: notas,
        archivada: true,
        fecha_archivado: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminConversations'] });
      setSelectedConversation(null);
      toast.success("✅ Conversación marcada como resuelta");
    },
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-slate-600 font-semibold">Solo administradores pueden acceder</p>
      </div>
    );
  }

  const activeConversations = conversations.filter(c => !c.archivada && !c.resuelta);
  const archivedConversations = conversations.filter(c => c.archivada || c.resuelta);

  const filteredActive = activeConversations.filter(conv => {
    const matchSearch = !searchTerm || 
      conv.padre_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.motivo_escalacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.motivo_detalle?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchMotivo = filterMotivo === "all" || conv.motivo_escalacion === filterMotivo;
    const matchCriticidad = filterCriticidad === "all" || conv.criticidad === filterCriticidad;
    
    return matchSearch && matchMotivo && matchCriticidad;
  });

  const filteredArchived = archivedConversations.filter(conv => 
    !searchTerm || 
    conv.padre_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.motivo_escalacion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnread = activeConversations.reduce((sum, c) => sum + (c.no_leidos_admin || 0), 0);

  return (
    <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-110px)] flex">
      {/* Sidebar de conversaciones */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} lg:w-96 flex-col border-r bg-white overflow-hidden`}>
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-red-600 to-red-700 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ShieldAlert className="w-6 h-6" />
                Conversaciones Críticas
              </h1>
              <p className="text-xs text-red-100">
                Escaladas por coordinador
              </p>
            </div>
            {totalUnread > 0 && (
              <Badge className="bg-white text-red-700 font-bold">
                {totalUnread}
              </Badge>
            )}
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white/20 border-white/30 text-white placeholder:text-white/60"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="p-3 bg-slate-50 border-b space-y-2 flex-shrink-0">
          <div className="flex gap-2">
            <Select value={filterMotivo} onValueChange={setFilterMotivo}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los motivos</SelectItem>
                <SelectItem value="Insultos">🤬 Insultos</SelectItem>
                <SelectItem value="Amenazas">⚠️ Amenazas</SelectItem>
                <SelectItem value="Acusaciones graves">📢 Acusaciones</SelectItem>
                <SelectItem value="Ataques al personal">💥 Ataques</SelectItem>
                <SelectItem value="Conflicto familiar">👨‍👩‍👧 Conflicto</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCriticidad} onValueChange={setFilterCriticidad}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Criticidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Crítica">🔴 Crítica</SelectItem>
                <SelectItem value="Alta">🟠 Alta</SelectItem>
                <SelectItem value="Media">🟡 Media</SelectItem>
                <SelectItem value="Baja">🟢 Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="w-full"
          >
            {showArchived ? <CheckCircle className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
            {showArchived ? 'Ver Activas' : 'Ver Resueltas'}
          </Button>
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            </div>
          ) : (showArchived ? filteredArchived : filteredActive).length === 0 ? (
            <div className="text-center py-8">
              <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {showArchived ? "No hay conversaciones resueltas" : "No hay conversaciones activas"}
              </p>
            </div>
          ) : (
            (showArchived ? filteredArchived : filteredActive).map(conv => (
              <Card
                key={conv.id}
                className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${
                  selectedConversation?.id === conv.id ? 'ring-2 ring-red-500' : ''
                } ${
                  conv.criticidad === "Crítica" ? 'border-red-600' :
                  conv.criticidad === "Alta" ? 'border-orange-500' :
                  conv.criticidad === "Media" ? 'border-yellow-500' :
                  'border-green-500'
                } ${conv.resuelta ? 'bg-green-50' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-sm text-slate-900">{conv.padre_nombre}</p>
                        {conv.resuelta && (
                          <Badge className="bg-green-600 text-white text-xs">
                            ✅ Resuelta
                          </Badge>
                        )}
                        {conv.criticidad === "Crítica" && !conv.resuelta && (
                          <Badge className="bg-red-600 text-white text-xs animate-pulse">
                            🔴 CRÍTICA
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-orange-100 text-orange-700 text-xs">
                          {conv.motivo_escalacion}
                        </Badge>
                        {conv.etiqueta && (
                          <Badge variant="outline" className="text-xs">{conv.etiqueta}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 truncate">
                        Escalado por: {conv.coordinador_nombre_que_escalo}
                      </p>
                      <p className="text-xs text-slate-500">
                        {conv.jugadores_asociados?.map(j => `${j.jugador_nombre} (${j.categoria})`).join(', ')}
                      </p>
                    </div>
                    {!conv.resuelta && conv.no_leidos_admin > 0 && (
                      <Badge className="bg-red-500 text-white">{conv.no_leidos_admin}</Badge>
                    )}
                  </div>
                  
                  {conv.ultimo_mensaje && (
                    <p className="text-xs text-slate-600 truncate mt-2">
                      {conv.ultimo_mensaje}
                    </p>
                  )}
                  
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(conv.ultimo_mensaje_fecha || conv.created_date), "d MMM, HH:mm", { locale: es })}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Ventana de chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <AdminChatWindow
            conversation={selectedConversation}
            user={user}
            onClose={() => setSelectedConversation(null)}
            onMarkResolved={(notas) => markResolvedMutation.mutate({ 
              conversationId: selectedConversation.id, 
              notas 
            })}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-50">
            <div className="text-center">
              <ShieldAlert className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-semibold">Selecciona una conversación</p>
              <p className="text-slate-400 text-sm">Las conversaciones escaladas aparecerán aquí</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}