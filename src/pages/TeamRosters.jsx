import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, AlertTriangle, Shield, ChevronDown, Filter, User } from "lucide-react";
import { toast } from "sonner";

import RosterPlayerCard from "../components/players/RosterPlayerCard";
import { playerInCategory, playerPrimaryCategory } from "../components/utils/playerCategoryFilter";

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
      
      // Admin y coordinador ven TODAS las categorías (las activas de CategoryConfig + las que ya tienen jugadores)
      if (currentUser.role === "admin" || currentUser.es_coordinador) {
        const [allPlayers, configs] = await Promise.all([
          base44.entities.Player.list(),
          base44.entities.CategoryConfig.filter({ activa: true })
        ]);
        const fromConfig = (configs || []).filter(c => !c.es_actividad_complementaria).map(c => c.nombre);
        const fromPlayers = (allPlayers || []).flatMap(p => [p.categoria_principal, p.deporte, ...(p.categorias || [])]).filter(Boolean);
        const allCategories = [...new Set([...fromConfig, ...fromPlayers])];
        setCoachCategories(allCategories);
        if (allCategories.length > 0) {
          // Mostrar "Todas" por defecto cuando hay varias categorías para que se vean todos los jugadores
          setSelectedCategory("all");
        }
      } else {
        // Entrenador: combinar categorias_entrena Y categorias_coordina (algunos son ambos)
        const categories = [...new Set([
          ...(currentUser.categorias_entrena || []),
          ...(currentUser.categorias_coordina || [])
        ])];
        console.log('🎯 [TeamRosters] Entrenador:', currentUser.email, 'categorías:', categories);
        setCoachCategories(categories);
        if (categories.length > 1) {
          setSelectedCategory("all");
        } else if (categories.length === 1) {
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
    staleTime: 30 * 1000, // 30s - refresca tras reseteos/altas recientes
    refetchOnMount: 'always',
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

  const handleUpdatePosition = (playerId, data) => {
    updateAvailabilityMutation.mutate({ playerId, data });
  };

  // Helpers: ¿el jugador pertenece a alguna de las categorías del entrenador? ¿coincide con la categoría seleccionada?
  const isInMyTeamsFn = (p) => coachCategories.some(cat => playerInCategory(p, cat));
  const matchesSelectedCategory = (p) => selectedCategory === "all" || playerInCategory(p, selectedCategory);

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    // Excluir SOLO los que explícitamente NO renuevan; aceptar nulos, "renovado" y nuevos altas
    const isRenewed = player.estado_renovacion !== "no_renueva";
    
    // Aplicar filtro de estado
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && player.activo) ||
      (statusFilter === "inactive" && !player.activo);
    
    return matchesSearch && matchesSelectedCategory(player) && isInMyTeamsFn(player) && isRenewed && matchesStatus;
  });

  const activePlayers = filteredPlayers.length;
  const totalActiveInTeams = players.filter(p => isInMyTeamsFn(p) && p.activo && p.estado_renovacion !== "no_renueva").length;
  const totalInactiveInTeams = players.filter(p => isInMyTeamsFn(p) && !p.activo).length;
  const unavailablePlayers = players.filter(p => isInMyTeamsFn(p) && (p.lesionado || p.sancionado)).length;

  // Group players by position for stats
  const positionStats = useMemo(() => {
    const stats = { Portero: 0, Defensa: 0, Medio: 0, Delantero: 0, "Sin asignar": 0 };
    filteredPlayers.forEach(p => {
      const pos = p.posicion || "Sin asignar";
      stats[pos] = (stats[pos] || 0) + 1;
    });
    return stats;
  }, [filteredPlayers]);

  if (!user || coachCategories.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-500 text-lg font-medium">No tienes equipos asignados</p>
          <p className="text-sm text-slate-400 mt-1">Contacta con el administrador</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-5">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-5 lg:p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold flex items-center gap-2">
              <Shield className="w-7 h-7" />
              Plantillas
            </h1>
            <p className="text-blue-100 mt-1 text-sm lg:text-base">
              {coachCategories.length} equipo{coachCategories.length > 1 ? 's' : ''} · {totalActiveInTeams} jugadores activos
            </p>
          </div>
          {unavailablePlayers > 0 && (
            <div className="bg-amber-500/20 border border-amber-400/50 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold text-amber-300">{unavailablePlayers}</p>
              <p className="text-xs text-amber-200">No disponibles</p>
            </div>
          )}
        </div>

        {/* Mini KPIs inside header */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          {[
            { label: "Porteros", count: positionStats.Portero, color: "bg-blue-500/30", icon: "🧤" },
            { label: "Defensas", count: positionStats.Defensa, color: "bg-green-500/30", icon: "🛡️" },
            { label: "Medios", count: positionStats.Medio, color: "bg-yellow-500/30", icon: "🎯" },
            { label: "Delanteros", count: positionStats.Delantero, color: "bg-red-500/30", icon: "⚡" },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl px-3 py-2 text-center`}>
              <p className="text-lg font-bold">{s.count}</p>
              <p className="text-[10px] lg:text-xs text-blue-100">{s.icon} {s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {coachCategories.length > 1 && (
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            Todas ({totalActiveInTeams})
          </button>
        )}
        {coachCategories.map((cat) => {
          const count = players.filter(p => playerInCategory(p, cat) && p.activo && p.estado_renovacion !== "no_renueva").length;
          const shortName = cat.replace("Fútbol ", "").replace(" (Mixto)", "");
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              ⚽ {shortName} ({count})
            </button>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar jugador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-slate-200 shadow-sm h-11"
          />
        </div>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            showAdvancedFilters || statusFilter !== "all"
              ? "bg-orange-600 text-white shadow-lg"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showAdvancedFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado del jugador</label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "Todos", color: "orange" },
              { key: "active", label: `Activos (${totalActiveInTeams})`, color: "green" },
              { key: "inactive", label: `Inactivos (${totalInactiveInTeams})`, color: "slate" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === f.key
                    ? `bg-${f.color}-600 text-white shadow`
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {(statusFilter !== "all" || searchTerm) && (
            <button
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
              className="text-xs text-blue-600 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Players Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm animate-pulse">
              <div className="h-36 bg-slate-200 rounded-t-xl" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-500 text-lg font-medium">No hay jugadores</p>
          <p className="text-sm text-slate-400 mt-1">Prueba con otros filtros</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400 font-medium">
            {filteredPlayers.length} jugador{filteredPlayers.length !== 1 ? 'es' : ''} 
            {selectedCategory !== "all" ? ` en ${selectedCategory}` : ''}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
            {filteredPlayers.map((player) => (
              <RosterPlayerCard 
                key={player.id} 
                player={player} 
                onUpdateAvailability={handleUpdateAvailability}
                onUpdatePosition={handleUpdatePosition}
                isUpdating={updatingPlayerId === player.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}