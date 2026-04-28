import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import StandingsDisplay from "../components/standings/StandingsDisplay";
import ResultsList from "../components/results/ResultsList";
import ScorersList from "../components/scorers/ScorersList";
import PasteStandingsForm from "../components/standings/PasteStandingsForm";
import ReviewStandingsTable from "../components/standings/ReviewStandingsTable";
import PasteResultsForm from "../components/results/PasteResultsForm";
import ReviewResultsTable from "../components/results/ReviewResultsTable";
import PasteScorersForm from "../components/scorers/PasteScorersForm";
import ReviewScorersTable from "../components/scorers/ReviewScorersTable";
import RffmImportButton from "../components/competition/RffmImportButton";
import RffmUrlManager from "../components/competition/RffmUrlManager";
import NextMatchRffm from "../components/competition/NextMatchRffm";
import NextMatchFromDB from "../components/competition/NextMatchFromDB";
import CrossTable from "../components/competition/CrossTable";
import RffmMonitorPanel from "../components/competition/RffmMonitorPanel";
import BustarviejoSchedule from "../components/competition/BustarviejoSchedule";

import { Trophy, List, Users, Star, StarOff, Share2, Search, Settings, Link2, History, Loader2, Database, Grid3X3, Calendar } from "lucide-react";
import { createPageUrl } from "@/utils";

import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ErrorBoundary from "../components/common/ErrorBoundary";

// Fallback hardcodeado por si aún no hay CategoryConfig
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

const getUrlParam = (key, fallback) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || fallback;
};

const getShortCategoryName = (cat) => {
  if (!cat) return "";
  return cat
    .replace("Fútbol ", "")
    .replace("Baloncesto ", "🏀 ")
    .replace(" (Mixto)", "")
    .trim();
};

const timeAgo = (dateStr) => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
};

