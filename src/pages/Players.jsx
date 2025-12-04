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
import PlayerCardSkeleton from "../components/skeletons/PlayerCardSkeleton";

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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
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

  // El tesorero también debe ver todos los jugadores
  const isTreasurer = user?.es_tesorero === true;

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

  // Obtener temporada activa
  const { data: activeSeason } = useQuery({
    queryKey: ['activeSeasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  // Filter players based on role - solo mostrar activos de la temporada actual
  // Admin y Tesorero ven todos los jugadores activos
  const players = (isAdmin || isTreasurer)
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
    mutationFn: async ({ id, playerData, originalPlayer }) => {
      const updatedPlayer = await base44.entities.Player.update(id, playerData);
      
      // Detectar si se añadieron NUEVOS enlaces de firma (no existían antes O cambiaron)
      const newEnlaceJugador = playerData.enlace_firma_jugador && 
        playerData.enlace_firma_jugador !== originalPlayer?.enlace_firma_jugador;
      const newEnlaceTutor = playerData.enlace_firma_tutor && 
        playerData.enlace_firma_tutor !== originalPlayer?.enlace_firma_tutor;
      
      console.log('🔍 Verificando firmas:', {
        jugadorNuevo: playerData.enlace_firma_jugador,
        jugadorOriginal: originalPlayer?.enlace_firma_jugador,
        tutorNuevo: playerData.enlace_firma_tutor,
        tutorOriginal: originalPlayer?.enlace_firma_tutor,
        enviarEmailJugador: newEnlaceJugador,
        enviarEmailTutor: newEnlaceTutor
      });
      
      if (newEnlaceJugador || newEnlaceTutor) {
        // Enviar notificación al padre/tutor
        try {
          const enlacesInfo = [];
          if (newEnlaceJugador) enlacesInfo.push("Firma del Jugador");
          if (newEnlaceTutor) enlacesInfo.push("Firma del Padre/Tutor");
          
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo - Federación",
            to: playerData.email_padre,
            subject: `🖊️ Enlaces de Firma Disponibles - ${playerData.nombre}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #f59e0b, #ea580c); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0;">🖊️ Firma Digital Requerida</h1>
                </div>
                <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb;">
                  <p style="font-size: 16px;">Estimado/a padre/madre/tutor,</p>
                  <p>Los <strong>enlaces de firma de federación</strong> para <strong>${playerData.nombre}</strong> ya están disponibles.</p>
                  
                  <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #92400e; margin-top: 0;">📋 Firmas pendientes:</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                      ${newEnlaceJugador ? `<li style="margin: 10px 0;"><strong>Firma del Jugador</strong><br/><a href="${playerData.enlace_firma_jugador}" style="color: #ea580c;">Pulsa aquí para firmar →</a></li>` : ''}
                      ${newEnlaceTutor ? `<li style="margin: 10px 0;"><strong>Firma del Padre/Tutor Legal</strong><br/><a href="${playerData.enlace_firma_tutor}" style="color: #ea580c;">Pulsa aquí para firmar →</a></li>` : ''}
                    </ul>
                  </div>
                  
                  <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px;"><strong>¿Cómo firmar?</strong></p>
                    <ol style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
                      <li>Pulsa en el enlace correspondiente</li>
                      <li>Sigue las instrucciones de la federación</li>
                      <li>Una vez firmado, entra en la app del club y marca "Firma completada"</li>
                    </ol>
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280;">También puedes acceder a los enlaces desde la aplicación del club, en la ficha del jugador.</p>
                </div>
                <div style="background: #1e293b; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
                  <p style="margin: 0; font-size: 12px;">CD Bustarviejo - Temporada 2024/2025</p>
                </div>
              </div>
            `
          });
          console.log('📧 Notificación de enlaces de firma enviada a:', playerData.email_padre);
        } catch (error) {
          console.error("Error enviando notificación de firma:", error);
        }
      }
      
      return updatedPlayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowForm(false);
      setEditingPlayer(null);
    },
  });

  const handleSubmit = async (playerData) => {
    if (editingPlayer) {
      updatePlayerMutation.mutate({ id: editingPlayer.id, playerData, originalPlayer: editingPlayer });
    } else {
      createPlayerMutation.mutate(playerData);
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setShowForm(true);
  };

  const [initialTab, setInitialTab] = useState("info");

  const handleViewProfile = (player, tab = "info") => {
    setSelectedPlayer(player);
    setInitialTab(tab);
    setShowProfileDialog(true);
  };

  const handleViewPayments = (player) => {
    setSelectedPlayer(player);
    // Implement logic to open profile with payments tab active
    // For now, it opens the standard profile
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
    
    // Filtro de deporte: buscar si el deporte del jugador CONTIENE el texto del filtro
    const matchesSport = sportFilter === "all" || 
      (sportFilter === "Fútbol" && player.deporte?.includes("Fútbol") && !player.deporte?.includes("Femenino")) ||
      (sportFilter === "Fútbol Femenino" && player.deporte === "Fútbol Femenino") ||
      (sportFilter === "Baloncesto" && player.deporte?.includes("Baloncesto"));
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && player.activo) ||
      (statusFilter === "inactive" && !player.activo);
    
    // Filtro de categoría: comparación exacta con la categoría completa
    const matchesCategory = categoryFilter === "all" || player.deporte === categoryFilter;
    
    return matchesSearch && matchesSport && matchesStatus && matchesCategory;
  });

  // Paginación
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sportFilter, statusFilter, categoryFilter]);

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
            {isAdmin || isTreasurer ? "Jugadores" : isCoach ? "Mis Hijos" : "Mis Jugadores"}
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin || isTreasurer ? "Gestión de fichas y plantilla" : "Jugadores registrados a tu nombre"}
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
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <PlayerCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">No se encontraron jugadores</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {paginatedPlayers.map((player) => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  onEdit={isAdmin ? handleEdit : null}
                  onViewProfile={handleViewProfile}
                  schedules={schedules}
                  payments={payments}
                  isCoachOrCoordinator={isCoach || user?.es_coordinador}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="min-w-[100px]"
              >
                ← Anterior
              </Button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first, last, current, and adjacent pages
                    return page === 1 || 
                           page === totalPages || 
                           Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, index, array) => {
                    // Add ellipsis
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;
                    
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span className="text-slate-400 px-2">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? "bg-orange-600 hover:bg-orange-700" : ""}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="min-w-[100px]"
              >
                Siguiente →
              </Button>
            </div>
          )}

          <div className="text-center text-sm text-slate-600">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredPlayers.length)} de {filteredPlayers.length} jugadores
          </div>
        </>
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
          initialTab={initialTab}
        />
      )}
    </div>
  );
}