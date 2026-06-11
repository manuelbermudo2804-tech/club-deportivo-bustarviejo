import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Loader2, Users, Search, Home, LogIn, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RankingTable from "@/components/porra/ranking/RankingTable";
import ReglasDesempate from "@/components/porra/ranking/ReglasDesempate";
import LiveIndicator from "@/components/porra/ranking/LiveIndicator";
import PorraInfoDuranteTorneo from "@/components/porra/PorraInfoDuranteTorneo";
import BracketReeditAvisoBanner from "@/components/porra/BracketReeditAvisoBanner";

const AUTO_REFRESH_MS = 90000; // 90 segundos — equilibrio entre frescura y carga del servidor con muchos usuarios concurrentes

// Página pública del ranking: ?liga=XXXXXX para mini-liga, sin param para global
export default function PorraRanking() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const codigoLigaUrl = params.get('liga');
  const tokenUrl = params.get('token'); // Para resaltar al usuario si viene de su porra
  // Detectar si venimos de la app interna autenticada para no salir del entorno
  const fromApp = params.get('from') === 'app' || !!localStorage.getItem('base44_access_token');

  const [rankingGlobal, setRankingGlobal] = useState([]);
  const [rankingLiga, setRankingLiga] = useState([]);
  const [liga, setLiga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [codigoInput, setCodigoInput] = useState(codigoLigaUrl || '');
  const [miAlias, setMiAlias] = useState(null);
  const [ocultoPorAdmin, setOcultoPorAdmin] = useState(false);
  const [fechaLimiteBracket, setFechaLimiteBracket] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    document.title = "Ranking — Porra Mundial 2026";
    cargar(true);
    // Cargar fecha límite del bracket para mostrar aviso amarillo
    base44.functions.invoke('porraPublicLanding', {})
      .then(res => setFechaLimiteBracket(res.data?.config?.fecha_limite_predicciones || null))
      .catch(() => {});
  }, [codigoLigaUrl]);

  useEffect(() => {
    if (tokenUrl) {
      // Usar endpoint público (funciona sin auth para usuarios web)
      base44.functions.invoke('porraGetByToken', { token: tokenUrl })
        .then(res => { if (res.data?.participante?.alias_equipo) setMiAlias(res.data.participante.alias_equipo); })
        .catch(() => {});
    }
  }, [tokenUrl]);

  // Auto-refresh cada 30s — solo si la pestaña está visible (ahorra recursos)
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') {
        cargar(false);
      }
    };
    intervalRef.current = setInterval(tick, AUTO_REFRESH_MS);
    // Refrescar inmediatamente al volver a la pestaña
    const onVisibility = () => { if (document.visibilityState === 'visible') cargar(false); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoLigaUrl]);

  const cargar = async (esInicial = false) => {
    if (esInicial) setLoading(true);
    else setRefreshing(true);
    try {
      // Cargar ranking global siempre
      const resGlobal = await base44.functions.invoke('porraRanking', { limite: 500 });
      setRankingGlobal(resGlobal.data?.ranking || []);
      setOcultoPorAdmin(resGlobal.data?.oculto || false);

      // Si hay código de liga, cargar también su ranking
      if (codigoLigaUrl) {
        const resLiga = await base44.functions.invoke('porraRanking', { codigo_liga: codigoLigaUrl, limite: 500 });
        if (resLiga.data?.ranking) {
          setRankingLiga(resLiga.data.ranking);
          setLiga(resLiga.data.liga);
        }
      }
      setLastUpdate(Date.now());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const buscarLiga = () => {
    if (codigoInput.trim()) {
      const suffix = fromApp ? '&from=app' : '';
      navigate(`/PorraRanking?liga=${codigoInput.trim().toUpperCase()}${suffix}`);
    }
  };

  const filtrar = (lista) => {
    if (!busqueda) return lista;
    const q = busqueda.toLowerCase();
    return lista.filter(p =>
      p.alias_equipo.toLowerCase().includes(q)
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-orange-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 via-orange-600 to-yellow-500 text-white sticky top-0 z-20 shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-300" />
              <div>
                <h1 className="text-xl font-black">Ranking</h1>
                <p className="text-xs text-white/80">Porra Mundial 2026 · CD Bustarviejo</p>
              </div>
            </div>
            <Button
              onClick={() => navigate(fromApp ? '/MiPorra' : '/Porra')}
              size="sm"
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Home className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Inicio</span>
            </Button>
          </div>
          {/* Indicador EN VIVO bajo el header */}
          {!loading && (
            <div className="mt-2 flex justify-end">
              <LiveIndicator lastUpdate={lastUpdate} onRefresh={() => cargar(false)} refreshing={refreshing} />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 md:p-4 space-y-4">
        {/* Info durante el torneo: actualizaciones, puntos guardados, etc. */}
        <PorraInfoDuranteTorneo variant="ranking" />
        {/* Aviso bracket FIFA 2026 reeditable hasta 28 jun 19:00h — desaparece solo */}
        <BracketReeditAvisoBanner fechaLimiteBracket={fechaLimiteBracket} variant="light" />

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-orange-400" />
            <p className="text-white/70 mt-2 text-sm">Cargando ranking...</p>
          </div>
        ) : (
          <>
            {/* Si viene con liga, mostrar tabs */}
            {codigoLigaUrl ? (
              <Tabs defaultValue="liga">
                <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 backdrop-blur p-1">
                  <TabsTrigger value="liga" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-white/70">
                    👥 {liga?.nombre || 'Mi liga'}
                  </TabsTrigger>
                  <TabsTrigger value="global" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-white/70">
                    🌍 Global
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="liga" className="mt-4 space-y-3">
                  {liga && (
                    <Card className="bg-gradient-to-r from-orange-500 to-yellow-500 border-0 text-white">
                      <CardContent className="p-4">
                        <p className="font-black text-lg">{liga.nombre}</p>
                        {liga.descripcion && <p className="text-sm opacity-90 mt-0.5">{liga.descripcion}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="bg-white/20 backdrop-blur px-2 py-1 rounded-full font-bold">
                            🔑 {liga.codigo}
                          </span>
                          <span className="bg-white/20 backdrop-blur px-2 py-1 rounded-full font-bold">
                            👥 {rankingLiga.length} miembros
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <BuscadorYTabla ranking={filtrar(rankingLiga)} busqueda={busqueda} setBusqueda={setBusqueda} miAlias={miAlias} />
                </TabsContent>

                <TabsContent value="global" className="mt-4 space-y-3">
                  {ocultoPorAdmin ? (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardContent className="p-6 text-center text-white">
                        <p className="font-bold">El ranking global está oculto</p>
                        <p className="text-xs text-white/60 mt-1">El admin lo activará cuando empiece el torneo</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <BuscadorYTabla ranking={filtrar(rankingGlobal)} busqueda={busqueda} setBusqueda={setBusqueda} miAlias={miAlias} />
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              // Sin liga: ranking global + buscador de liga
              <>
                {/* Buscador de mini-liga */}
                <Card className="bg-slate-800 border-orange-500/30">
                  <CardContent className="p-3">
                    <p className="text-sm font-bold text-white mb-2 flex items-center gap-1">
                      <LogIn className="w-4 h-4 text-orange-400" /> Ver ranking de mini-liga
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={codigoInput}
                        onChange={e => setCodigoInput(e.target.value.toUpperCase())}
                        placeholder="Código de 6 caracteres"
                        className="bg-slate-700 border-slate-600 text-white font-mono uppercase"
                        maxLength={6}
                      />
                      <Button onClick={buscarLiga} className="bg-orange-600 hover:bg-orange-700">
                        Ver
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Ranking global */}
                <Card className="bg-white">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <p className="font-black text-slate-900 flex items-center gap-2">
                        🌍 Ranking Global
                      </p>
                      <div className="flex items-center gap-2">
                        <ReglasDesempate trigger={
                          <button className="text-xs text-orange-700 hover:text-orange-900 font-bold flex items-center gap-1 underline">
                            <Info className="w-3 h-3" /> Reglas de desempate
                          </button>
                        } />
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
                          {rankingGlobal.length} participantes
                        </span>
                      </div>
                    </div>
                    {ocultoPorAdmin ? (
                      <p className="text-center py-8 text-slate-500 text-sm">El ranking global está oculto temporalmente</p>
                    ) : (
                      <>
                        <BuscadorInline busqueda={busqueda} setBusqueda={setBusqueda} />
                        <RankingTable ranking={filtrar(rankingGlobal)} miAlias={miAlias} />
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BuscadorYTabla({ ranking, busqueda, setBusqueda, miAlias }) {
  return (
    <Card className="bg-white">
      <CardContent className="p-3 md:p-4">
        <div className="flex justify-end mb-2">
          <ReglasDesempate trigger={
            <button className="text-xs text-orange-700 hover:text-orange-900 font-bold flex items-center gap-1 underline">
              <Info className="w-3 h-3" /> Reglas de desempate
            </button>
          } />
        </div>
        <BuscadorInline busqueda={busqueda} setBusqueda={setBusqueda} />
        <RankingTable ranking={ranking} miAlias={miAlias} />
      </CardContent>
    </Card>
  );
}

function BuscadorInline({ busqueda, setBusqueda }) {
  return (
    <div className="relative mb-3">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <Input
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar por alias..."
        className="pl-9 bg-slate-50 border-slate-200"
      />
    </div>
  );
}