export default function CentroCompeticion() {
  const storedFav = typeof window !== 'undefined' ? localStorage.getItem('fav_comp_cat') : null;
  const defaultCat = getUrlParam('cat', storedFav || FALLBACK_CATEGORIES[0]);
  const defaultView = getUrlParam('vista', 'clasificacion');

  const [category, setCategory] = React.useState(defaultCat);
  const [view, setView] = React.useState(defaultView); // 'clasificacion' | 'resultados' | 'goleadores' | 'cruces' | 'jornadas'
  const [search, setSearch] = React.useState('');
  const [fav, setFav] = React.useState(() => storedFav === defaultCat);
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = me?.role === 'admin';

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
  const isStaff = !!me?.es_entrenador || !!me?.es_coordinador;
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

          // Prefetch desactivado - se carga bajo demanda al cambiar de vista
          // Esto reduce uso de memoria en dispositivos con poca RAM

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
      const arr = stored ? JSON.parse(stored) : null;
      return Array.isArray(arr) && arr.length ? arr : [];
    } catch { return []; }
  });

  // Sync visible cats when dynamic categories load
  React.useEffect(() => {
    if (CATEGORIES.length > 0 && visibleCats.length === 0) {
      setVisibleCats(CATEGORIES);
    }
  }, [CATEGORIES]);

  React.useEffect(() => {
    if (!visibleCats.includes(category)) {
      setCategory(visibleCats[0] || CATEGORIES[0]);
    }
  }, [visibleCats]);

  const toggleCatVisibility = (cat) => {
    setVisibleCats((prev) => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };
  const selectAllCats = () => setVisibleCats([...CATEGORIES]);
  const resetCats = () => setVisibleCats([...CATEGORIES]);
  const saveCats = () => {
    try { localStorage.setItem('comp_visible_categories_family', JSON.stringify(visibleCats)); } catch {}
    setShowConfig(false);
  };

  const [showUrlManager, setShowUrlManager] = React.useState(false);
  const [showMonitor, setShowMonitor] = React.useState(false);
  const [importingHistory, setImportingHistory] = React.useState(false);
  const [importingCalendar, setImportingCalendar] = React.useState(false);

  const importFullHistory = async () => {
    if (!confirm(`¿Importar historial COMPLETO de resultados de "${category}" desde la RFFM?\n\nEsto descargará todas las jornadas jugadas que no estén ya en la base de datos. Puede tardar 1-2 minutos.`)) return;
    setImportingHistory(true);
    try {
      const res = await base44.functions.invoke('rffmFullHistorySync', { categoria: category });
      const data = res.data;
      if (data.error) { toast.error(data.error); return; }
      const msg = `✅ Historial importado:\n• ${data.imported?.length || 0} jornadas nuevas\n• ${data.skipped || 0} ya existentes\n• Total jornadas: ${data.totalJornadas}`;
      toast.success(msg);
      queryClient.refetchQueries({ queryKey: ['resultados', category] });
    } catch (e) {
      toast.error('Error al importar: ' + (e.message || 'desconocido'));
    } finally {
      setImportingHistory(false);
    }
  };

  const { data: standingsPack, isLoading: loadingStandings } = useQuery({
    queryKey: ['centro-standings', category],
    queryFn: async () => {
      const recs = await base44.entities.Clasificacion.filter({ categoria: category }, '-updated_date', 200);
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
    refetchOnWindowFocus: false,
    refetchOnMount: true,
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
      toast.success('Enlace copiado');
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.success('Enlace copiado');
      } catch {
        prompt('Copia el enlace:', url);
      }
    }
  };

  const shareWhatsApp = () => {
    const shortCat = getShortCategoryName(category);
    let msg = `⚽ CD Bustarviejo — ${shortCat}`;
    if (view === 'clasificacion' && standingsPack) {
      const bust = standingsPack.data?.find(s => 
        s.nombre_equipo?.toLowerCase().includes('bustarviejo')
      );
      if (bust) {
        msg += `\n🏆 Clasificación: ${bust.posicion}º con ${bust.puntos} pts (Jornada ${standingsPack.jornada})`;
      }
    }
    msg += `\n\n👉 ${window.location.href}`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const saveStandingsToDB = async (payload) => {
    setSavingStandings(true);
    try {
      const { temporada, categoria, jornada, standings } = payload;

      // 1) Borrar solo registros de la MISMA jornada (permite acumular historial de jornadas para el gráfico de evolución)
      const prev = await base44.entities.Clasificacion.filter({ categoria, temporada, jornada }, '-updated_date', 400);
      for (const rec of prev) { try { await base44.entities.Clasificacion.delete(rec.id); } catch {} }

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

      // bulkCreate tiene límite de ~10 registros por lote, enviar en bloques
      const BATCH = 10;
      for (let b = 0; b < payloadRows.length; b += BATCH) {
        await base44.entities.Clasificacion.bulkCreate(payloadRows.slice(b, b + BATCH));
      }

      setStandingsDraft(null);
      await queryClient.refetchQueries({ queryKey: ['centro-standings', category] });
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
      for (const rec of prev) { try { await base44.entities.Resultado.delete(rec.id); } catch {} }

      // 2) Insertar todo normalizado (partidos pendientes sin marcador)
      const isValidScore = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;
      const rows = (matches || [])
        .filter(m => String(m.local || '').trim() && String(m.visitante || '').trim())
        .map(m => {
          const hasBothScores = isValidScore(m.goles_local) && isValidScore(m.goles_visitante);
          return {
            categoria,
            temporada,
            jornada: targetJornada,
            local: String(m.local || '').trim(),
            visitante: String(m.visitante || '').trim(),
            goles_local: hasBothScores ? Number(m.goles_local) : undefined,
            goles_visitante: hasBothScores ? Number(m.goles_visitante) : undefined,
            estado: hasBothScores ? 'finalizado' : 'pendiente',
          };
        });
      const RBATCH = 10;
      for (let b = 0; b < rows.length; b += RBATCH) {
        await base44.entities.Resultado.bulkCreate(rows.slice(b, b + RBATCH));
      }

      setResultsDraft(null);
      await queryClient.refetchQueries({ queryKey: ['resultados', categoria] });
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
      for (const rec of prev) { try { await base44.entities.Goleador.delete(rec.id); } catch {} }

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
      const BATCH = 10;
      for (let b = 0; b < rows.length; b += BATCH) {
        await base44.entities.Goleador.bulkCreate(rows.slice(b, b + BATCH));
      }

      setScorersDraft(null);
      await queryClient.refetchQueries({ queryKey: ['goleadores', categoria] });
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
    <div className="w-full grid grid-cols-5 rounded-xl overflow-hidden bg-white/10 border border-white/20">
      <button
        onClick={() => setView('clasificacion')}
        className={`flex items-center justify-center gap-1 h-11 text-[10px] sm:text-sm font-semibold transition-all ${view === 'clasificacion' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
      >
        <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Clasif.
      </button>
      <button
        onClick={() => setView('resultados')}
        className={`flex items-center justify-center gap-1 h-11 text-[10px] sm:text-sm font-semibold transition-all ${view === 'resultados' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
      >
        <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Result.
      </button>
      <button
        onClick={() => setView('goleadores')}
        className={`flex items-center justify-center gap-1 h-11 text-[10px] sm:text-sm font-semibold transition-all ${view === 'goleadores' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
      >
        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Golea.
      </button>
      <button
        onClick={() => setView('cruces')}
        className={`flex items-center justify-center gap-1 h-11 text-[10px] sm:text-sm font-semibold transition-all ${view === 'cruces' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
      >
        <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Cruces
      </button>
      <button
        onClick={() => setView('jornadas')}
        className={`flex items-center justify-center gap-1 h-11 text-[10px] sm:text-sm font-semibold transition-all ${view === 'jornadas' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
      >
        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Jornadas
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 mb-5 shadow-lg border-2 border-orange-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Centro de Competición</h1>
              <p className="text-sm text-orange-300">CD Bustarviejo — Temporada {(() => { const n = new Date(); const y = n.getFullYear(); return n.getMonth() >= 8 ? `${y}/${y+1}` : `${y-1}/${y}`; })()}</p>
            </div>
            {fav ? (
              <Button variant="ghost" size="icon" onClick={toggleFav} title="Quitar favorito" className="text-yellow-400 hover:text-yellow-300"><Star className="w-5 h-5"/></Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={toggleFav} title="Marcar favorito" className="text-slate-400 hover:text-yellow-400"><StarOff className="w-5 h-5"/></Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowConfig(true)} title="Configurar categorías" className="h-9 px-3 gap-1 border-slate-600 text-slate-300 hover:text-white hover:bg-white/10">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={copyLink} title="Copiar enlace" className="h-9 px-3 border-slate-600 text-slate-300 hover:text-white hover:bg-white/10"><Share2 className="w-4 h-4"/></Button>
            <Button variant="outline" onClick={shareWhatsApp} title="Compartir por WhatsApp" className="h-9 px-3 border-green-600 text-green-400 hover:text-white hover:bg-green-600/20">
              💬
            </Button>
          </div>
        </div>
        {/* View Toggle integrado en el header */}
        {!isAdmin && (
          <div className="mt-4">
            <ViewToggle />
          </div>
        )}
      </div>

      {isAdmin && (
        <Card className="mb-4 border-2 border-orange-500">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-2 md:grid-cols-[1fr_auto] items-start">
              <div className="flex items-center gap-3">
                <span className="font-semibold">Herramientas de Administración</span>
                <Button variant="outline" size="sm" onClick={() => setShowUrlManager(true)} className="gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
                   <Link2 className="w-3.5 h-3.5" /> URLs RFFM
                 </Button>
                 <Button variant="outline" size="sm" onClick={() => setShowMonitor(!showMonitor)} className="gap-1.5 text-xs border-purple-300 text-purple-700 hover:bg-purple-50">
                   <Database className="w-3.5 h-3.5" /> {showMonitor ? 'Ocultar Monitor' : 'Monitor RFFM'}
                 </Button>
              </div>
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

            {/* 📌 RECORDATORIO INICIO DE TEMPORADA */}
            <details className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300 overflow-hidden">
              <summary className="cursor-pointer p-3 font-bold text-amber-900 text-sm hover:bg-amber-100/50 transition-colors">
                📌 ¿Qué URL necesito al cambiar de temporada? (clic para ver)
              </summary>
              <div className="px-4 pb-4 pt-1 space-y-2 text-xs text-slate-700">
                <p className="font-semibold text-orange-800">
                  Solo necesitas <span className="underline">UNA URL por categoría</span>: la de la <strong>Clasificación</strong>.
                </p>
                <p>
                  Con esa única URL, el sistema extrae los 4 códigos internos (<code className="bg-white px-1 rounded text-[10px]">cod_primaria</code>, <code className="bg-white px-1 rounded text-[10px]">codcompeticion</code>, <code className="bg-white px-1 rounded text-[10px]">codgrupo</code>, <code className="bg-white px-1 rounded text-[10px]">codtemporada</code>) y construye automáticamente todo lo demás:
                </p>
                <ul className="list-disc list-inside space-y-0.5 ml-1 text-slate-600">
                  <li>🏆 Clasificación</li>
                  <li>📅 Resultados de cada jornada</li>
                  <li>⚽ Goleadores</li>
                  <li>🔀 Tabla cruzada</li>
                  <li>📝 Actas de partidos</li>
                  <li>🎯 Próximo partido del Bustarviejo</li>
                </ul>
                <div className="bg-white/70 rounded p-2 border border-amber-200">
                  <p className="text-[11px] font-semibold text-slate-700">Ejemplo de URL válida:</p>
                  <code className="text-[10px] text-slate-600 break-all block mt-0.5">
                    https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=1000128&codcompeticion=24037796&codgrupo=24037807&codtemporada=21
                  </code>
                </div>
                <p className="text-[11px] text-slate-600 pt-1">
                  <strong>👉 Pasos:</strong> entra en la intranet RFFM → busca tu categoría → abre su clasificación → copia la URL del navegador → pulsa el botón <strong>"URLs RFFM"</strong> de arriba → pégala en la categoría correspondiente → pulsa "Generar URLs" → "Guardar". <strong>Repite con las 9 categorías</strong>.
                </p>
              </div>
            </details>

            {/* Monitor RFFM integrado */}
            {showMonitor && (
              <Card className="border-2 border-purple-300 bg-purple-50/30">
                <CardContent className="p-4">
                  <RffmMonitorPanel />
                </CardContent>
              </Card>
            )}

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



            {/* Modo de entrada: solo pegar texto */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">📋 Modo de entrada: Pegar Texto</span>
            </div>

            {adminTab === 'clasificacion' && (
              <>
                <RffmImportButton type="standings" config={config} category={category} onDataReady={(d) => setStandingsDraft(d)} />
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={async () => {
                    if (!confirm(`¿Borrar TODA la clasificación de "${category}"? Esta acción no se puede deshacer.`)) return;
                    const all = await base44.entities.Clasificacion.filter({ categoria: category }, '-updated_date', 1000);
                    let deleted = 0;
                    for (const r of all) { try { await base44.entities.Clasificacion.delete(r.id); deleted++; } catch {} }
                    await queryClient.refetchQueries({ queryKey: ['centro-standings', category] });
                    alert(`Eliminados ${deleted} registros de clasificación`);
                  }}>
                    🗑️ Borrar clasificación de {category}
                  </Button>
                </div>
                {!standingsDraft ? (
                    <PasteStandingsForm
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
                <div className="flex items-center gap-2 flex-wrap">
                  <RffmImportButton type="results" config={config} category={category} onDataReady={(d) => setResultsDraft(d)} />
                  <Button
                   variant="outline"
                   size="sm"
                   onClick={importFullHistory}
                   disabled={importingHistory}
                   className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                   {importingHistory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
                   {importingHistory ? 'Importando...' : 'Importar historial completo'}
                  </Button>
                  <Button
                   variant="outline"
                   size="sm"
                   onClick={async () => {
                     if (!confirm(`¿Importar CALENDARIO COMPLETO de "${category}" (partidos jugados + pendientes con fechas)?\n\nEsto reemplazará los datos existentes. Puede tardar 1-2 minutos.`)) return;
                     setImportingCalendar(true);
                     try {
                       const res = await base44.functions.invoke('fetchSeasonCalendar', { categoria: category });
                       const data = res.data;
                       if (data.error) { toast.error(data.error); return; }
                       toast.success(`✅ Calendario importado: ${data.totalMatches} partidos (${data.totalPlayed} jugados + ${data.totalPending} pendientes)`);
                       queryClient.refetchQueries({ queryKey: ['resultados', category] });
                       queryClient.refetchQueries({ queryKey: ['season-schedule', category] });
                     } catch (e) {
                       toast.error('Error: ' + (e.message || 'desconocido'));
                     } finally {
                       setImportingCalendar(false);
                     }
                   }}
                   disabled={importingCalendar}
                   className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50"
                  >
                   {importingCalendar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                   {importingCalendar ? 'Importando...' : '📅 Importar calendario completo'}
                   </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={async () => {
                    if (!confirm(`¿Borrar TODOS los resultados de "${category}"? Esta acción no se puede deshacer.`)) return;
                    const all = await base44.entities.Resultado.filter({ categoria: category }, '-updated_date', 1000);
                    let deleted = 0;
                    for (const r of all) { try { await base44.entities.Resultado.delete(r.id); deleted++; } catch {} }
                    await queryClient.refetchQueries({ queryKey: ['resultados', category] });
                    alert(`Eliminados ${deleted} resultados`);
                  }}>
                    🗑️ Borrar resultados de {category}
                  </Button>
                </div>
                {!resultsDraft ? (
                    <PasteResultsForm categoria={category} onDataExtracted={(d) => setResultsDraft(d)} onCancel={() => setResultsDraft(null)} />
                ) : (
                  <ReviewResultsTable data={resultsDraft} onCancel={() => setResultsDraft(null)} onConfirm={saveResultsToDB} isSubmitting={savingResults} />
                )}
              </>
            )}

            {adminTab === 'goleadores' && (
              <>
                <RffmImportButton type="scorers" config={config} category={category} onDataReady={(d) => setScorersDraft(d)} />
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={async () => {
                    if (!confirm(`¿Borrar TODOS los goleadores de "${category}"? Esta acción no se puede deshacer.`)) return;
                    const all = await base44.entities.Goleador.filter({ categoria: category }, '-updated_date', 5000);
                    let deleted = 0;
                    for (const r of all) { try { await base44.entities.Goleador.delete(r.id); deleted++; } catch {} }
                    await queryClient.refetchQueries({ queryKey: ['goleadores', category] });
                    alert(`Eliminados ${deleted} goleadores`);
                  }}>
                    🗑️ Borrar goleadores de {category}
                  </Button>
                </div>
                {!scorersDraft ? (
                    <PasteScorersForm categoria={category} onDataExtracted={(d) => setScorersDraft(d)} onCancel={() => setScorersDraft(null)} />
                ) : (
                  <ReviewScorersTable data={scorersDraft} onCancel={() => setScorersDraft(null)} onConfirm={saveScorersToDB} isSubmitting={savingScorers} />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}



      {/* Categorías - nombres acortados */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {(visibleCats && visibleCats.length ? visibleCats : CATEGORIES).map(cat => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setFav(localStorage.getItem('fav_comp_cat') === cat); }}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap border-2 text-sm font-medium transition-all ${category === cat ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/30' : 'bg-white hover:bg-orange-50 hover:border-orange-300 border-slate-200'}`}
            title={cat}
          >
            {getShortCategoryName(cat)}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="mt-3 mb-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={view === 'goleadores' ? 'Buscar jugador o equipo...' : 'Buscar equipo...'} className="pl-9 rounded-xl border-2"/>
        </div>
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 hidden md:inline-flex">{category}</Badge>
      </div>

      {/* Próximo partido: Admin usa scraper directo (y auto-guarda), resto lee de BD */}
      {isAdmin ? (
        <NextMatchRffm config={config} category={category} standings={standingsPack} />
      ) : (
        <NextMatchFromDB category={category} standings={standingsPack} />
      )}

      {/* Contenido */}
      <ErrorBoundary fallback={
        <Card><CardContent className="p-8 text-center">
          <p className="text-lg mb-2">⚠️</p>
          <p className="text-slate-700 mb-3">Error al cargar los datos de competición.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700">Recargar</button>
        </CardContent></Card>
      }>
        {view === 'clasificacion' && (
          loadingStandings ? (
            <Card><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div><p className="text-slate-600 text-sm">Cargando clasificación...</p></CardContent></Card>
          ) : filteredStandingsPack ? (
            <StandingsDisplay data={filteredStandingsPack} fullPage={true} />
          ) : (
            <Card className="border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-white overflow-hidden">
              <CardContent className="p-8 text-center relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200/30 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <p className="font-bold text-slate-800 text-lg mb-2">Sin datos de clasificación</p>
                <p className="text-slate-600 text-sm mb-3">La clasificación de <strong>{category}</strong> estará disponible cuando comience la competición.</p>
                <span className="inline-block px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                  🏆 ¡Preparando la temporada!
                </span>
              </CardContent>
            </Card>
          )
        )}

        {view === 'resultados' && (
          <ResultsList categoryFullName={category} isAdmin={isAdmin} />
        )}

        {view === 'goleadores' && (
          <ScorersList categoryFullName={category} isAdmin={isAdmin} />
        )}

        {view === 'cruces' && (
          <CrossTable category={category} config={config} />
        )}

        {view === 'jornadas' && (
          config?.rfef_url ? (
            <BustarviejoSchedule config={config} />
          ) : (
            <Card className="border-2 border-dashed border-orange-200 bg-orange-50">
              <CardContent className="p-8 text-center">
                <p className="text-orange-800 font-semibold">No hay datos de jornadas</p>
                <p className="text-sm text-orange-600 mt-1">Las jornadas aparecerán cuando se configure la URL de la RFFM para esta categoría.</p>
              </CardContent>
            </Card>
          )
        )}
      </ErrorBoundary>

      {/* Última actualización + Notas */}
      <div className="mt-8 text-xs text-slate-400 text-center border-t pt-4 space-y-1">
        {standingsPack?.fecha_actualizacion && (
          <p className="flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Última actualización: {timeAgo(standingsPack.fecha_actualizacion)}
          </p>
        )}
        <p>⚽ Comparativa de equipos disponible en Clasificación</p>
      </div>

      {/* Gestión URLs RFFM */}
      {isAdmin && <RffmUrlManager open={showUrlManager} onOpenChange={setShowUrlManager} />}

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