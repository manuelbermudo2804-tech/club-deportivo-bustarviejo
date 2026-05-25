import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shirt, Grid3x3, AlertTriangle, History as HistoryIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

import DorsalGrid from "@/components/dorsales/DorsalGrid";
import AssignDorsalDialog from "@/components/dorsales/AssignDorsalDialog";
import AssignmentDetailDialog from "@/components/dorsales/AssignmentDetailDialog";
import ConflictPreviewPanel from "@/components/dorsales/ConflictPreviewPanel";
import PendingPlayersPanel from "@/components/dorsales/PendingPlayersPanel";
import { getNextSeason, loadDorsalData } from "@/components/dorsales/dorsalHelpers";

const CATEGORIAS = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
];

export default function DorsalManagement() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [temporadas, setTemporadas] = useState([]);
  const [temporada, setTemporada] = useState("");
  const [currentSeasonStr, setCurrentSeasonStr] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [players, setPlayers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [currentAssignmentsAll, setCurrentAssignmentsAll] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDorsal, setAssignDorsal] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAssignment, setDetailAssignment] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        if (u?.role !== "admin") {
          toast.error("Solo administradores pueden acceder");
          return;
        }
        const seasons = await base44.entities.SeasonConfig.list();
        const activa = seasons.find((s) => s.activa);
        const current = activa?.temporada || "2025-2026";
        setCurrentSeasonStr(current);
        const next = getNextSeason(current);
        const list = Array.from(new Set([next, current, ...seasons.map((s) => s.temporada)])).filter(Boolean);
        setTemporadas(list);
        setTemporada(next);
      } catch (e) {
        console.error(e);
        toast.error("Error cargando datos");
      }
    })();
  }, []);

  useEffect(() => {
    if (!temporada) return;
    (async () => {
      setLoading(true);
      try {
        const { players, assignments, configs } = await loadDorsalData(temporada);
        setPlayers(players);
        setAssignments(assignments);
        setConfigs(configs);
        // Cargar también todas las asignaciones de TODAS las temporadas para detectar conflictos futuros
        const all = await base44.entities.DorsalAssignment.list();
        setCurrentAssignmentsAll(all);
      } catch (e) {
        console.error(e);
        toast.error("Error cargando datos de la temporada");
      } finally {
        setLoading(false);
      }
    })();
  }, [temporada]);

  const config = useMemo(
    () => configs.find((c) => c.categoria === categoria) || { dorsal_min: 1, dorsal_max: 25, dorsales_reservados: [] },
    [configs, categoria]
  );

  const assignmentsEnCategoria = useMemo(
    () => assignments.filter((a) => a.categoria === categoria),
    [assignments, categoria]
  );

  const handleClickFree = (dorsal) => {
    setAssignDorsal(dorsal);
    setAssignOpen(true);
  };

  const handleClickAssigned = (assignment) => {
    setDetailAssignment(assignment);
    setDetailOpen(true);
  };

  const refresh = async () => {
    if (!temporada) return;
    const { players, assignments, configs } = await loadDorsalData(temporada);
    setPlayers(players);
    setAssignments(assignments);
    setConfigs(configs);
  };

  const playersPendientes = useMemo(() => {
    const ids = new Set(assignmentsEnCategoria.filter((a) => a.estado === "asignado").map((a) => a.jugador_id));
    return players.filter((p) => {
      if (!p.activo) return false;
      if (ids.has(p.id)) return false;
      const cats = p.categorias?.length ? p.categorias : [p.deporte || p.categoria_principal].filter(Boolean);
      return cats.includes(categoria);
    });
  }, [players, assignmentsEnCategoria, categoria]);

  if (user && user.role !== "admin") {
    return (
      <div className="p-8 text-center">
        <div className="text-2xl">🔒</div>
        <p className="mt-2 text-slate-600">Solo administradores pueden acceder a Gestión de Dorsales</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
          <Shirt className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gestión de Dorsales</h1>
          <p className="text-sm text-slate-600">Asigna dorsales por temporada, categoría y previsiones de conflictos</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600 uppercase mb-1 block">Temporada</label>
            <Select value={temporada} onValueChange={setTemporada}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {temporadas.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t} {t === currentSeasonStr && "(actual)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600 uppercase mb-1 block">Categoría</label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="grid">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="grid" className="gap-2">
            <Grid3x3 className="w-4 h-4" />
            <span className="hidden sm:inline">Cuadrícula</span>
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Conflictos</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <HistoryIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          {loading ? (
            <Card><CardContent className="p-8 text-center text-slate-500">Cargando...</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="font-semibold">{categoria}</h2>
                      <div className="text-xs text-slate-500">
                        Dorsales {config.dorsal_min}–{config.dorsal_max}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        {assignmentsEnCategoria.filter((a) => a.estado === "asignado").length} asignados
                      </Badge>
                      <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                        {playersPendientes.length} pendientes
                      </Badge>
                    </div>
                  </div>
                  <DorsalGrid
                    min={config.dorsal_min}
                    max={config.dorsal_max}
                    reservados={config.dorsales_reservados || []}
                    assignments={assignmentsEnCategoria}
                    onClickFree={handleClickFree}
                    onClickAssigned={handleClickAssigned}
                  />
                </CardContent>
              </Card>

              <PendingPlayersPanel
                players={players}
                assignments={assignmentsEnCategoria}
                categoria={categoria}
                onAssignClick={(p) => {
                  // Al pulsar "Asignar" en un pendiente, sugerimos su preferente si está libre
                  const ocupados = new Set(assignmentsEnCategoria.filter((a) => a.estado === "asignado").map((a) => Number(a.dorsal)));
                  let proposed = p.dorsal_preferente;
                  if (proposed && ocupados.has(Number(proposed))) proposed = null;
                  if (!proposed) {
                    for (let i = config.dorsal_min; i <= config.dorsal_max; i++) {
                      if (!ocupados.has(i) && !(config.dorsales_reservados || []).includes(i)) {
                        proposed = i; break;
                      }
                    }
                  }
                  setAssignDorsal(proposed);
                  setAssignOpen(true);
                }}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="conflicts">
          <ConflictPreviewPanel
            players={players}
            currentAssignments={currentAssignmentsAll}
            nextSeason={temporada}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Histórico completo · {categoria}</h3>
              <div className="space-y-2 max-h-[600px] overflow-auto">
                {currentAssignmentsAll
                  .filter((a) => a.categoria === categoria)
                  .sort((a, b) => String(b.temporada).localeCompare(String(a.temporada)))
                  .map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-black text-orange-600 w-12 text-center">#{a.dorsal}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{a.jugador_nombre}</div>
                        <div className="text-xs text-slate-500">{a.temporada}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">{a.estado}</Badge>
                    </div>
                  ))}
                {currentAssignmentsAll.filter((a) => a.categoria === categoria).length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-4">Sin asignaciones históricas en esta categoría</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssignDorsalDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        dorsal={assignDorsal}
        temporada={temporada}
        categoria={categoria}
        jugadoresPendientes={playersPendientes}
        onAssigned={refresh}
      />

      <AssignmentDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        assignment={detailAssignment}
        onChanged={refresh}
      />
    </div>
  );
}