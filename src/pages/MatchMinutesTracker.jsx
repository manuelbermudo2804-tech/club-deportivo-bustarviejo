import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, BarChart3, Loader2 } from "lucide-react";

import MinutesSpreadsheet from "../components/minutes/MinutesSpreadsheet";
import MinutesStatsPanel from "../components/minutes/MinutesStatsPanel";

const CLUB_NAME = "C.D. BUSTARVIEJO";

export default function MatchMinutesTracker() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showStats, setShowStats] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      const cats = u.categorias_entrena || [];
      if (cats.length > 0) setSelectedCategory(cats[0]);
    });
  }, []);

  const isAdmin = user?.role === "admin";
  const isCoordinator = user?.es_coordinador === true;

  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigsMinutes'],
    queryFn: () => base44.entities.CategoryConfig.filter({ activa: true }),
    staleTime: 300000,
  });

  const allCategories = useMemo(() => {
    if (isAdmin || isCoordinator) return categoryConfigs.filter(c => !c.es_actividad_complementaria).map(c => c.nombre).filter(Boolean);
    return user?.categorias_entrena || [];
  }, [isAdmin, isCoordinator, categoryConfigs, user]);

  useEffect(() => {
    if (!selectedCategory && allCategories.length > 0) setSelectedCategory(allCategories[0]);
  }, [allCategories, selectedCategory]);

  // Jugadores de la categoría
  const { data: players = [] } = useQuery({
    queryKey: ['playersMinutes', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const list = await base44.entities.Player.filter({ activo: true });
      return list
        .filter(p => (p.categoria_principal || p.deporte) === selectedCategory)
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    },
    enabled: !!selectedCategory,
    staleTime: 60000,
  });

  // Rivales desde Clasificacion (todos los equipos menos el nuestro)
  const { data: rivals = [] } = useQuery({
    queryKey: ['rivalsMinutes', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const clasif = await base44.entities.Clasificacion.filter({ categoria: selectedCategory });
      return clasif
        .filter(c => !c.nombre_equipo?.toUpperCase().includes("BUSTARVIEJO"))
        .sort((a, b) => (a.posicion || 99) - (b.posicion || 99))
        .map(c => c.nombre_equipo);
    },
    enabled: !!selectedCategory,
    staleTime: 300000,
  });

  // Resultados de la federación (para saber jornada y L/V de cada rival)
  const { data: resultados = [] } = useQuery({
    queryKey: ['resultadosMinutes', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const all = await base44.entities.Resultado.filter({ categoria: selectedCategory });
      // Solo partidos donde juega Bustarviejo
      return all.filter(r => 
        r.local?.toUpperCase().includes("BUSTARVIEJO") ||
        r.visitante?.toUpperCase().includes("BUSTARVIEJO")
      ).sort((a, b) => (a.jornada || 0) - (b.jornada || 0));
    },
    enabled: !!selectedCategory,
    staleTime: 60000,
  });

  // MatchMinutes existentes
  const { data: matchMinutes = [], isLoading: loadingMinutes } = useQuery({
    queryKey: ['matchMinutes', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      return base44.entities.MatchMinutes.filter({ categoria: selectedCategory });
    },
    enabled: !!selectedCategory,
    staleTime: 30000,
  });

  // Construir la estructura de partidos: cada rival × ida/vuelta
  const matchStructure = useMemo(() => {
    if (!rivals.length) return [];
    const numRivals = rivals.length;
    // Jornadas: la 1ª vuelta son jornadas 1..numRivals, la 2ª son numRivals+1..numRivals*2
    // Pero podría no haber tantas jornadas todavía

    return rivals.flatMap(rival => {
      return ["ida", "vuelta"].map(vuelta => {
        // Buscar el resultado real de este partido
        const res = resultados.find(r => {
          const isOurMatch = r.local?.toUpperCase().includes("BUSTARVIEJO") || r.visitante?.toUpperCase().includes("BUSTARVIEJO");
          if (!isOurMatch) return false;
          const rivalInMatch = r.local?.toUpperCase().includes("BUSTARVIEJO") ? r.visitante : r.local;
          if (rivalInMatch !== rival) return false;
          // Determinar si es ida o vuelta por jornada
          const halfPoint = Math.ceil(numRivals); // numRivals jornadas = 1ª vuelta
          if (vuelta === "ida") return (r.jornada || 0) <= halfPoint;
          return (r.jornada || 0) > halfPoint;
        });

        const localVisitante = res 
          ? (res.local?.toUpperCase().includes("BUSTARVIEJO") ? "Local" : "Visitante")
          : null;

        // Buscar MatchMinutes existente
        const existing = matchMinutes.find(m => 
          m.rival === rival && m.vuelta === vuelta
        );

        return {
          rival,
          vuelta,
          jornada: res?.jornada || null,
          localVisitante,
          resultado: res ? `${res.goles_local || 0}-${res.goles_visitante || 0}` : null,
          estado: res?.estado || null,
          matchMinutesId: existing?.id || null,
          minutos_jugadores: existing?.minutos_jugadores || [],
          duracion_partido: existing?.duracion_partido || 0,
        };
      });
    });
  }, [rivals, resultados, matchMinutes]);

  // Auto-crear registros MatchMinutes que no existen
  const createMutation = useMutation({
    mutationFn: async ({ rival, vuelta, jornada, localVisitante }) => {
      const seasons = await base44.entities.SeasonConfig.filter({ activa: true });
      return base44.entities.MatchMinutes.create({
        categoria: selectedCategory,
        rival,
        vuelta,
        jornada: jornada || 0,
        local_visitante: localVisitante || "Local",
        duracion_partido: 0,
        minutos_jugadores: players.map(p => ({
          jugador_id: p.id,
          jugador_nombre: p.nombre,
          minutos_1parte: 0,
          minutos_2parte: 0,
        })),
        entrenador_email: user?.email || "",
        temporada: seasons[0]?.temporada || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchMinutes', selectedCategory] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.MatchMinutes.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchMinutes', selectedCategory] });
    },
  });

  // Cuando el entrenador hace click en una celda y no existe el registro, crearlo
  const ensureRecord = useCallback(async (match) => {
    if (match.matchMinutesId) return match.matchMinutesId;
    const result = await createMutation.mutateAsync({
      rival: match.rival,
      vuelta: match.vuelta,
      jornada: match.jornada,
      localVisitante: match.localVisitante,
    });
    return result.id;
  }, [createMutation, selectedCategory, players, user]);

  const handleSave = useCallback(async (match, updatedMinutos) => {
    const id = await ensureRecord(match);
    updateMutation.mutate({ id, data: { minutos_jugadores: updatedMinutos } });
  }, [ensureRecord, updateMutation]);

  const isLoading = loadingMinutes;

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
              Minutos jugados por cada jugador en cada partido de liga
            </p>
          </div>
          <Button
            variant={showStats ? "default" : "outline"}
            onClick={() => setShowStats(!showStats)}
            className={showStats ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-white/30 text-white hover:bg-white/10"}
            size="sm"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            {showStats ? "Ocultar Stats" : "Ver Stats"}
          </Button>
        </div>
      </div>

      {/* Selector categoría */}
      {allCategories.length > 1 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600">Categoría:</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Selecciona" />
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

      {allCategories.length === 1 && (
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">{selectedCategory}</Badge>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : rivals.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="p-8 text-center text-slate-500">
            <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <h3 className="font-bold text-lg mb-1">Sin datos de competición</h3>
            <p className="text-sm">No se han encontrado clasificaciones para esta categoría. Los rivales se cargan automáticamente desde los datos de la federación.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <MinutesSpreadsheet
            players={players}
            matchStructure={matchStructure}
            onSave={handleSave}
          />

          {showStats && (
            <MinutesStatsPanel
              players={players}
              matchStructure={matchStructure}
            />
          )}

          <div className="text-xs text-slate-500 text-center">
            Haz clic en cualquier celda para editar. Los rivales se cargan de la clasificación de la federación.
          </div>
        </>
      )}
    </div>
  );
}