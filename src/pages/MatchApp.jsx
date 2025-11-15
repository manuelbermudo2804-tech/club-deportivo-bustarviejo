import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Calendar, Target, TrendingUp, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function CategoryCard({ config }) {
  const today = new Date().toISOString().split('T')[0];

  const { data: results } = useQuery({
    queryKey: ['matchResults', config.categoria_interna],
    queryFn: () => base44.entities.MatchResult.filter({ categoria: config.categoria_interna }, '-fecha_partido', 5),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['convocatorias', config.categoria_interna],
    queryFn: () => base44.entities.Convocatoria.filter({ categoria: config.categoria_interna, publicada: true }),
    initialData: [],
  });

  const upcomingMatches = callups
    .filter(c => !c.cerrada && c.fecha_partido >= today && (c.tipo === "Partido" || c.tipo === "Amistoso"))
    .sort((a, b) => a.fecha_partido.localeCompare(b.fecha_partido))
    .slice(0, 3);

  const latestResults = results.slice(0, 3);

  const stats = {
    victorias: results.filter(r => r.resultado === "Victoria").length,
    empates: results.filter(r => r.resultado === "Empate").length,
    derrotas: results.filter(r => r.resultado === "Derrota").length,
    goles_favor: results.reduce((sum, r) => sum + (r.goles_favor || 0), 0),
    goles_contra: results.reduce((sum, r) => sum + (r.goles_contra || 0), 0)
  };

  return (
    <Card className="border-2 border-slate-200 hover:border-orange-300 transition-all">
      <CardHeader className="bg-gradient-to-r from-slate-900 to-black text-white">
        <CardTitle className="text-lg">{config.categoria_interna}</CardTitle>
        <p className="text-xs text-green-400 mt-1">
          {config.competicion_rffm} {config.grupo_rffm && `- ${config.grupo_rffm}`}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="resultados" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="resultados" className="text-xs">Resultados</TabsTrigger>
            <TabsTrigger value="proximos" className="text-xs">Próximos</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="resultados" className="space-y-2">
            {latestResults.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Sin resultados</p>
            ) : (
              latestResults.map(result => (
                <div key={result.id} className="p-3 bg-slate-50 rounded-lg">
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
                      <p className="text-xs text-slate-600 mb-1">{result.rival}</p>
                      <p className="text-2xl font-bold">{result.goles_contra}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="proximos" className="space-y-2">
            {upcomingMatches.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No hay partidos próximos</p>
            ) : (
              upcomingMatches.map(match => (
                <div key={match.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{match.titulo}</p>
                      <p className="text-xs text-slate-600 mt-1">vs {match.rival}</p>
                    </div>
                    <Badge className={match.local_visitante === "Local" ? "bg-green-600" : "bg-blue-600"}>
                      {match.local_visitante}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(match.fecha_partido).toLocaleDateString('es-ES', { 
                        weekday: 'short', day: 'numeric', month: 'short' 
                      })}
                    </div>
                    <div>⏰ {match.hora_partido}</div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Sin estadísticas</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats.victorias}</p>
                    <p className="text-xs text-slate-600">Victorias</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{stats.empates}</p>
                    <p className="text-xs text-slate-600">Empates</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{stats.derrotas}</p>
                    <p className="text-xs text-slate-600">Derrotas</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-600">{stats.goles_favor}</p>
                    <p className="text-xs text-slate-600">Goles Favor</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xl font-bold text-slate-600">{stats.goles_contra}</p>
                    <p className="text-xs text-slate-600">Goles Contra</p>
                  </div>
                </div>
                <div className="text-center p-3 bg-gradient-to-r from-orange-50 to-green-50 rounded-lg border-2 border-orange-200">
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.goles_favor - stats.goles_contra > 0 ? '+' : ''}{stats.goles_favor - stats.goles_contra}
                  </p>
                  <p className="text-xs text-slate-600">Diferencia de Goles</p>
                </div>
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
    refetchInterval: 60000,
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

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
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
              <p className="text-green-400 font-medium">Match Center</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm">
            Resultados y próximos partidos en tiempo real
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
                    No hay equipos configurados. {isAdmin ? 'Ve a la sección de configuración y crea registros en TeamConfig para mapear tus categorías a los equipos de la RFFM.' : 'Contacta con el administrador para configurar los equipos.'}
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" key={refreshKey}>
            {teamConfigs.map(config => (
              <CategoryCard key={config.id} config={config} />
            ))}
          </div>
        )}

        <div className="text-center text-slate-400 text-xs py-4">
          <p>Actualización automática cada minuto</p>
          <p className="mt-1">🔄 Última actualización: {new Date().toLocaleTimeString('es-ES')}</p>
        </div>
      </div>
    </div>
  );
}