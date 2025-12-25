import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import StandingsDisplay from "../components/standings/StandingsDisplay";
import ResultsList from "../components/results/ResultsList";
import ScorersList from "../components/scorers/ScorersList";
import QuickMatchObservationForm from "../components/coach/QuickMatchObservationForm";
import { Trophy, List, Users, Target, Zap, Search } from "lucide-react";

const CATEGORIES = [
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

  // Categorías visibles para el técnico
  const myCats = React.useMemo(() => {
    if (isCoordinator) return CATEGORIES; // coordinador ve todas
    const coached = Array.isArray(me?.categorias_entrena) ? me.categorias_entrena : [];
    // Normalizar contra lista base
    const normalized = CATEGORIES.filter((c) =>
      coached.some((x) => (x || "").toLowerCase() === c.toLowerCase() || (x || "").toLowerCase().includes(c.split(" ")[1]?.toLowerCase() || ""))
    );
    return normalized.length ? normalized : CATEGORIES; // fallback si no tiene asignadas
  }, [me, isCoordinator]);

  const [category, setCategory] = React.useState(() => myCats[0] || CATEGORIES[0]);
  React.useEffect(() => { if (!myCats.includes(category)) setCategory(myCats[0] || CATEGORIES[0]); }, [myCats]);

  const [view, setView] = React.useState("clasificacion"); // 'clasificacion' | 'resultados' | 'goleadores'
  const [search, setSearch] = React.useState("");

  // Prefetch resultados/goleadores para carga rápida
  React.useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["resultados", category],
      queryFn: async () => base44.entities.Resultado.filter({ categoria: category }, "-jornada", 500),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ["goleadores", category],
      queryFn: async () => base44.entities.Goleador.filter({ categoria: category }, "-goles", 500),
      staleTime: 60_000,
    });
  }, [category, queryClient]);

  // Clasificación (último pack como en CentroCompeticion)
  const { data: standingsPack, isLoading } = useQuery({
    queryKey: ["centro-standings-tech", category],
    queryFn: async () => {
      const recs = await base44.entities.Clasificacion.filter({ categoria: category }, "-updated_date", 400);
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

  // Registro rápido post-partido
  const [showObservationForm, setShowObservationForm] = React.useState(false);

  // Análisis de rival (usa el mismo patrón de CoachStandingsAnalysis)
  const [isAnalyzingRival, setIsAnalyzingRival] = React.useState(false);
  const analyzeRival = async () => {
    if (!nextCallup) return alert("No hay próximo partido para analizar");
    setIsAnalyzingRival(true);
    try {
      // Cargar apoyo de clasificación y goleadores/resultados
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
      alert(`Racha: ${result.racha || '-'}\n\nPuntos fuertes:\n- ${(result.puntos_fuertes || []).join("\n- ")}\n\nDebilidades:\n- ${(result.debilidades || []).join("\n- ")}\n\nPlan táctico:\n- ${(result.plan_tactico || []).join("\n- ")}`);
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
          <Badge variant="outline">{isCoordinator ? 'Coordinación' : 'Entrenador'}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ViewToggle />
        </div>
      </div>

      {/* Categorías del técnico */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {myCats.map((cat) => (
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
        {showObservationForm && nextCallup && (
          <CardContent>
            <QuickMatchObservationForm
              categoria={nextCallup.categoria}
              rival={nextCallup.rival}
              fechaPartido={nextCallup.fecha_partido}
              jornada={standingsPack?.jornada}
              onSave={async (data) => {
                await base44.entities.MatchObservation.create(data);
                alert('Observación guardada');
              }}
              onCancel={() => setShowObservationForm(false)}
              entrenadorEmail={me?.email}
              entrenadorNombre={me?.full_name}
            />
          </CardContent>
        )}
        {showObservationForm && !nextCallup && (
          <CardContent>
            <p className="text-sm text-slate-600">No hay partido próximo programado para {category}.</p>
          </CardContent>
        )}
      </Card>

      {/* Contenido principal */}
      {view === 'clasificacion' && (
        isLoading ? (
          <Card><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div><p className="text-slate-600 text-sm">Cargando clasificación…</p></CardContent></Card>
        ) : standingsPack ? (
          <StandingsDisplay data={standingsPack} fullPage={true} />
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
    </div>
  );
}