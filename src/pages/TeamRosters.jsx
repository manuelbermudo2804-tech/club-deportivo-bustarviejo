import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import RosterPlayerCard from "../components/players/RosterPlayerCard";

export default function TeamRosters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [user, setUser] = useState(null);
  const [coachCategories, setCoachCategories] = useState([]);
  const [updatingPlayerId, setUpdatingPlayerId] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Coordinador ve todas las categorías
      if (currentUser.es_coordinador) {
        const allPlayers = await base44.entities.Player.list();
        const allCategories = [...new Set(allPlayers.map(p => p.categoria_principal || p.deporte).filter(Boolean))];
        setCoachCategories(allCategories);
        if (allCategories.length > 0) {
          setSelectedCategory(allCategories[0]);
        }
      } else {
        const categories = currentUser.categorias_entrena || [];
        setCoachCategories(categories);
        if (categories.length > 0) {
          setSelectedCategory(categories[0]);
        }
      }
    };
    fetchUser();
  }, []);

  const { data: players, isLoading } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  // Mutation para actualizar disponibilidad del jugador
  const updateAvailabilityMutation = useMutation({
    mutationFn: ({ playerId, data }) => base44.entities.Player.update(playerId, data),
    onMutate: ({ playerId }) => {
      setUpdatingPlayerId(playerId);
    },
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['allPlayers'] });
      const isNowUnavailable = data.lesionado || data.sancionado;
      toast.success(isNowUnavailable ? "Jugador marcado como no disponible" : "Jugador marcado como disponible");
    },
    onError: (error) => {
      console.error("Error updating player availability:", error);
      toast.error("Error al actualizar disponibilidad");
    },
    onSettled: () => {
      setUpdatingPlayerId(null);
    }
  });

  const handleUpdateAvailability = (playerId, data) => {
    updateAvailabilityMutation.mutate({ playerId, data });
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const playerCat = player.categoria_principal || player.deporte;
    const matchesCategory = selectedCategory === "all" || playerCat === selectedCategory;
    const isInMyTeams = coachCategories.includes(playerCat);
    const isRenewed = !player.estado_renovacion || player.estado_renovacion === "renovado";
    
    // Aplicar filtro de estado
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && player.activo) ||
      (statusFilter === "inactive" && !player.activo);
    
    return matchesSearch && matchesCategory && isInMyTeams && isRenewed && matchesStatus;
  });

  const activePlayers = filteredPlayers.length;
  const totalActiveInTeams = players.filter(p => coachCategories.includes(p.categoria_principal || p.deporte) && p.activo && (!p.estado_renovacion || p.estado_renovacion === "renovado")).length;
  const totalInactiveInTeams = players.filter(p => coachCategories.includes(p.categoria_principal || p.deporte) && !p.activo).length;
  const unavailablePlayers = players.filter(p => coachCategories.includes(p.categoria_principal || p.deporte) && (p.lesionado || p.sancionado)).length;

  if (!user || coachCategories.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No tienes equipos asignados</p>
          <p className="text-sm text-slate-400 mt-2">Contacta con el administrador</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">🎓 Plantillas</h1>
        <p className="text-slate-600 mt-1 text-sm lg:text-base">Jugadores de tus equipos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-slate-600 mb-1">Equipos</p>
                <p className="text-2xl lg:text-3xl font-bold text-blue-600">{coachCategories.length}</p>
              </div>
              <Users className="w-8 h-8 lg:w-12 lg:h-12 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-slate-600 mb-1">Jugadores</p>
                <p className="text-2xl lg:text-3xl font-bold text-green-600">{activePlayers}</p>
              </div>
              <Users className="w-8 h-8 lg:w-12 lg:h-12 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-lg bg-white ${unavailablePlayers > 0 ? "" : "col-span-2 lg:col-span-1"}`}>
          <CardContent className="pt-4 lg:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-slate-600 mb-1">Categoría</p>
                <p className="text-sm lg:text-lg font-bold text-orange-600 truncate">
                  {selectedCategory === "all" ? "Todas" : selectedCategory.split(" ")[1]}
                </p>
              </div>
              <Calendar className="w-8 h-8 lg:w-12 lg:h-12 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {unavailablePlayers > 0 && (
          <Card className="border-none shadow-lg bg-amber-50 border-2 border-amber-200">
            <CardContent className="pt-4 lg:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-amber-700 mb-1">No Disponibles</p>
                  <p className="text-2xl lg:text-3xl font-bold text-amber-600">{unavailablePlayers}</p>
                </div>
                <AlertTriangle className="w-8 h-8 lg:w-12 lg:h-12 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-lg bg-white">
        <CardContent className="pt-4 lg:pt-6 space-y-3 lg:space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
              <Input
                placeholder="Buscar jugador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 lg:pl-10 text-sm lg:text-base"
              />
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              {showAdvancedFilters ? "Ocultar" : "Filtros"}
            </button>
          </div>

          {showAdvancedFilters && (
            <div className="space-y-3 pt-2 border-t">
              {/* Filtro por Estado */}
              <div className="space-y-2">
                <label className="text-xs lg:text-sm font-semibold text-slate-700">Estado</label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    onClick={() => setStatusFilter("all")}
                    className={`cursor-pointer px-3 py-1 text-xs ${
                      statusFilter === "all"
                        ? "bg-orange-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Todos
                  </Badge>
                  <Badge
                    onClick={() => setStatusFilter("active")}
                    className={`cursor-pointer px-3 py-1 text-xs ${
                      statusFilter === "active"
                        ? "bg-green-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    ✅ Activos ({totalActiveInTeams})
                  </Badge>
                  <Badge
                    onClick={() => setStatusFilter("inactive")}
                    className={`cursor-pointer px-3 py-1 text-xs ${
                      statusFilter === "inactive"
                        ? "bg-slate-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    ❌ Inactivos ({totalInactiveInTeams})
                  </Badge>
                </div>
              </div>

              {/* Filtro por Categoría */}
              <div className="space-y-2">
                <label className="text-xs lg:text-sm font-semibold text-slate-700">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    onClick={() => setSelectedCategory("all")}
                    className={`cursor-pointer px-3 py-1 text-xs ${
                      selectedCategory === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Todas
                  </Badge>
                  {coachCategories.map((categoria) => {
                    const count = players.filter(p => (p.categoria_principal || p.deporte) === categoria && p.activo && (!p.estado_renovacion || p.estado_renovacion === "renovado")).length;
                    return (
                      <Badge
                        key={categoria}
                        onClick={() => setSelectedCategory(categoria)}
                        className={`cursor-pointer px-3 py-1 text-xs ${
                          selectedCategory === categoria
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {categoria} ({count})
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Botón limpiar */}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                  setStatusFilter("all");
                }}
                className="w-full px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Players Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No hay jugadores en este equipo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
          {filteredPlayers.map((player) => (
            <RosterPlayerCard 
              key={player.id} 
              player={player} 
              onUpdateAvailability={handleUpdateAvailability}
              isUpdating={updatingPlayerId === player.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}