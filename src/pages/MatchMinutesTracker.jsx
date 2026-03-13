import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";

import MinutesSpreadsheet from "../components/minutes/MinutesSpreadsheet";
import AddMatchDialog from "../components/minutes/AddMatchDialog";
import MinutesStatsPanel from "../components/minutes/MinutesStatsPanel";

export default function MatchMinutesTracker() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      const cats = u.categorias_entrena || [];
      if (cats.length > 0) setSelectedCategory(cats[0]);
    });
  }, []);

  const myCategories = user?.categorias_entrena || [];
  // Admins can see all categories
  const isAdmin = user?.role === "admin";

  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigsForMinutes'],
    queryFn: () => base44.entities.CategoryConfig.filter({ activa: true }),
    staleTime: 300000,
  });

  const allCategories = useMemo(() => {
    if (isAdmin) return categoryConfigs.map(c => c.nombre).filter(Boolean);
    return myCategories;
  }, [isAdmin, categoryConfigs, myCategories]);

  useEffect(() => {
    if (!selectedCategory && allCategories.length > 0) {
      setSelectedCategory(allCategories[0]);
    }
  }, [allCategories, selectedCategory]);

  const { data: players = [] } = useQuery({
    queryKey: ['playersForMinutes', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const list = await base44.entities.Player.filter({ activo: true });
      return list.filter(p => 
        (p.categoria_principal || p.deporte) === selectedCategory
      ).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    },
    enabled: !!selectedCategory,
    staleTime: 60000,
  });

  const { data: matchRecords = [] } = useQuery({
    queryKey: ['matchMinutes', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      return base44.entities.MatchMinutes.filter(
        { categoria: selectedCategory },
        'fecha_partido'
      );
    },
    enabled: !!selectedCategory,
    staleTime: 30000,
  });

  const createMatchMutation = useMutation({
    mutationFn: async (data) => {
      // Get active season
      const seasons = await base44.entities.SeasonConfig.filter({ activa: true });
      const temporada = seasons[0]?.temporada || '';

      return base44.entities.MatchMinutes.create({
        ...data,
        categoria: selectedCategory,
        entrenador_email: user?.email,
        temporada,
        minutos_jugadores: players.map(p => ({
          jugador_id: p.id,
          jugador_nombre: p.nombre,
          minutos_1parte: 0,
          minutos_2parte: 0
        }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchMinutes', selectedCategory] });
      toast.success("Partido añadido");
    }
  });

  const updateMatchMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.MatchMinutes.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchMinutes', selectedCategory] });
    }
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.MatchMinutes.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchMinutes', selectedCategory] });
      toast.success("Partido eliminado");
    }
  });

  const handleSaveMatch = (recordId, data) => {
    updateMatchMutation.mutate({ id: recordId, data });
  };

  const handleDeleteMatch = (recordId) => {
    if (window.confirm("¿Eliminar este partido del control de minutos?")) {
      deleteMatchMutation.mutate(recordId);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-blue-800 rounded-2xl p-5 lg:p-8 text-white shadow-xl">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold flex items-center gap-2">
              <Clock className="w-7 h-7" /> Control de Minutos
            </h1>
            <p className="text-slate-300 mt-1 text-sm">
              Registra los minutos jugados por cada jugador en cada partido
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={showStats ? "default" : "outline"}
              onClick={() => setShowStats(!showStats)}
              className={showStats ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-white/30 text-white hover:bg-white/10"}
              size="sm"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              {showStats ? "Ocultar Stats" : "Ver Stats"}
            </Button>
            <Button
              onClick={() => setShowAddMatch(true)}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Añadir Partido
            </Button>
          </div>
        </div>
      </div>

      {/* Category selector */}
      {allCategories.length > 1 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600">Categoría:</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info banner */}
      {matchRecords.length === 0 && (
        <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
          <CardContent className="p-6 text-center">
            <Clock className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <h3 className="font-bold text-blue-900 text-lg mb-1">Sin partidos registrados</h3>
            <p className="text-sm text-blue-700 mb-4">
              Añade partidos para empezar a registrar los minutos de cada jugador.
              Haz clic en cada celda para introducir los minutos.
            </p>
            <Button onClick={() => setShowAddMatch(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" /> Añadir Primer Partido
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Spreadsheet */}
      {matchRecords.length > 0 && (
        <MinutesSpreadsheet
          players={players}
          matchRecords={matchRecords}
          onSaveMatch={handleSaveMatch}
          onDeleteMatch={handleDeleteMatch}
        />
      )}

      {/* Stats */}
      {showStats && matchRecords.length > 0 && (
        <MinutesStatsPanel players={players} matchRecords={matchRecords} />
      )}

      {/* Help text */}
      {matchRecords.length > 0 && (
        <div className="text-xs text-slate-500 text-center space-y-1">
          <p>Haz clic en cualquier celda para editar los minutos. Pulsa Enter para guardar, Escape para cancelar.</p>
          <p>Los cambios se guardan automáticamente al salir de la celda.</p>
        </div>
      )}

      {/* Add match dialog */}
      <AddMatchDialog
        open={showAddMatch}
        onOpenChange={setShowAddMatch}
        onAdd={(data) => createMatchMutation.mutate(data)}
      />
    </div>
  );
}