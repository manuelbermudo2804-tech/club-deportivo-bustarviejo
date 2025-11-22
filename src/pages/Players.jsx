import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, X, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import PlayerCard from "../components/players/PlayerCard";
import PlayerForm from "../components/players/PlayerForm";
import PlayerProfileDialog from "../components/players/PlayerProfileDialog";

export default function Players() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
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

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list(),
    initialData: [],
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
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

  const handleViewProfile = (player) => {
    setSelectedPlayer(player);
    setShowProfileDialog(true);
  };

  const handleExportPlayers = () => {
    const dataToExport = filteredPlayers.map(player => ({
      "Nombre": player.nombre,
      "Categoría": player.deporte,
      "Fecha Nacimiento": player.fecha_nacimiento ? new Date(player.fecha_nacimiento).toLocaleDateString('es-ES') : '',
      "Email Padre/Tutor 1": player.email_padre,
      "Teléfono 1": player.telefono,
      "Email Tutor 2": player.email_tutor_2 || '',
      "Teléfono 2": player.telefono_tutor_2 || '',
      "Dirección": player.direccion || '',
      "Estado": player.activo ? "Activo" : "Inactivo",
      "Tipo Inscripción": player.tipo_inscripcion,
      "Autorización Fotos": player.autorizacion_fotografia || ''
    }));

    // Convertir a CSV
    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escapar comas y comillas
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Descargar archivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `jugadores_${categoryFilter !== 'all' ? categoryFilter : 'todos'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = searchTerm === "" || 
      player.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.email_padre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.telefono?.includes(searchTerm);
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
        <div className="flex gap-3">
          {isAdmin && filteredPlayers.length > 0 && (
            <Button
              onClick={handleExportPlayers}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Download className="w-5 h-5 mr-2" />
              Exportar ({filteredPlayers.length})
            </Button>
          )}
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

      {/* Búsqueda Avanzada */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={showAdvancedFilters ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            {(searchTerm || sportFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all") && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setSearchTerm("");
                  setSportFilter("all");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {showAdvancedFilters && (
            <div className="pt-4 border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos ({allCount})</SelectItem>
                      <SelectItem value="active">✅ Activos ({activeCount})</SelectItem>
                      <SelectItem value="inactive">❌ Inactivos ({inactiveCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Deporte</label>
                  <Select value={sportFilter} onValueChange={setSportFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Fútbol">⚽ Fútbol ({futbolCount})</SelectItem>
                      <SelectItem value="Fútbol Femenino">⚽ Fútbol Femenino ({futbolFemeninoCount})</SelectItem>
                      <SelectItem value="Baloncesto">🏀 Baloncesto ({baloncestoCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Categoría</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat} ({players.filter(p => p.deporte === cat).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                onViewProfile={handleViewProfile}
                schedules={schedules}
                isCoachOrCoordinator={isCoach || user?.es_coordinador}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {selectedPlayer && (
        <PlayerProfileDialog
          player={selectedPlayer}
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          onEdit={isAdmin ? handleEdit : null}
          payments={payments}
          evaluations={evaluations}
          attendances={attendances}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}