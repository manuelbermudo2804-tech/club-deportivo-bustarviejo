import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import StandingsDisplay from "../components/standings/StandingsDisplay";
import ResultsList from "../components/results/ResultsList";
import ScorersList from "../components/scorers/ScorersList";
import QuickMatchObservationForm from "../components/coach/QuickMatchObservationForm";
import RivalAnalysisModal from "../components/coach/RivalAnalysisModal";
import NextMatchRffm from "../components/competition/NextMatchRffm";
import NextMatchFromDB from "../components/competition/NextMatchFromDB";
import { Trophy, List, Users, Target, Zap, Search, Star, StarOff, Settings } from "lucide-react";
import ErrorBoundary from "../components/common/ErrorBoundary";

const FALLBACK_CATEGORIES = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)",
];

export default function CentroCompeticionTecnico() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isCoach = !!me?.es_entrenador && !me?.es_coordinador;
  const isCoordinator = !!me?.es_coordinador;

  // Categorías dinámicas: solo las que tienen compite_en_liga=true
  const { data: dynamicCategories } = useQuery({
    queryKey: ['competition-categories'],
    queryFn: async () => {
      const all = await base44.entities.CategoryConfig.filter({ compite_en_liga: true, activa: true });
      return [...new Set(all.map(c => c.nombre).filter(Boolean))];
    },
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
  const CATEGORIES = (dynamicCategories && dynamicCategories.length > 0) ? dynamicCategories : FALLBACK_CATEGORIES;

  // Categorías visibles para el técnico
  const myCats = React.useMemo(() => {
    if (isCoordinator || isCoach) return CATEGORIES;
    return CATEGORIES;
  }, [isCoordinator, isCoach, CATEGORIES]);

  const getUrlParam = (key, fallback) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || fallback;
  };
  const storedFav = typeof window !== 'undefined' ? localStorage.getItem('fav_comp_cat') : null;

  const initialCatGuess = getUrlParam('cat', storedFav || (myCats[0] || CATEGORIES[0]));
  const [category, setCategory] = React.useState(initialCatGuess);
  React.useEffect(() => {
    if (!myCats.includes(category)) {
      setCategory(myCats.includes(initialCatGuess) ? initialCatGuess : (myCats[0] || CATEGORIES[0]));
    }
  }, [myCats]);

  const [view, setView] = React.useState(getUrlParam('vista', 'clasificacion')); // 'clasificacion' | 'resultados' | 'goleadores'
  const [search, setSearch] = React.useState("");
  const [fav, setFav] = React.useState(() => (typeof window !== 'undefined' ? localStorage.getItem('fav_comp_cat') === initialCatGuess : false));
  React.useEffect(() => { setFav((typeof window !== 'undefined' ? localStorage.getItem('fav_comp_cat') : '') === category); }, [category]);

  const toggleFav = () => {
    if (fav) {
      localStorage.removeItem('fav_comp_cat');
      setFav(false);
    } else {
      localStorage.setItem('fav_comp_cat', category);
      setFav(true);
    }
  };

  // Config categorías (técnicos)
  const [showConfig, setShowConfig] = React.useState(false);
  const [visibleCats, setVisibleCats] = React.useState(() => {
    try {
      const key = isCoordinator ? 'comp_visible_categories_coord' : 'comp_visible_categories_coach';
      const stored = localStorage.getItem(key);
      const arr = stored ? JSON.parse(stored) : myCats;
      return Array.isArray(arr) && arr.length ? arr : myCats;
    } catch { return myCats; }
  });
  React.useEffect(() => {
    // Si cambian mis categorías (por rol), actualizar visibles conservando selección válida
    setVisibleCats((prev) => {
      const valid = (prev || []).filter(c => myCats.includes(c));
      return valid.length ? valid : myCats;
    });
  }, [myCats]);

  React.useEffect(() => {
    if (!visibleCats.includes(category)) {
      setCategory(visibleCats[0] || (myCats[0] || CATEGORIES[0]));
    }
  }, [visibleCats, myCats]);

  const toggleCatVisibility = (cat) => setVisibleCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const selectAllCats = () => setVisibleCats(myCats);
  const resetCats = () => setVisibleCats(myCats);
  const saveCats = () => {
    try {
      const key = isCoordinator ? 'comp_visible_categories_coord' : 'comp_visible_categories_coach';
      localStorage.setItem(key, JSON.stringify(visibleCats));
    } catch {}
    setShowConfig(false);
  };

  // Sync URL params
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('cat', category);
    params.set('vista', view);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [category, view]);

  // Prefetch desactivado - se carga bajo demanda al cambiar de vista
  // Esto reduce uso de memoria en dispositivos con poca RAM

  // StandingsConfig for RFFM URLs
  const { data: standingsConfig } = useQuery({
    queryKey: ['standings-config-tech', category],
    queryFn: async () => {
      const list = await base44.entities.StandingsConfig.filter({ categoria: category });
      return list?.[0] || null;
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Clasificación (último pack como en CentroCompeticion)
  const { data: standingsPack, isLoading } = useQuery({
    queryKey: ["centro-standings-tech", category],
    queryFn: async () => {
      const recs = await base44.entities.Clasificacion.filter({ categoria: category }, "-updated_date", 200);
      if (!recs || recs.length === 0) return null;
      const latest = recs[0];
      const temporada = latest.temporada;
      const tempRows = recs.filter((r) => r.temporada === temporada);
      const jornadas = tempRows.map((r) => r.jornada || 0);
      const maxJornada = jornadas.length ? Math.max(...jornadas) : null;
      const rows = maxJornada != null ? tempRows.filter((r) => (r.jornada || 0) === maxJornada) : tempRows;
      const fecha_actualizacion = latest.updated_date || new Date().toISOString();
      return { categoria: category, temporada, jornada: maxJornada ?? "-", fecha_actualizacion, data: rows };
    },
    staleTime: 5 * 60_000,
    gcTime: 60 * 60_000,
  });

  // Filtro rápido por buscador (como en el centro familia)
  const filteredStandingsPack = React.useMemo(() => {
    if (!standingsPack || !search.trim()) return standingsPack;
    const q = search.toLowerCase();
    return { ...standingsPack, data: (standingsPack.data || []).filter(r => (r.nombre_equipo || '').toLowerCase().includes(q)) };
  }, [standingsPack, search]);




  // Próximo partido de la categoría actual para análisis/registro
  const { data: callups = [] } = useQuery({
    queryKey: ["convocatorias-tech", category],
    queryFn: () => base44.entities.Convocatoria.filter({ categoria: category }, "-fecha_partido", 200),
  });

  const today = new Date().toISOString().split("T")[0];
  const nextCallup = React.useMemo(() =>
    (callups || [])
      .filter((c) => c.publicada && !c.cerrada && c.fecha_partido >= today)
      .sort((a, b) => a.fecha_partido.localeCompare(b.fecha_partido) || (a.hora_partido || "").localeCompare(b.hora_partido || ""))[0]
  , [callups, today]);

  const lastPlayed = React.useMemo(() =>
    (callups || [])
      .filter((c) => c.publicada && !c.cerrada && c.fecha_partido < today)
      .sort((a, b) => b.fecha_partido.localeCompare(a.fecha_partido) || (b.hora_partido || "").localeCompare(a.hora_partido || ""))[0]
  , [callups, today]);

  const matchForForm = nextCallup || lastPlayed;

  // Registro rápido post-partido
  const [showObservationForm, setShowObservationForm] = React.useState(false);
  const autoAnalysisDoneRef = React.useRef(false);
  const autoObservationDoneRef = React.useRef(false);

  // Auto-análisis desactivado al entrar para evitar consumo de memoria/red en dispositivos bajos
  // El usuario puede pulsar el botón "Analizar Próximo Rival" manualmente

  // Auto: abrir registro rápido tras el partido O si viene de la alerta con openObservation=true
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpen = params.get('openObservation') === 'true';
    
    if (shouldOpen && !autoObservationDoneRef.current) {
      autoObservationDoneRef.current = true;
      setShowObservationForm(true);
      // Limpiar param de la URL
      params.delete('openObservation');
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    } else if (!nextCallup && lastPlayed && !autoObservationDoneRef.current) {
      autoObservationDoneRef.current = true;
      setShowObservationForm(true);
    }
  }, [nextCallup, lastPlayed]);

  // Análisis de rival (usa el mismo patrón de CoachStandingsAnalysis)
  const [isAnalyzingRival, setIsAnalyzingRival] = React.useState(false);
  const [rivalAnalysis, setRivalAnalysis] = React.useState(null);
  const [showAnalysisModal, setShowAnalysisModal] = React.useState(false);
  const analyzeRival = async () => {
    if (!nextCallup) return alert("No hay próximo partido para analizar");
    setIsAnalyzingRival(true);
    try {
      const latest = standingsPack;
      const rivalName = nextCallup.rival;
      const rivalStanding = latest?.data?.find((s) => s.nombre_equipo?.toLowerCase().includes((rivalName || "").toLowerCase()));

      const resultados = await base44.entities.Resultado.filter({ categoria: category }, "-jornada", 200);
      const goleadores = await base44.entities.Goleador.filter({ categoria: category }, "-goles", 200);

      const rivalResults = resultados
        .filter((r) => (r.local || "").toLowerCase().includes((rivalName || "").toLowerCase()) || (r.visitante || "").toLowerCase().includes((rivalName || "").toLowerCase()))
        .sort((a, b) => (b.jornada || 0) - (a.jornada || 0))
        .slice(0, 5);

      const rivalScorers = goleadores
        .filter((g) => (g.equipo || "").toLowerCase().includes((rivalName || "").toLowerCase()))
        .sort((a, b) => (b.goles || 0) - (a.goles || 0))
        .slice(0, 3);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Genera un informe PRE-PARTIDO breve y práctico para el cuerpo técnico.\n\nRival: ${rivalName}\nCategoría: ${category}\nFecha: ${nextCallup.fecha_partido} (${nextCallup.hora_partido || 'por confirmar'})\nCampo: ${nextCallup.local_visitante || 'N/A'}\n\nClasificación rival: ${rivalStanding ? `${rivalStanding.posicion}º, ${rivalStanding.puntos} pts` : 'sin datos'}\n\nÚltimos resultados del rival:\n${rivalResults.map(r => `J${r.jornada}: ${r.local} ${r.goles_local ?? '?'}-${r.goles_visitante ?? '?'} ${r.visitante}`).join('\n') || '-'}\n\nGoleadores destacados del rival:\n${rivalScorers.map(g => `${g.jugador_nombre} (${g.goles})`).join('\n') || '-'}\n\nDevuelve: racha (1 frase), puntos_fuertes (3 bullets), debilidades (3 bullets), plan_tactico (3 bullets).`,
        response_json_schema: {
          type: "object",
          properties: {
            racha: { type: "string" },
            puntos_fuertes: { type: "array", items: { type: "string" } },
            debilidades: { type: "array", items: { type: "string" } },
            plan_tactico: { type: "array", items: { type: "string" } },
          },
        },
      });
      setRivalAnalysis(result);
      setShowAnalysisModal(true);
    } catch (e) {
      console.error(e);
      alert("No se pudo generar el análisis");
    } finally {
      setIsAnalyzingRival(false);
    }
  };

  const ViewToggle = () => (
    <div className="w-full grid grid-cols-3 rounded-xl border overflow-hidden">
      <Button
        variant={view === 'clasificacion' ? 'default' : 'ghost'}
        onClick={() => setView('clasificacion')}
        className={`${view === 'clasificacion' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''} h-10 text-xs sm:text-sm w-full rounded-none justify-center`}
      >
        <Trophy className="w-4 h-4 mr-1.5" /> Clasificación
      </Button>
      <Button
        variant={view === 'resultados' ? 'default' : 'ghost'}
        onClick={() => setView('resultados')}
        className={`${view === 'resultados' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''} h-10 text-xs sm:text-sm w-full rounded-none justify-center`}
      >
        <List className="w-4 h-4 mr-1.5" /> Resultados
      </Button>
      <Button
        variant={view === 'goleadores' ? 'default' : 'ghost'}
        onClick={() => setView('goleadores')}
        className={`${view === 'goleadores' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''} h-10 text-xs sm:text-sm w-full rounded-none justify-center`}
      >
        <Users className="w-4 h-4 mr-1.5" /> Goleadores
      </Button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold">Centro de Competición (Técnicos)</h1>
          {fav ? (
            <Button variant="ghost" size="icon" onClick={toggleFav} title="Quitar favorito"><Star className="w-5 h-5 text-yellow-500"/></Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={toggleFav} title="Marcar favorito"><StarOff className="w-5 h-5 text-slate-500"/></Button>
          )}
          <Badge variant="outline">{isCoordinator ? 'Coordinación' : 'Entrenador'}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ViewToggle />
          <Button variant="outline" onClick={() => setShowConfig(true)} title="Configurar categorías visibles" className="h-9 px-3 gap-1">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Categorías del técnico */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {(visibleCats && visibleCats.length ? visibleCats : myCats).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-2 rounded-full whitespace-nowrap border text-sm ${category === cat ? 'bg-orange-600 text-white border-orange-600' : 'bg-white hover:bg-slate-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>


      {/* Buscador (para filtrar tabla en StandingsDisplay) */}
      <div className="mt-3 mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={view === 'goleadores' ? 'Buscar jugador o equipo...' : 'Buscar equipo...'} className="pl-9"/>
        </div>
        <Badge variant="outline" className="hidden md:inline-flex">{category}</Badge>
      </div>

      {/* Acciones técnicas de partido */}
      <Card className="mb-4 border-2 border-emerald-500">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Herramientas de Partido</span>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={analyzeRival} disabled={isAnalyzingRival} className="bg-red-600 hover:bg-red-700">
                {isAnalyzingRival ? 'Analizando…' : (<><Target className="w-4 h-4 mr-2" /> Analizar Próximo Rival</>)}
              </Button>
              <Button variant="outline" onClick={() => setShowObservationForm((v) => !v)}>
                <Zap className="w-4 h-4 mr-2" /> {showObservationForm ? 'Ocultar Registro Rápido' : 'Registro Rápido Post-Partido'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        {showObservationForm && matchForForm && (
          <CardContent>
            <QuickMatchObservationForm
              categoria={matchForForm.categoria}
              rival={matchForForm.rival}
              fechaPartido={matchForForm.fecha_partido}
              jornada={standingsPack?.jornada}
              onSave={async (data) => {
                await base44.entities.MatchObservation.create(data);
              }}
              onCancel={() => setShowObservationForm(false)}
              entrenadorEmail={me?.email}
              entrenadorNombre={me?.full_name}
            />
          </CardContent>
        )}
        {showObservationForm && !matchForForm && (
          <CardContent>
            <p className="text-sm text-slate-600">No hay partidos recientes o próximos para {category}.</p>
          </CardContent>
        )}
      </Card>

      {/* Próximo partido (lee de BD, guardado por admin) */}
      <NextMatchFromDB category={category} standings={standingsPack} />

      {/* Contenido principal */}
      <ErrorBoundary fallback={
        <Card><CardContent className="p-8 text-center">
          <p className="text-lg mb-2">⚠️</p>
          <p className="text-slate-700 mb-3">Error al cargar los datos de competición.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700">Recargar</button>
        </CardContent></Card>
      }>
        {view === 'clasificacion' && (
          isLoading ? (
            <Card><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div><p className="text-slate-600 text-sm">Cargando clasificación…</p></CardContent></Card>
          ) : standingsPack ? (
            <StandingsDisplay data={filteredStandingsPack} fullPage={true} />
          ) : (
            <Card className="border-2 border-dashed"><CardContent className="p-8 text-center text-slate-500">Sin datos de clasificación para {category}</CardContent></Card>
          )
        )}

        {view === 'resultados' && (
          <ResultsList categoryFullName={category} isAdmin={false} />
        )}

        {view === 'goleadores' && (
          <ScorersList categoryFullName={category} isAdmin={false} />
        )}
      </ErrorBoundary>
    {/* Configuración de categorías */}
    <Dialog open={showConfig} onOpenChange={setShowConfig}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar categorías visibles</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Marca qué categorías quieres ver. Por defecto están todas activas.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {myCats.map((cat) => (
              <label key={cat} className="flex items-center gap-2 p-2 rounded-lg border bg-white">
                <input type="checkbox" checked={visibleCats.includes(cat)} onChange={() => toggleCatVisibility(cat)} />
                <span className="text-sm">{cat}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetCats}>Restablecer</Button>
              <Button variant="outline" onClick={selectAllCats}>Marcar todas</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfig(false)}>Cancelar</Button>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={saveCats}>Guardar</Button>
            </div>
          </div>
          <div className="text-xs text-slate-500">Usa la rueda para elegir las categorías que no quieres ver.</div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal análisis rival */}
    <RivalAnalysisModal
      open={showAnalysisModal}
      onClose={setShowAnalysisModal}
      analysis={rivalAnalysis}
      rival={nextCallup?.rival}
      categoria={category}
      fecha={nextCallup?.fecha_partido}
    />
  </div>
  );
}