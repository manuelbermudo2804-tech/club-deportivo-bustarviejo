import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shirt, Grid3x3, AlertTriangle, History as HistoryIcon, Upload, Users, CalendarDays, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

import DorsalGrid from "@/components/dorsales/DorsalGrid";
import AssignDorsalDialog from "@/components/dorsales/AssignDorsalDialog";
import AssignmentDetailDialog from "@/components/dorsales/AssignmentDetailDialog";
import ConflictPreviewPanel from "@/components/dorsales/ConflictPreviewPanel";
import PendingPlayersPanel from "@/components/dorsales/PendingPlayersPanel";
import ImportExcelDialog from "@/components/dorsales/ImportExcelDialog";
import PendingNotificationsPanel from "@/components/dorsales/PendingNotificationsPanel";
import ExportDorsalesButton from "@/components/dorsales/ExportDorsalesButton";
import { getNextSeason, loadDorsalData, getEffectiveAssignments } from "@/components/dorsales/dorsalHelpers";

const CATEGORIAS = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Fútbol Alevín Femenino",
];

export default function DorsalManagement() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [temporadas, setTemporadas] = useState([]);
  const [temporada, setTemporada] = useState("");
  const [currentSeasonStr, setCurrentSeasonStr] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [categoriasCompiten, setCategoriasCompiten] = useState([]);
  const listaCategorias = useMemo(
    () => Array.from(new Set([...CATEGORIAS, ...categoriasCompiten])),
    [categoriasCompiten]
  );
  const [players, setPlayers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [currentAssignmentsAll, setCurrentAssignmentsAll] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDorsal, setAssignDorsal] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAssignment, setDetailAssignment] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

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
        const list = Array.from(new Set([current, next, ...seasons.map((s) => s.temporada)])).filter(Boolean);
        setTemporadas(list);
        setTemporada(current);
        const cats = await base44.entities.CategoryConfig.filter({ activa: true, compite_en_liga: true });
        setCategoriasCompiten(cats.map((c) => c.nombre).filter(Boolean));
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
    () => {
      const saved = configs.find((c) => c.categoria === categoria);
      return {
        dorsal_min: saved?.dorsal_min || 1,
        dorsal_max: saved?.dorsal_max || 99,
        dorsales_reservados: saved?.dorsales_reservados || [],
        tienda_url: saved?.tienda_url,
      };
    },
    [configs, categoria]
  );

  const assignmentsEnCategoria = useMemo(
    () => getEffectiveAssignments(players, assignments, currentAssignmentsAll, categoria),
    [players, assignments, currentAssignmentsAll, categoria]
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
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-8 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14"><Shirt className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" /></div>
            <div className="min-w-0"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Administración · Equipaciones</p><h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Gestión de dorsales</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Asigna dorsales por temporada y categoría, revisa jugadores pendientes y anticipa posibles conflictos.</p></div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
        <ExportDorsalesButton
          assignments={currentAssignmentsAll.filter((a) => String(a.temporada) === String(temporada))}
          categorias={listaCategorias}
          temporada={temporada}
          categoriaActual={categoria}
        />
        <Button onClick={() => setImportOpen(true)} className="w-full gap-2 rounded-xl bg-orange-600 font-semibold hover:bg-orange-700 sm:w-auto">
          <Upload className="w-4 h-4" />Importar Excel
        </Button>
          </div>
        </div>
      </section>

      <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="grid min-w-0 grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2">
          <div className="flex-1">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><CalendarDays className="h-3.5 w-3.5 text-orange-600" />Temporada</label>
            <Select value={temporada} onValueChange={setTemporada}>
              <SelectTrigger className="w-full rounded-xl"> <SelectValue /></SelectTrigger>
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
            <label className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Users className="h-3.5 w-3.5 text-orange-600" />Categoría</label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="w-full rounded-xl"> <SelectValue /></SelectTrigger>
              <SelectContent>
                {listaCategorias.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="grid">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="grid" className="min-w-0 gap-2 rounded-xl px-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <Grid3x3 className="w-4 h-4" />
            <span className="hidden sm:inline">Cuadrícula</span>
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="min-w-0 gap-2 rounded-xl px-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Conflictos</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="min-w-0 gap-2 rounded-xl px-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <HistoryIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4 space-y-4">
          {loading ? (
            <Card><CardContent className="p-8 text-center text-slate-500">Cargando...</CardContent></Card>
          ) : (
            <>
              <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <CardContent className="min-w-0 p-3 sm:p-5">
                  <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">{categoria}</h2>
                      <div className="text-xs text-slate-500">
                        Dorsales {config.dorsal_min}–{config.dorsal_max}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800">
                        {assignmentsEnCategoria.filter((a) => a.estado === "asignado").length} asignados
                      </Badge>
                      <Badge className="rounded-lg border border-orange-200 bg-orange-50 text-orange-800">
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

              <PendingNotificationsPanel
                assignments={assignmentsEnCategoria}
                categoria={categoria}
                onOpenAssignment={handleClickAssigned}
              />

              <PendingPlayersPanel
                players={players}
                assignments={assignmentsEnCategoria}
                categoria={categoria}
                temporada={temporada}
                config={config}
                onAutoAssigned={refresh}
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

        <TabsContent value="history" className="mt-4">
          <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <h3 className="font-semibold mb-3">Histórico completo · {categoria}</h3>
              <div className="space-y-2 max-h-[600px] overflow-auto">
                {currentAssignmentsAll
                  .filter((a) => a.categoria === categoria)
                  .sort((a, b) => String(b.temporada).localeCompare(String(a.temporada)))
                  .map((a) => (
                    <div key={a.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="w-12 shrink-0 text-center text-xl font-black text-orange-600">#{a.dorsal}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{a.jugador_nombre}</div>
                        <div className="text-xs text-slate-500">Temporada {a.temporada}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0 rounded-lg text-xs">{a.estado}</Badge>
                    </div>
                  ))}
                {currentAssignmentsAll.filter((a) => a.categoria === categoria).length === 0 && (
                  <div className="py-10 text-center text-sm text-slate-500"><HistoryIcon className="mx-auto mb-2 h-8 w-8 text-slate-300" />Sin asignaciones históricas en esta categoría</div>
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

      <ImportExcelDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        temporada={temporada}
        players={players}
        allAssignments={currentAssignmentsAll}
        onImported={refresh}
      />
    </div>
  );
}