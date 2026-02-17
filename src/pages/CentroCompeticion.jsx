import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import StandingsDisplay from "../components/standings/StandingsDisplay";
import ResultsList from "../components/results/ResultsList";
import ScorersList from "../components/scorers/ScorersList";
import UploadStandingsForm from "../components/standings/UploadStandingsForm";
import PasteStandingsForm from "../components/standings/PasteStandingsForm";
import ReviewStandingsTable from "../components/standings/ReviewStandingsTable";
import UploadResultsForm from "../components/results/UploadResultsForm";
import PasteResultsForm from "../components/results/PasteResultsForm";
import ReviewResultsTable from "../components/results/ReviewResultsTable";
import UploadScorersForm from "../components/scorers/UploadScorersForm";
import PasteScorersForm from "../components/scorers/PasteScorersForm";
import ReviewScorersTable from "../components/scorers/ReviewScorersTable";
import { Trophy, List, Users, Star, StarOff, Share2, Search, ClipboardCheck, RefreshCw, CheckCircle2, AlertTriangle, Plus, Settings } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  React.useEffect(() => {
    if (me && !isAdmin && (me.es_entrenador || me.es_coordinador)) {
      window.location.href = createPageUrl('CentroCompeticionTecnico');
    }
  }, [me, isAdmin]);
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
      return list?.[0] || null;
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const [resultsUrl, setResultsUrl] = React.useState('');
  const [scorersUrl, setScorersUrl] = React.useState('');
  const [rfefUrlState, setRfefUrlState] = React.useState('');
  const [grupoText, setGrupoText] = React.useState('');
  const [configId, setConfigId] = React.useState(null);
  React.useEffect(() => {
    // Al cambiar de categoría, NO heredar URLs de otras categorías
    if (config?.categoria === category) {
      setResultsUrl(config.rfef_results_url || '');
      setScorersUrl(config.rfef_scorers_url || '');
      setRfefUrlState(config.rfef_url || '');
      setGrupoText(config.grupo || '');
      setConfigId(config.id || null);
    } else {
      setResultsUrl('');
      setScorersUrl('');
      setRfefUrlState('');
      setGrupoText('');
      setConfigId(null);
    }
  }, [config, category]);
  React.useEffect(() => { if (isAdmin) setAdminTab(view); }, [view, isAdmin]);

  React.useEffect(() => {
            const params = new URLSearchParams(window.location.search);
            params.set('cat', category);
            params.set('vista', view);
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState({}, '', newUrl);
          }, [category, view]);

          // Prefetch resultados y goleadores para carga instantánea al cambiar de vista
          React.useEffect(() => {
            if (view !== 'resultados') {
              queryClient.prefetchQuery({
                queryKey: ['resultados', category],
                queryFn: async () => base44.entities.Resultado.filter({ categoria: category }, '-jornada', 500),
                staleTime: 5 * 60_000,
              });
            }
            if (view !== 'goleadores') {
              queryClient.prefetchQuery({
                queryKey: ['goleadores', category],
                queryFn: async () => base44.entities.Goleador.filter({ categoria: category }, '-goles', 500),
                staleTime: 5 * 60_000,
              });
            }
          }, [category, view, queryClient]);

  const toggleFav = () => {
    if (fav) {
      localStorage.removeItem('fav_comp_cat');
      setFav(false);
    } else {
      localStorage.setItem('fav_comp_cat', category);
      setFav(true);
    }
  };

  // Config categorías (familias)
  const [showConfig, setShowConfig] = React.useState(false);
  const [visibleCats, setVisibleCats] = React.useState(() => {
    try {
      const stored = localStorage.getItem('comp_visible_categories_family');
      const arr = stored ? JSON.parse(stored) : CATEGORIES;
      return Array.isArray(arr) && arr.length ? arr : CATEGORIES;
    } catch { return CATEGORIES; }
  });

  React.useEffect(() => {
    if (!visibleCats.includes(category)) {
      setCategory(visibleCats[0] || CATEGORIES[0]);
    }
  }, [visibleCats]);

  const toggleCatVisibility = (cat) => {
    setVisibleCats((prev) => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };
  const selectAllCats = () => setVisibleCats(CATEGORIES);
  const resetCats = () => setVisibleCats(CATEGORIES);
  const saveCats = () => {
    try { localStorage.setItem('comp_visible_categories_family', JSON.stringify(visibleCats)); } catch {}
    setShowConfig(false);
  };

  // Checklist Lunes (integrado)
  const weekKey = () => {
    try { return format(new Date(), "RRRR-'W'II"); } catch { return new Date().toISOString().slice(0,10); }
  };

  const tipoForView = React.useMemo(() => {
    if (view === 'clasificacion') return 'clasificacion';
    if (view === 'resultados') return 'resultados';
    if (view === 'goleadores') return 'goleadores';
    return 'otro';
  }, [view]);

  const { data: compAssets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['comp-assets', category, tipoForView],
    queryFn: () => base44.entities.CompetitionAsset.filter({ categoria: category, tipo: tipoForView }, '-updated_date', 200),
    initialData: [],
    enabled: isAdmin
  });

  const assetsForSection = React.useMemo(() => compAssets, [compAssets]);

  const checkAssetsMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('checkCompetitionAssets', { onlyActive: true, categoria: category, tipo: tipoForView });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comp-assets', category, tipoForView] });
    }
  });

  const autoRanRef = React.useRef(false);
  React.useEffect(() => {
    const isMonday = new Date().getDay() === 1; // 1 = lunes
    if (isAdmin && isMonday && !autoRanRef.current) {
      autoRanRef.current = true;
      checkAssetsMutation.mutate();
    }
  }, [isAdmin, category, tipoForView]);

  const markReviewed = async (asset) => {
    const wk = weekKey();
    const reviewed = Array.isArray(asset.reviewed_weeks) ? asset.reviewed_weeks : [];
    if (!reviewed.includes(wk)) {
      await base44.entities.CompetitionAsset.update(asset.id, { reviewed_weeks: [...reviewed, wk] });
      queryClient.invalidateQueries({ queryKey: ['comp-assets', category, tipoForView] });
    }
  };

  const statusCounts = React.useMemo(() => {
    const c = { cambiado: 0, igual: 0, error: 0, nuevo: 0 };
    for (const a of assetsForSection) c[a.status || 'nuevo'] = (c[a.status || 'nuevo'] || 0) + 1;
    return c;
  }, [assetsForSection]);

  const pendingThisWeek = React.useMemo(() => {
    const wk = weekKey();
    return assetsForSection.filter(a => !(Array.isArray(a.reviewed_weeks) && a.reviewed_weeks.includes(wk))).length;
  }, [assetsForSection]);

  const [uploadMode, setUploadMode] = React.useState('paste'); // 'paste' | 'image'
  const [showAddUrls, setShowAddUrls] = React.useState(false);
  const [pasteUrls, setPasteUrls] = React.useState("");

  const upsertAssets = useMutation({
    mutationFn: async (rows) => {
      const existing = await base44.entities.CompetitionAsset.list('-updated_date', 1000);
      const existingSet = new Set(existing.map(x => (x.url || '').trim()))
      const toCreate = rows.filter(u => u && u.url && !existingSet.has(u.url.trim()));
      if (toCreate.length) await base44.entities.CompetitionAsset.bulkCreate(toCreate);
      return { created: toCreate.length };
    },
    onSuccess: () => {
      setShowAddUrls(false);
      setPasteUrls("");
      queryClient.invalidateQueries({ queryKey: ['comp-assets', category, tipoForView] });
    }
  });

  const handleAddUrls = () => {
    const lines = pasteUrls.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    const payload = lines.map(url => ({ url, categoria: category, tipo: tipoForView }));
    upsertAssets.mutate(payload);
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
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const filteredStandingsPack = React.useMemo(() => {
    if (!standingsPack || !search.trim()) return standingsPack;
    const q = search.toLowerCase();
    return { ...standingsPack, data: standingsPack.data.filter(r => (r.nombre_equipo || '').toLowerCase().includes(q)) };
  }, [standingsPack, search]);

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert('Enlace copiado');
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('Enlace copiado');
      } catch {
        prompt('Copia el enlace:', url);
      }
    }
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

      // Determinar jornada objetivo: siempre sobrescribir la ÚLTIMA existente para esta temporada/categoría
      const existingAll = await base44.entities.Resultado.filter({ categoria, temporada }, '-jornada', 1000);
      const jornadasNums = existingAll
        .map(r => Number(r.jornada))
        .filter(n => Number.isFinite(n));
      const targetJornada = jornadasNums.length ? Math.max(...jornadasNums) : (Number(jornada) || 1);

      // 1) Borrar todos los resultados previos de la jornada objetivo para evitar duplicados
      const prev = await base44.entities.Resultado.filter({ categoria, temporada, jornada: targetJornada }, '-updated_date', 400);
      for (const rec of prev) await base44.entities.Resultado.delete(rec.id);

      // 2) Insertar todo normalizado (partidos pendientes sin marcador)
      const isNum = (v) => Number.isFinite(Number(v)) && Number(v) >= 0;
      const rows = (matches || []).map(m => ({
        categoria,
        temporada,
        jornada: targetJornada,
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

      // 1) Borrar todos los registros previos de esa categoría + temporada (evita duplicados)
      const prev = await base44.entities.Goleador.filter({ categoria, temporada }, '-updated_date', 5000);
      for (const rec of prev) await base44.entities.Goleador.delete(rec.id);

      // 2) Normalizar y deduplicar por slug (jugador + equipo). Guardar el mayor nº de goles
      const norm = (s) =>
        String(s || '')
          .trim()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .toUpperCase();

      const dedupMap = new Map();
      for (const p of (players || [])) {
        const jugador = String(p.jugador_nombre || '').trim();
        const equipo = String(p.equipo || '').trim();
        const goles = Number(p.goles) || 0;
        if (!jugador || !equipo) continue;
        const slug = `${norm(jugador)}|${norm(equipo)}`;
        const existing = dedupMap.get(slug);
        if (!existing || goles > existing.goles) {
          dedupMap.set(slug, {
            categoria,
            temporada,
            jugador_nombre: jugador,
            equipo: equipo,
            goles,
          });
        }
      }

      const rows = Array.from(dedupMap.values());
      if (rows.length) await base44.entities.Goleador.bulkCreate(rows);

      setScorersDraft(null);
      queryClient.invalidateQueries({ queryKey: ['goleadores', categoria] });
      alert('Goleadores guardados');
    } finally {
      setSavingScorers(false);
    }
  };

  const openUrl = (url) => url && window.open(url, '_blank');

  const saveConfigUrls = async (updates) => {
    // Refrescar por categoría para evitar actualizar registros de otras categorías
    const currentList = await base44.entities.StandingsConfig.filter({ categoria: category });
    const currentCfg = currentList?.[0];

    if (currentCfg) {
      await base44.entities.StandingsConfig.update(currentCfg.id, { ...updates });
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
          <Button variant="outline" onClick={() => setShowConfig(true)} title="Configurar categorías visibles" className="h-9 px-3 gap-1">
            <Settings className="w-4 h-4" />
          </Button>
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

            {/* URL Guardada - solo la correspondiente a la pestaña activa */}
            <div className="bg-blue-50 rounded-xl p-3 border-2 border-blue-300 space-y-2">
              <p className="text-sm font-bold text-blue-900">🔗 URL Guardada para {category} — {adminTab === 'clasificacion' ? 'Clasificación' : adminTab === 'resultados' ? 'Resultados' : 'Goleadores'}</p>
              
              {adminTab === 'clasificacion' && (
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Clasificación:</p>
                  <div className="flex items-center gap-2">
                    <Input className="flex-1 text-xs h-8" value={rfefUrlState} onChange={(e) => setRfefUrlState(e.target.value)} placeholder="URL de RFFM/RFEF para clasificación" />
                    <Input className="w-28 text-xs h-8" value={grupoText} onChange={(e) => setGrupoText(e.target.value)} placeholder="Ej: Grupo 72" />
                    <Button size="sm" variant="outline" onClick={() => rfefUrlState && window.open(rfefUrlState, '_blank')} disabled={!rfefUrlState}>Abrir</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      if (!rfefUrlState) return;
                      try {
                        const res = await base44.functions.invoke('fetchRfefStandings', { url: rfefUrlState });
                        const j = res.data?.jornada_actual;
                        const t = res.data?.temporada;
                        toast.success(`Detectado: Temporada ${t || '?'}, Jornada ${j || '?'}`);
                      } catch { toast.error('No se pudo detectar'); }
                    }} disabled={!rfefUrlState}>Probar</Button>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={async () => {
                      try {
                        if (configId) {
                          await base44.entities.StandingsConfig.update(configId, { grupo: grupoText, rfef_url: rfefUrlState });
                        } else {
                          const created = await base44.entities.StandingsConfig.create({ categoria: category, grupo: grupoText, rfef_url: rfefUrlState });
                          setConfigId(created.id);
                        }
                        queryClient.invalidateQueries({ queryKey: ['standings-config', category] });
                        toast.success('URL guardada');
                      } catch { toast.error('Error al guardar'); }
                    }}>💾</Button>
                  </div>
                </div>
              )}

              {adminTab === 'resultados' && (
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Resultados:</p>
                  <div className="flex items-center gap-2">
                    <Input className="flex-1 text-xs h-8" value={resultsUrl} onChange={(e) => setResultsUrl(e.target.value)} placeholder="URL de RFFM/RFEF para resultados" />
                    <Button size="sm" variant="outline" onClick={() => openUrl(resultsUrl)} disabled={!resultsUrl}>Abrir</Button>
                    <Button size="sm" variant="outline" onClick={tryResultsUrl} disabled={!resultsUrl}>Probar</Button>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => saveConfigUrls({ rfef_results_url: resultsUrl })} disabled={!resultsUrl}>💾</Button>
                  </div>
                </div>
              )}

              {adminTab === 'goleadores' && (
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Goleadores:</p>
                  <div className="flex items-center gap-2">
                    <Input className="flex-1 text-xs h-8" value={scorersUrl} onChange={(e) => setScorersUrl(e.target.value)} placeholder="URL de RFFM/RFEF para goleadores" />
                    <Button size="sm" variant="outline" onClick={() => openUrl(scorersUrl)} disabled={!scorersUrl}>Abrir</Button>
                    <Button size="sm" variant="outline" onClick={tryScorersUrl} disabled={!scorersUrl}>Probar</Button>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => saveConfigUrls({ rfef_scorers_url: scorersUrl })} disabled={!scorersUrl}>💾</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Checklist Lunes (integrado) */}
            <div className="bg-slate-50 rounded-xl p-3 border">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold">Checklist Lunes — {view}</span>
                  <Badge variant="outline">{weekKey()}</Badge>
                  {loadingAssets && <span className="text-xs text-slate-500">cargando…</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-700">Cambiadas: {statusCounts.cambiado}</Badge>
                  <Badge className="bg-green-100 text-green-700">Igual: {statusCounts.igual}</Badge>
                  {statusCounts.error > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {statusCounts.error}</Badge>
                  )}
                  <Badge variant="outline">Por revisar: {pendingThisWeek}</Badge>
                  <Button variant="outline" onClick={() => setShowAddUrls(true)} className="gap-2"><Plus className="w-4 h-4"/> Añadir URLs</Button>
                  <Button onClick={() => checkAssetsMutation.mutate()} disabled={checkAssetsMutation.isPending} className="gap-2 bg-orange-600 hover:bg-orange-700">
                    <RefreshCw className={`w-4 h-4 ${checkAssetsMutation.isPending ? 'animate-spin' : ''}`} /> Comprobar
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid gap-2">
                {assetsForSection.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-2 bg-white rounded-lg border p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-sm max-w-[56ch]" title={a.url}>{a.url}</span>
                      <Badge className="capitalize">{a.tipo || 'otro'}</Badge>
                      <Badge className={`capitalize ${a.status === 'cambiado' ? 'bg-red-100 text-red-700' : a.status === 'igual' ? 'bg-green-100 text-green-700' : a.status === 'error' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-700'}`}>
                        {a.status || 'nuevo'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{a.last_checked_at ? new Date(a.last_checked_at).toLocaleString() : '—'}</span>
                      <Button variant="outline" size="sm" onClick={() => markReviewed(a)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Revisado
                      </Button>
                    </div>
                  </div>
                ))}
                {assetsForSection.length === 0 && (
                  <div className="text-xs text-slate-500">Sin URLs registradas para esta vista/categoría.</div>
                )}
              </div>

              {/* Dialog Añadir URLs */}
              <Dialog open={showAddUrls} onOpenChange={setShowAddUrls}>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Añadir URLs para {category} — {tipoForView}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <textarea value={pasteUrls} onChange={e => setPasteUrls(e.target.value)} rows={6} className="w-full border rounded-md p-3" placeholder="Pega una URL por línea"/>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddUrls(false)}>Cancelar</Button>
                      <Button onClick={handleAddUrls} disabled={!pasteUrls.trim() || upsertAssets.isPending} className="bg-orange-600 hover:bg-orange-700">
                        {upsertAssets.isPending ? 'Guardando…' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Toggle Pegar Texto / Subir Imagen */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Modo de entrada:</span>
              <div className="grid grid-cols-2 rounded-lg border overflow-hidden">
                <Button
                  variant={uploadMode === 'paste' ? 'default' : 'ghost'}
                  onClick={() => setUploadMode('paste')}
                  className={`${uploadMode === 'paste' ? 'bg-green-600 hover:bg-green-700 text-white' : ''} rounded-none h-9 text-xs gap-1`}
                >
                  📋 Pegar Texto
                  <Badge className="bg-green-100 text-green-700 text-[10px] ml-1">⚡ Rápido</Badge>
                </Button>
                <Button
                  variant={uploadMode === 'image' ? 'default' : 'ghost'}
                  onClick={() => setUploadMode('image')}
                  className={`${uploadMode === 'image' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''} rounded-none h-9 text-xs gap-1`}
                >
                  🖼️ Subir Imagen
                </Button>
              </div>
            </div>

            {adminTab === 'clasificacion' && (
              <>
                {!standingsDraft ? (
                  uploadMode === 'paste' ? (
                    <PasteStandingsForm
                      preselectedCategory={category}
                      onDataExtracted={(d) => setStandingsDraft(d)}
                      onCancel={() => setStandingsDraft(null)}
                    />
                  ) : (
                    <UploadStandingsForm
                      preselectedCategory={category}
                      onDataExtracted={(d) => setStandingsDraft(d)}
                      onCancel={() => setStandingsDraft(null)}
                    />
                  )
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
                {!resultsDraft ? (
                  uploadMode === 'paste' ? (
                    <PasteResultsForm categoria={category} onDataExtracted={(d) => setResultsDraft(d)} onCancel={() => setResultsDraft(null)} />
                  ) : (
                    <UploadResultsForm categoria={category} onDataExtracted={(d) => setResultsDraft(d)} onCancel={() => setResultsDraft(null)} />
                  )
                ) : (
                  <ReviewResultsTable data={resultsDraft} onCancel={() => setResultsDraft(null)} onConfirm={saveResultsToDB} isSubmitting={savingResults} />
                )}
              </>
            )}

            {adminTab === 'goleadores' && (
              <>
                {!scorersDraft ? (
                  uploadMode === 'paste' ? (
                    <PasteScorersForm categoria={category} onDataExtracted={(d) => setScorersDraft(d)} onCancel={() => setScorersDraft(null)} />
                  ) : (
                    <UploadScorersForm categoria={category} onDataExtracted={(d) => setScorersDraft(d)} onCancel={() => setScorersDraft(null)} />
                  )
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
        {(visibleCats && visibleCats.length ? visibleCats : CATEGORIES).map(cat => (
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
                        <StandingsDisplay data={filteredStandingsPack} fullPage={true} />
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

      {/* Configuración de categorías */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar categorías visibles</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Marca qué categorías quieres ver en el Centro de Competición. Por defecto están todas activas.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-2 p-2 rounded-lg border bg-white">
                  <Checkbox checked={visibleCats.includes(cat)} onCheckedChange={() => toggleCatVisibility(cat)} />
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
            <div className="text-xs text-slate-500">Consejo: usa la rueda para elegir las categorías que no quieres ver.</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}