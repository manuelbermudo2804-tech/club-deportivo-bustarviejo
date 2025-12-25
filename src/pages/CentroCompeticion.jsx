import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import StandingsDisplay from "../components/standings/StandingsDisplay";
import PositionEvolution from "../components/standings/PositionEvolution";
import ResultsList from "../components/results/ResultsList";
import ScorersList from "../components/scorers/ScorersList";
import UploadStandingsForm from "../components/standings/UploadStandingsForm";
import ReviewStandingsTable from "../components/standings/ReviewStandingsTable";
import UploadResultsForm from "../components/results/UploadResultsForm";
import ReviewResultsTable from "../components/results/ReviewResultsTable";
import UploadScorersForm from "../components/scorers/UploadScorersForm";
import ReviewScorersTable from "../components/scorers/ReviewScorersTable";
import { Trophy, List, Users, Star, StarOff, Share2, Search } from "lucide-react";

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

const getUrlParam = (key, fallback) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || fallback;
};

export default function CentroCompeticion() {
  const storedFav = typeof window !== 'undefined' ? localStorage.getItem('fav_comp_cat') : null;
  const defaultCat = getUrlParam('cat', storedFav || CATEGORIES[0]);
  const defaultView = getUrlParam('vista', 'clasificacion');

  const [category, setCategory] = React.useState(defaultCat);
  const [view, setView] = React.useState(defaultView); // 'clasificacion' | 'resultados' | 'goleadores'
  const [search, setSearch] = React.useState('');
  const [fav, setFav] = React.useState(() => storedFav === defaultCat);
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = me?.role === 'admin';
  const [adminTab, setAdminTab] = React.useState('clasificacion');
  const [standingsDraft, setStandingsDraft] = React.useState(null);
  const [savingStandings, setSavingStandings] = React.useState(false);
  const [resultsDraft, setResultsDraft] = React.useState(null);
  const [savingResults, setSavingResults] = React.useState(false);
  const [scorersDraft, setScorersDraft] = React.useState(null);
  const [savingScorers, setSavingScorers] = React.useState(false);
  const { data: config } = useQuery({
    queryKey: ['standings-config', category],
    queryFn: async () => {
      const list = await base44.entities.StandingsConfig.filter({ categoria: category });
      return list[0] || null;
    }
  });
  const [resultsUrl, setResultsUrl] = React.useState('');
  const [scorersUrl, setScorersUrl] = React.useState('');
  React.useEffect(() => {
    if (config) {
      setResultsUrl(config.rfef_results_url || '');
      setScorersUrl(config.rfef_scorers_url || '');
    } else {
      setResultsUrl('');
      setScorersUrl('');
    }
  }, [config]);
  React.useEffect(() => { if (isAdmin) setAdminTab(view); }, [view, isAdmin]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('cat', category);
    params.set('vista', view);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [category, view]);

  const toggleFav = () => {
    if (fav) {
      localStorage.removeItem('fav_comp_cat');
      setFav(false);
    } else {
      localStorage.setItem('fav_comp_cat', category);
      setFav(true);
    }
  };

  const { data: standingsPack, isLoading: loadingStandings } = useQuery({
    queryKey: ['centro-standings', category],
    queryFn: async () => {
      const recs = await base44.entities.Clasificacion.filter({ categoria: category }, '-updated_date', 400);
      if (!recs || recs.length === 0) return null;
      const latest = recs[0];
      const temporada = latest.temporada;
      const tempRows = recs.filter(r => r.temporada === temporada);
      const jornadas = tempRows.map(r => r.jornada || 0);
      const maxJornada = jornadas.length ? Math.max(...jornadas) : null;
      const rows = maxJornada != null ? tempRows.filter(r => (r.jornada || 0) === maxJornada) : tempRows;
      const fecha_actualizacion = latest.updated_date || new Date().toISOString();
      return { categoria: category, temporada, jornada: maxJornada ?? '-', fecha_actualizacion, data: rows };
    },
    staleTime: 5 * 60_000,
    gcTime: 60 * 60_000,
  });

  const filteredStandingsPack = React.useMemo(() => {
    if (!standingsPack || !search.trim()) return standingsPack;
    const q = search.toLowerCase();
    return { ...standingsPack, data: standingsPack.data.filter(r => (r.nombre_equipo || '').toLowerCase().includes(q)) };
  }, [standingsPack, search]);

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
  };

  const saveStandingsToDB = async (payload) => {
    setSavingStandings(true);
    try {
      const { temporada, categoria, jornada, standings } = payload;

      // 1) Borrar todo lo existente para esta categoría/temporada/jornada (evita duplicados)
      const prev = await base44.entities.Clasificacion.filter({ categoria, temporada, jornada }, '-updated_date', 400);
      for (const rec of prev) {
        await base44.entities.Clasificacion.delete(rec.id);
      }

      // 2) Insertar todo de nuevo ya normalizado (vacíos -> 0)
      const toNum = (v) => (v === undefined || v === '' ? 0 : Number(v));
      const payloadRows = (standings || []).map((row) => ({
        categoria,
        temporada,
        jornada,
        nombre_equipo: String(row.nombre_equipo || '').trim(),
        posicion: toNum(row.posicion),
        puntos: toNum(row.puntos),
        partidos_jugados: toNum(row.partidos_jugados),
        ganados: toNum(row.ganados),
        empatados: toNum(row.empatados),
        perdidos: toNum(row.perdidos),
        goles_favor: toNum(row.goles_favor),
        goles_contra: toNum(row.goles_contra),
      }));

      if (payloadRows.length) {
        await base44.entities.Clasificacion.bulkCreate(payloadRows);
      }

      setStandingsDraft(null);
      queryClient.invalidateQueries({ queryKey: ['centro-standings', category] });
      alert('Clasificación guardada');
    } finally {
      setSavingStandings(false);
    }
  };

  const saveResultsToDB = async (payload) => {
    setSavingResults(true);
    try {
      const { temporada, categoria, jornada, matches } = payload;

      // 1) Borrar todos los resultados previos de esa jornada para evitar duplicados
      const prev = await base44.entities.Resultado.filter({ categoria, temporada, jornada }, '-updated_date', 400);
      for (const rec of prev) await base44.entities.Resultado.delete(rec.id);

      // 2) Insertar todo normalizado (partidos pendientes sin marcador)
      const isNum = (v) => Number.isFinite(Number(v)) && Number(v) >= 0;
      const rows = (matches || []).map(m => ({
        categoria,
        temporada,
        jornada,
        local: String(m.local || '').trim(),
        visitante: String(m.visitante || '').trim(),
        goles_local: isNum(m.goles_local) && isNum(m.goles_visitante) ? Number(m.goles_local) : undefined,
        goles_visitante: isNum(m.goles_local) && isNum(m.goles_visitante) ? Number(m.goles_visitante) : undefined,
      }));
      if (rows.length) await base44.entities.Resultado.bulkCreate(rows);

      setResultsDraft(null);
      // Refrescar lista de resultados de la categoría actual
      queryClient.invalidateQueries({ queryKey: ['resultados', categoria] });
      alert('Resultados guardados');
    } finally {
      setSavingResults(false);
    }
  };

  const saveScorersToDB = async (payload) => {
    setSavingScorers(true);
    try {
      const { temporada, categoria, players } = payload;
      for (const p of players) {
        const existing = await base44.entities.Goleador.filter({ categoria, temporada, jugador_nombre: p.jugador_nombre, equipo: p.equipo });
        if (existing.length) {
          await base44.entities.Goleador.update(existing[0].id, { goles: Number(p.goles) });
        } else {
          await base44.entities.Goleador.create({ categoria, temporada, jugador_nombre: p.jugador_nombre, equipo: p.equipo, goles: Number(p.goles) });
        }
      }
      setScorersDraft(null);
      queryClient.invalidateQueries({ queryKey: ['goleadores', categoria] });
      alert('Goleadores guardados');
    } finally {
      setSavingScorers(false);
    }
  };

  const openUrl = (url) => url && window.open(url, '_blank');

  const saveConfigUrls = async (updates) => {
    if (config) {
      await base44.entities.StandingsConfig.update(config.id, { categoria: category, ...updates });
    } else {
      await base44.entities.StandingsConfig.create({ categoria: category, ...updates });
    }
    queryClient.invalidateQueries({ queryKey: ['standings-config', category] });
    alert('URL guardada');
  };

  const tryResultsUrl = async () => {
    if (!resultsUrl) return;
    const res = await base44.functions.invoke('fetchRfefResults', { url: resultsUrl });
    if (res?.data?.matches?.length) alert(`Detectados ${res.data.matches.length} partidos`); else alert('No se pudieron detectar partidos');
  };

  const tryScorersUrl = async () => {
    if (!scorersUrl) return;
    const res = await base44.functions.invoke('fetchRfefScorers', { url: scorersUrl });
    if (res?.data?.players?.length) alert(`Detectados ${res.data.players.length} goleadores`); else alert('No se pudieron detectar goleadores');
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
    <div className="max-w-6xl mx-auto p-4 md:p-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold">Centro de Competición</h1>
          {fav ? (
            <Button variant="ghost" size="icon" onClick={toggleFav} title="Quitar favorito"><Star className="w-5 h-5 text-yellow-500"/></Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={toggleFav} title="Marcar favorito"><StarOff className="w-5 h-5 text-slate-500"/></Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {!isAdmin && <ViewToggle />}
          <Button variant="outline" onClick={copyLink} title="Copiar enlace" className="h-9 px-3"><Share2 className="w-4 h-4"/></Button>
        </div>
      </div>

      {isAdmin && (
        <Card className="mb-4 border-2 border-orange-500">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-2 md:grid-cols-[1fr_auto] items-start">
              <div className="font-semibold">Herramientas de Administración</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full md:w-auto">
                <Button
                  variant={adminTab === 'clasificacion' ? 'default' : 'outline'}
                  onClick={() => { setAdminTab('clasificacion'); setView('clasificacion'); }}
                  className={`${adminTab === 'clasificacion' ? 'bg-orange-600 hover:bg-orange-700' : ''} w-full px-2 py-2 text-xs whitespace-normal leading-tight`}
                >
                  Clasificación
                </Button>
                <Button
                  variant={adminTab === 'resultados' ? 'default' : 'outline'}
                  onClick={() => { setAdminTab('resultados'); setView('resultados'); }}
                  className={`${adminTab === 'resultados' ? 'bg-orange-600 hover:bg-orange-700' : ''} w-full px-2 py-2 text-xs whitespace-normal leading-tight`}
                >
                  Resultados
                </Button>
                <Button
                  variant={adminTab === 'goleadores' ? 'default' : 'outline'}
                  onClick={() => { setAdminTab('goleadores'); setView('goleadores'); }}
                  className={`${adminTab === 'goleadores' ? 'bg-orange-600 hover:bg-orange-700' : ''} w-full px-2 py-2 text-xs whitespace-normal leading-tight`}
                >
                  Goleadores
                </Button>
              </div>
            </div>
            <div className="text-sm text-slate-600">Categoría activa: <Badge variant="outline">{category}</Badge></div>

            {adminTab === 'clasificacion' && (
              <>
                {!standingsDraft ? (
                  <UploadStandingsForm
                    preselectedCategory={category}
                    onDataExtracted={(d) => setStandingsDraft(d)}
                    onCancel={() => setStandingsDraft(null)}
                  />
                ) : (
                  <ReviewStandingsTable
                    data={standingsDraft}
                    onCancel={() => setStandingsDraft(null)}
                    onConfirm={saveStandingsToDB}
                    isSubmitting={savingStandings}
                  />
                )}
              </>
            )}

            {adminTab === 'resultados' && (
              <>
                <div className="grid md:grid-cols-6 gap-2">
                  <Input className="md:col-span-4" value={resultsUrl} onChange={(e) => setResultsUrl(e.target.value)} placeholder="URL RFFM/RFEF de resultados" />
                  <div className="flex gap-2 md:col-span-2">
                    <Button variant="outline" onClick={() => openUrl(resultsUrl)} disabled={!resultsUrl}>Abrir</Button>
                    <Button variant="outline" onClick={tryResultsUrl} disabled={!resultsUrl}>Probar</Button>
                    <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => saveConfigUrls({ rfef_results_url: resultsUrl })} disabled={!resultsUrl}>Guardar URL</Button>
                  </div>
                </div>
                {!resultsDraft ? (
                  <UploadResultsForm categoria={category} onDataExtracted={(d) => setResultsDraft(d)} onCancel={() => setResultsDraft(null)} />
                ) : (
                  <ReviewResultsTable data={resultsDraft} onCancel={() => setResultsDraft(null)} onConfirm={saveResultsToDB} isSubmitting={savingResults} />
                )}
              </>
            )}

            {adminTab === 'goleadores' && (
              <>
                <div className="grid md:grid-cols-6 gap-2">
                  <Input className="md:col-span-4" value={scorersUrl} onChange={(e) => setScorersUrl(e.target.value)} placeholder="URL RFFM/RFEF de goleadores" />
                  <div className="flex gap-2 md:col-span-2">
                    <Button variant="outline" onClick={() => openUrl(scorersUrl)} disabled={!scorersUrl}>Abrir</Button>
                    <Button variant="outline" onClick={tryScorersUrl} disabled={!scorersUrl}>Probar</Button>
                    <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => saveConfigUrls({ rfef_scorers_url: scorersUrl })} disabled={!scorersUrl}>Guardar URL</Button>
                  </div>
                </div>
                {!scorersDraft ? (
                  <UploadScorersForm categoria={category} onDataExtracted={(d) => setScorersDraft(d)} onCancel={() => setScorersDraft(null)} />
                ) : (
                  <ReviewScorersTable data={scorersDraft} onCancel={() => setScorersDraft(null)} onConfirm={saveScorersToDB} isSubmitting={savingScorers} />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Categorías */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setFav(localStorage.getItem('fav_comp_cat') === cat); }}
            className={`px-3 py-2 rounded-full whitespace-nowrap border text-sm ${category === cat ? 'bg-orange-600 text-white border-orange-600' : 'bg-white hover:bg-slate-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="mt-3 mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={view === 'goleadores' ? 'Buscar jugador o equipo...' : 'Buscar equipo...'} className="pl-9"/>
        </div>
        <Badge variant="outline" className="hidden md:inline-flex">{category}</Badge>
      </div>

      {/* Contenido */}
      {view === 'clasificacion' && (
        loadingStandings ? (
          <Card><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div><p className="text-slate-600 text-sm">Cargando clasificación...</p></CardContent></Card>
        ) : filteredStandingsPack ? (
          <div className="space-y-4">
            <StandingsDisplay data={filteredStandingsPack} fullPage={true} />
            <PositionEvolution categoryFullName={category} />
          </div>
        ) : (
          <Card className="border-2 border-dashed"><CardContent className="p-8 text-center text-slate-500">Sin datos de clasificación para {category}</CardContent></Card>
        )
      )}

      {view === 'resultados' && (
        <ResultsList categoryFullName={category} isAdmin={isAdmin} />
      )}

      {view === 'goleadores' && (
        <ScorersList categoryFullName={category} isAdmin={isAdmin} />
      )}

      {/* Notas */}
      <div className="mt-6 text-xs text-slate-500 text-center">
        Datos mostrados según la última actualización disponible. La comparativa de equipos sigue disponible en Clasificación.
      </div>
    </div>
  );
}