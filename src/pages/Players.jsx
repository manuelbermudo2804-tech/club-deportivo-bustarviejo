import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";

import PlayerCard from "../components/players/PlayerCard";
import PlayerForm from "../components/players/PlayerForm";

export default function Players() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAdmin(currentUser.role === "admin");
      setIsCoach(currentUser.es_entrenador === true && currentUser.role !== "admin");
    };
    fetchUser();
  }, []);

  const { data: allPlayers, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list('-created_date'),
    initialData: [],
  });

  const { data: schedules } = useQuery({
    queryKey: ['trainingSchedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    initialData: [],
  });

  // Filter players based on role - solo mostrar activos
  const players = isAdmin 
    ? allPlayers.filter(p => p.activo === true)
    : allPlayers.filter(p => 
        (p.email_padre === user?.email || p.email_tutor_2 === user?.email) && p.activo === true
      );

  const createPlayerMutation = useMutation({
    mutationFn: async (playerData) => {
      const newPlayer = await base44.entities.Player.create(playerData);
      
      // Enviar email de notificación al club
      try {
        await base44.integrations.Core.SendEmail({
          to: "cdbustarviejo@gmail.com",
          subject: `Nueva Inscripción de Jugador - ${playerData.nombre}`,
          body: `
            <h2>Nueva Inscripción Recibida</h2>
            <p><strong>Tipo:</strong> ${playerData.tipo_inscripcion}</p>
            <p><strong>Jugador:</strong> ${playerData.nombre}</p>
            <p><strong>Categoría:</strong> ${playerData.deporte}</p>
            <p><strong>Fecha de Nacimiento:</strong> ${new Date(playerData.fecha_nacimiento).toLocaleDateString('es-ES')}</p>
            <hr>
            <h3>Datos de Contacto:</h3>
            <p><strong>Email Padre/Tutor 1:</strong> ${playerData.email_padre}</p>
            <p><strong>Teléfono:</strong> ${playerData.telefono}</p>
            ${playerData.email_tutor_2 ? `<p><strong>Email Padre/Tutor 2:</strong> ${playerData.email_tutor_2}</p>` : ''}
            ${playerData.telefono_tutor_2 ? `<p><strong>Teléfono Tutor 2:</strong> ${playerData.telefono_tutor_2}</p>` : ''}
            ${playerData.email_jugador ? `<p><strong>Email Jugador:</strong> ${playerData.email_jugador} (Acceso autorizado)</p>` : ''}
            <p><strong>Dirección:</strong> ${playerData.direccion}</p>
            <hr>
            <h3>Autorizaciones:</h3>
            <p><strong>Política de Privacidad:</strong> ${playerData.acepta_politica_privacidad ? 'Aceptada ✅' : 'No aceptada'}</p>
            <p><strong>Fotografías/Videos:</strong> ${playerData.autorizacion_fotografia}</p>
            <p><strong>Acceso del Jugador a la App:</strong> ${playerData.acceso_jugador_autorizado ? 'Autorizado ✅' : 'No autorizado'}</p>
            ${playerData.observaciones ? `<hr><h3>Observaciones:</h3><p>${playerData.observaciones}</p>` : ''}
            <hr>
            <p style="font-size: 12px; color: #666;">Inscripción registrada el ${new Date().toLocaleString('es-ES')}</p>
          `
        });
      } catch (error) {
        console.error("Error sending email notification:", error);
      }
      
      return newPlayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowForm(false);
      setEditingPlayer(null);
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, playerData }) => base44.entities.Player.update(id, playerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowForm(false);
      setEditingPlayer(null);
    },
  });

  const handleSubmit = async (playerData) => {
    if (editingPlayer) {
      updatePlayerMutation.mutate({ id: editingPlayer.id, playerData });
    } else {
      createPlayerMutation.mutate(playerData);
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setShowForm(true);
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = sportFilter === "all" || player.deporte === sportFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && player.activo) ||
      (statusFilter === "inactive" && !player.activo);
    const matchesCategory = categoryFilter === "all" || player.deporte === categoryFilter;
    return matchesSearch && matchesSport && matchesStatus && matchesCategory;
  });

  // Obtener todas las categorías únicas
  const allCategories = [...new Set(players.map(p => p.deporte).filter(Boolean))].sort();

  // Contar jugadores por estado
  const allCount = players.length;
  const activeCount = players.filter(p => p.activo).length;
  const inactiveCount = players.filter(p => !p.activo).length;
  const futbolCount = players.filter(p => p.deporte?.includes("Fútbol") && !p.deporte?.includes("Femenino")).length;
  const futbolFemeninoCount = players.filter(p => p.deporte === "Fútbol Femenino").length;
  const baloncestoCount = players.filter(p => p.deporte?.includes("Baloncesto")).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isAdmin ? "Jugadores" : isCoach ? "Mis Hijos" : "Mis Jugadores"}
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? "Gestión de fichas y plantilla" : "Jugadores registrados a tu nombre"}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingPlayer(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Jugador
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <PlayerForm
            player={editingPlayer}
            allPlayers={allPlayers}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingPlayer(null);
            }}
            isSubmitting={createPlayerMutation.isPending || updatePlayerMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Búsqueda */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => e.target && setSearchTerm(e.target.value)}
          className="pl-10 bg-white shadow-sm"
        />
      </div>

      {/* Botón de Filtros Avanzados */}
      <Button
        variant="outline"
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        className="shadow-sm"
      >
        {showAdvancedFilters ? "Ocultar Filtros" : "Filtros Avanzados"}
      </Button>

      {/* Panel de Filtros Avanzados */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-orange-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-900 mb-4">Filtros Avanzados</h3>
          
          {/* Filtro por Estado */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Estado del Jugador</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className={statusFilter === "all" ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                Todos ({allCount})
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                className={statusFilter === "active" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                ✅ Activos ({activeCount})
              </Button>
              <Button
                variant={statusFilter === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("inactive")}
                className={statusFilter === "inactive" ? "bg-slate-600 hover:bg-slate-700" : ""}
              >
                ❌ Inactivos ({inactiveCount})
              </Button>
            </div>
          </div>

          {/* Filtro por Deporte */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Deporte</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sportFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSportFilter("all")}
                className={sportFilter === "all" ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                Todos
              </Button>
              <Button
                variant={sportFilter === "Fútbol" ? "default" : "outline"}
                size="sm"
                onClick={() => setSportFilter("Fútbol")}
                className={sportFilter === "Fútbol" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                ⚽ Fútbol ({futbolCount})
              </Button>
              <Button
                variant={sportFilter === "Fútbol Femenino" ? "default" : "outline"}
                size="sm"
                onClick={() => setSportFilter("Fútbol Femenino")}
                className={sportFilter === "Fútbol Femenino" ? "bg-pink-600 hover:bg-pink-700" : ""}
              >
                ⚽ Fútbol Femenino ({futbolFemeninoCount})
              </Button>
              <Button
                variant={sportFilter === "Baloncesto" ? "default" : "outline"}
                size="sm"
                onClick={() => setSportFilter("Baloncesto")}
                className={sportFilter === "Baloncesto" ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                🏀 Baloncesto ({baloncestoCount})
              </Button>
            </div>
          </div>

          {/* Filtro por Categoría Específica */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Categoría Específica</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("all")}
                className={categoryFilter === "all" ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                Todas
              </Button>
              {allCategories.map(cat => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                  className={categoryFilter === cat ? "bg-purple-600 hover:bg-purple-700" : ""}
                >
                  {cat} ({players.filter(p => p.deporte === cat).length})
                </Button>
              ))}
            </div>
          </div>

          {/* Botón limpiar filtros */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSportFilter("all");
              setStatusFilter("all");
              setCategoryFilter("all");
            }}
            className="w-full"
          >
            Limpiar Filtros
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">No se encontraron jugadores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredPlayers.map((player) => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                onEdit={isAdmin ? handleEdit : null}
                schedules={schedules}
                isCoachOrCoordinator={isCoach || user?.es_coordinador}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}