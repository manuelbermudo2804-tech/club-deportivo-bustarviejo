import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Calendar, RefreshCw, Settings, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function CategoryCard({ config, onRefresh }) {
  const [results, setResults] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState({ results: false, upcoming: false, standings: false });
  const [errors, setErrors] = useState({ results: null, upcoming: null, standings: null });
  const [debugInfo, setDebugInfo] = useState({ results: null, upcoming: null, standings: null });

  const loadResults = async () => {
    setLoading(prev => ({ ...prev, results: true }));
    setErrors(prev => ({ ...prev, results: null }));
    setDebugInfo(prev => ({ ...prev, results: null }));
    try {
      const { data } = await base44.functions.invoke('getMatchResults', {
        categoria: config.categoria_interna,
        temporada: config.temporada,
        limite: 5
      });
      if (data.success) {
        setResults(data.results);
        setDebugInfo(prev => ({ ...prev, results: data.metadata }));
      } else {
        setErrors(prev => ({ ...prev, results: data.error }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, results: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, results: false }));
    }
  };

  const loadUpcoming = async () => {
    setLoading(prev => ({ ...prev, upcoming: true }));
    setErrors(prev => ({ ...prev, upcoming: null }));
    setDebugInfo(prev => ({ ...prev, upcoming: null }));
    try {
      const { data } = await base44.functions.invoke('getUpcomingMatches', {
        categoria: config.categoria_interna,
        temporada: config.temporada
      });
      if (data.success) {
        setUpcoming(data.matches);
        setDebugInfo(prev => ({ ...prev, upcoming: data.metadata }));
      } else {
        setErrors(prev => ({ ...prev, upcoming: data.error }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, upcoming: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, upcoming: false }));
    }
  };

  const loadStandings = async () => {
    setLoading(prev => ({ ...prev, standings: true }));
    setErrors(prev => ({ ...prev, standings: null }));
    setDebugInfo(prev => ({ ...prev, standings: null }));
    try {
      const { data } = await base44.functions.invoke('getStandings', {
        categoria: config.categoria_interna,
        temporada: config.temporada
      });
      if (data.success) {
        setStandings(data.standings);
        setDebugInfo(prev => ({ ...prev, standings: data.metadata }));
      } else {
        setErrors(prev => ({ ...prev, standings: data.error }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, standings: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, standings: false }));
    }
  };

  useEffect(() => {
    loadResults();
    loadUpcoming();
  }, [config]);

  const stats = {
    victorias: results.filter(r => r.resultado === "Victoria").length,
    empates: results.filter(r => r.resultado === "Empate").length,
    derrotas: results.filter(r => r.resultado === "Derrota").length,
    goles_favor: results.reduce((sum, r) => sum + (r.goles_favor || 0), 0),
    goles_contra: results.reduce((sum, r) => sum + (r.goles_contra || 0), 0)
  };

  const hasUrls = config.url_clasificacion && config.url_calendario;

  return (
    <Card className="border-2 border-slate-200 hover:border-orange-300 transition-all">
      <CardHeader className="bg-gradient-to-r from-slate-900 to-black text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{config.categoria_interna}</CardTitle>
            <p className="text-xs text-green-400 mt-1">
              {config.competicion_rffm} {config.grupo_rffm && `- ${config.grupo_rffm}`}
            </p>
            {!hasUrls && (
              <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                URLs no configuradas
              </p>
            )}
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-white hover:bg-white/20"
            onClick={() => {
              loadResults();
              loadUpcoming();
              loadStandings();
              onRefresh();
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="resultados" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="resultados" className="text-xs">Resultados</TabsTrigger>
            <TabsTrigger value="proximos" className="text-xs">Próximos</TabsTrigger>
            <TabsTrigger value="clasificacion" className="text-xs">Tabla</TabsTrigger>
          </TabsList>

          <TabsContent value="resultados" className="space-y-2">
            {loading.results ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-600" />
                <p className="text-xs text-slate-500 mt-2">Cargando resultados...</p>
              </div>
            ) : errors.results ? (
              <div className="text-center py-4">
                <p className="text-xs text-red-600 mb-2">{errors.results}</p>
                {!hasUrls && (
                  <p className="text-xs text-orange-600 mb-2">⚠️ Configura las URLs en Config Match Center</p>
                )}
                <Button size="sm" onClick={loadResults} className="mt-2">Reintentar</Button>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">Sin resultados aún</p>
                {!hasUrls && (
                  <p className="text-xs text-orange-600 mt-2">⚙️ URLs no configuradas</p>
                )}
              </div>
            ) : (
              <>
                {results.slice(0, 3).map((result, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">
                        {new Date(result.fecha_partido).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                      <Badge className={
                        result.resultado === "Victoria" ? "bg-green-500" :
                        result.resultado === "Empate" ? "bg-orange-500" :
                        "bg-red-500"
                      }>
                        {result.resultado}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <div className="text-center flex-1">
                        <p className="text-xs text-slate-600 mb-1">Bustarviejo</p>
                        <p className="text-2xl font-bold">{result.goles_favor}</p>
                      </div>
                      <div className="text-xl font-bold text-slate-400">-</div>
                      <div className="text-center flex-1">
                        <p className="text-xs text-slate-600 mb-1 truncate">{result.rival}</p>
                        <p className="text-2xl font-bold">{result.goles_contra}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{stats.victorias}</p>
                    <p className="text-xs text-slate-600">V</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-600">{stats.empates}</p>
                    <p className="text-xs text-slate-600">E</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-600">{stats.derrotas}</p>
                    <p className="text-xs text-slate-600">D</p>
                  </div>
                </div>
                {debugInfo.results && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <p className="text-blue-900 font-semibold">📋 Info carga:</p>
                    <p className="text-blue-700">Equipo: {debugInfo.results.equipo}</p>
                    <p className="text-blue-700">Competición: {debugInfo.results.competicion}</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="proximos" className="space-y-2">
            {loading.upcoming ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-600" />
                <p className="text-xs text-slate-500 mt-2">Cargando próximos partidos...</p>
              </div>
            ) : errors.upcoming ? (
              <div className="text-center py-4">
                <p className="text-xs text-red-600 mb-2">{errors.upcoming}</p>
                {!hasUrls && (
                  <p className="text-xs text-orange-600 mb-2">⚠️ Configura las URLs en Config Match Center</p>
                )}
                <Button size="sm" onClick={loadUpcoming} className="mt-2">Reintentar</Button>
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">No hay próximos partidos</p>
                {!hasUrls && (
                  <p className="text-xs text-orange-600 mt-2">⚙️ URLs no configuradas</p>
                )}
              </div>
            ) : (
              <>
                {upcoming.slice(0, 3).map((match, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{match.rival}</p>
                        {match.jornada && <p className="text-xs text-slate-600">{match.jornada}</p>}
                      </div>
                      <Badge className={match.local_visitante === "Local" ? "bg-green-600" : "bg-blue-600"}>
                        {match.local_visitante}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(match.fecha).toLocaleDateString('es-ES', { 
                          weekday: 'short', day: 'numeric', month: 'short' 
                        })}
                      </div>
                      <div>⏰ {match.hora}</div>
                    </div>
                  </div>
                ))}
                {debugInfo.upcoming && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <p className="text-blue-900 font-semibold">📋 Info carga:</p>
                    <p className="text-blue-700">Equipo: {debugInfo.upcoming.equipo}</p>
                    <p className="text-blue-700">Total partidos: {debugInfo.upcoming.total_matches}</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="clasificacion" className="space-y-2">
            {standings.length === 0 && !loading.standings ? (
              <div className="text-center py-6">
                <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <Button size="sm" onClick={loadStandings} className="bg-orange-600 hover:bg-orange-700">
                  <Trophy className="w-4 h-4 mr-2" />
                  Cargar Tabla
                </Button>
                {!hasUrls && (
                  <p className="text-xs text-orange-600 mt-2">⚠️ URLs no configuradas</p>
                )}
              </div>
            ) : loading.standings ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-600" />
                <p className="text-xs text-slate-500 mt-2">Cargando clasificación...</p>
              </div>
            ) : errors.standings ? (
              <div className="text-center py-4">
                <p className="text-xs text-red-600 mb-2">{errors.standings}</p>
                {!hasUrls && (
                  <p className="text-xs text-orange-600 mb-2">⚠️ Configura las URLs en Config Match Center</p>
                )}
                <Button size="sm" onClick={loadStandings} className="mt-2">Reintentar</Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1">#</th>
                        <th className="text-left py-1">Equipo</th>
                        <th className="text-center py-1">PJ</th>
                        <th className="text-center py-1">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.slice(0, 8).map((team) => {
                        const isBusta = team.equipo.toLowerCase().includes('bustarviejo');
                        return (
                          <tr key={team.posicion} className={isBusta ? 'bg-orange-50 font-semibold' : ''}>
                            <td className="py-1">{team.posicion}</td>
                            <td className="py-1 truncate max-w-[120px]">
                              {team.equipo}
                              {isBusta && ' ⭐'}
                            </td>
                            <td className="text-center py-1">{team.partidos_jugados}</td>
                            <td className="text-center py-1 font-bold">{team.puntos}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {debugInfo.standings && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <p className="text-blue-900 font-semibold">📋 Info carga:</p>
                    <p className="text-blue-700">Equipo: {debugInfo.standings.equipo}</p>
                    <p className="text-blue-700">Jornada: {debugInfo.standings.jornada}</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function MatchApp() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const { data: teamConfigs, isLoading } = useQuery({
    queryKey: ['teamConfigs', refreshKey],
    queryFn: () => base44.entities.TeamConfig.filter({ activo: true, temporada: "2024-2025" }),
    initialData: [],
  });

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin");
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Cargando Match Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-3 py-6">
          <div className="flex items-center justify-center gap-3">
            <img 
              src="https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png" 
              alt="CD Bustarviejo"
              className="w-16 h-16 rounded-2xl shadow-xl ring-4 ring-green-500/50"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                CD Bustarviejo
              </h1>
              <p className="text-green-400 font-medium">Match Center 🔴 EN VIVO</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm">
            Datos en tiempo real de la RFFM
          </p>
        </div>

        {teamConfigs.length === 0 ? (
          <Alert className="bg-orange-500/20 border-orange-500">
            <AlertDescription className="text-white">
              <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-semibold mb-2">⚙️ Configuración necesaria</p>
                  <p className="text-sm">
                    No hay equipos configurados. {isAdmin ? 'Ve a "Config Match Center" y añade las URLs de cada equipo.' : 'Contacta con el administrador.'}
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamConfigs.map(config => (
              <CategoryCard 
                key={config.id} 
                config={config}
                onRefresh={() => setRefreshKey(prev => prev + 1)}
              />
            ))}
          </div>
        )}

        <div className="text-center text-slate-400 text-xs py-4">
          <p>🔴 Datos actualizados de la RFFM</p>
          <p className="mt-1">Última carga: {new Date().toLocaleTimeString('es-ES')}</p>
        </div>
      </div>
    </div>
  );
}