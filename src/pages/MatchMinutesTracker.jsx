import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, BarChart3, Loader2, Users, CalendarDays, ShieldCheck } from "lucide-react";

import MinutesSpreadsheet from "../components/minutes/MinutesSpreadsheet";
import MinutesStatsPanel from "../components/minutes/MinutesStatsPanel";
import EquidadMinutosPanel from "../components/minutes/EquidadMinutosPanel";
import { playerInCategory } from "../components/utils/playerCategoryFilter";
import { useStaffPlayers } from "../hooks/useStaffPlayers";

const CLUB_NAME = "C.D. BUSTARVIEJO";

export default function MatchMinutesTracker() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showStats, setShowStats] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // No fijamos selectedCategory aquí. Se selecciona después con allCategories
      // (que ya tiene en cuenta admin/coordinador y la primera con jugadores).
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
    let cats;
    if (isAdmin || isCoordinator) {
      cats = categoryConfigs.filter(c => !c.es_actividad_complementaria).map(c => c.nombre).filter(Boolean);
    } else {
      // Combinar entrena + coordina (algunos staff son ambos)
      cats = [
        ...(user?.categorias_entrena || []),
        ...(user?.categorias_coordina || [])
      ];
    }
    return [...new Set(cats)];
  }, [isAdmin, isCoordinator, categoryConfigs, user]);

  useEffect(() => {
    if (!selectedCategory && allCategories.length > 0) setSelectedCategory(allCategories[0]);
  }, [allCategories, selectedCategory]);

  // Hook unificado para todos los jugadores activos del staff
  const { data: allActivePlayers = [] } = useStaffPlayers(user, { onlyActive: true, queryKeyExtra: 'minutes' });
  // Filtrar localmente por categoría (soporta categoria_principal, deporte legacy y categorias[])
  const players = useMemo(() => {
    if (!selectedCategory) return [];
    return allActivePlayers
      .filter(p => playerInCategory(p, selectedCategory))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [allActivePlayers, selectedCategory]);

  // Rivales desde Clasificacion (todos los equipos menos el nuestro)
  const { data: rivals = [] } = useQuery({
    queryKey: ['rivalsMinutes', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const clasif = await base44.entities.Clasificacion.filter({ categoria: selectedCategory });
      const names = clasif
        .filter(c => !c.nombre_equipo?.toUpperCase().includes("BUSTARVIEJO"))
        .sort((a, b) => (a.posicion || 99) - (b.posicion || 99))
        .map(c => c.nombre_equipo);
      return [...new Set(names)];
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

  // Temporada activa para filtrar
  const { data: activeSeasons = [] } = useQuery({
    queryKey: ['activeSeasonMinutes'],
    queryFn: () => base44.entities.SeasonConfig.filter({ activa: true }),
    staleTime: 600000,
  });
  const currentSeason = activeSeasons[0]?.temporada || "";

  // MatchMinutes existentes (filtrados por temporada activa)
  const { data: matchMinutes = [], isLoading: loadingMinutes } = useQuery({
    queryKey: ['matchMinutes', selectedCategory, currentSeason],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const filter = { categoria: selectedCategory };
      if (currentSeason) filter.temporada = currentSeason;
      return base44.entities.MatchMinutes.filter(filter);
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
        temporada: currentSeason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchMinutes', selectedCategory, currentSeason] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.MatchMinutes.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchMinutes', selectedCategory, currentSeason] });
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
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-8 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      {/* Cabecera homogénea */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14"><Clock className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" /></div>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Área deportiva · Rendimiento del equipo</p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Control de minutos</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Registra los minutos jugados por cada jugador en los partidos de liga y consulta el reparto de participación del equipo.</p>
            </div>
          </div>
          <Button variant={showStats ? "default" : "outline"} onClick={() => setShowStats(!showStats)} className={showStats ? "w-full shrink-0 rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-700 sm:w-auto" : "w-full shrink-0 rounded-xl border-white/25 bg-white/5 font-semibold text-white hover:bg-white/10 sm:w-auto"} size="sm">
            <BarChart3 className="mr-2 h-4 w-4" />{showStats ? "Ocultar estadísticas" : "Ver estadísticas"}
          </Button>
        </div>
      </section>

      {/* Selector categoría */}
      {allCategories.length > 1 && (
        <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Users className="h-4 w-4 text-orange-600" />Categoría del equipo</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full rounded-xl sm:max-w-xs">
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
          <Badge className="w-fit rounded-lg border border-orange-100 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-800"><Users className="mr-1.5 inline h-3.5 w-3.5" />{selectedCategory}</Badge>
        </div>
      )}

      {isLoading ? (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="py-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-600" /><p className="mt-3 text-sm text-slate-500">Cargando control de minutos...</p></CardContent></Card>
      ) : rivals.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm">
          <CardContent className="p-6 text-center text-slate-500 sm:p-10">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50"><CalendarDays className="h-7 w-7 text-orange-600" /></div>
            <h3 className="font-bold text-lg mb-1">Sin datos de competición</h3>
            <p className="text-sm">No se han encontrado clasificaciones para esta categoría. Los rivales se cargan automáticamente desde los datos de la federación.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <EquidadMinutosPanel
            players={players}
            matchStructure={matchStructure}
          />

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

          <div className="flex items-start justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs leading-relaxed text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" /><span>Haz clic en cualquier celda para editar los minutos. Los rivales se cargan automáticamente desde la clasificación de la federación.</span></div>
        </>
      )}
    </div>
  );
}