import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import StandingsDisplay from "../components/standings/StandingsDisplay";
import ResultsList from "../components/results/ResultsList";
import ScorersList from "../components/scorers/ScorersList";
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

  const ViewToggle = () => (
    <div className="inline-flex rounded-xl overflow-hidden border">
      <Button variant={view === 'clasificacion' ? 'default' : 'ghost'} onClick={() => setView('clasificacion')} className={view === 'clasificacion' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}>
        <Trophy className="w-4 h-4 mr-2" /> Clasificación
      </Button>
      <Button variant={view === 'resultados' ? 'default' : 'ghost'} onClick={() => setView('resultados')} className={view === 'resultados' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}>
        <List className="w-4 h-4 mr-2" /> Resultados
      </Button>
      <Button variant={view === 'goleadores' ? 'default' : 'ghost'} onClick={() => setView('goleadores')} className={view === 'goleadores' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}>
        <Users className="w-4 h-4 mr-2" /> Goleadores
      </Button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Centro de Competición</h1>
          {fav ? (
            <Button variant="ghost" size="icon" onClick={toggleFav} title="Quitar favorito"><Star className="w-5 h-5 text-yellow-500"/></Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={toggleFav} title="Marcar favorito"><StarOff className="w-5 h-5 text-slate-500"/></Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle />
          <Button variant="outline" onClick={copyLink} title="Copiar enlace"><Share2 className="w-4 h-4"/></Button>
        </div>
      </div>

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

      {/* Notas */}
      <div className="mt-6 text-xs text-slate-500 text-center">
        Datos mostrados según la última actualización disponible. La comparativa de equipos sigue disponible en Clasificación.
      </div>
    </div>
  );
}