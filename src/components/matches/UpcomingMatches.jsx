import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, RefreshCw, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function UpcomingMatches({ callups }) {
  const [externalMatches, setExternalMatches] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showExternal, setShowExternal] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  
  // Convocatorias internas (partidos ya programados en el sistema)
  const internalMatches = callups
    .filter(c => 
      c.publicada && 
      !c.cerrada && 
      c.fecha_partido >= today &&
      (c.tipo === "Partido" || c.tipo === "Amistoso" || c.tipo === "Torneo")
    )
    .sort((a, b) => a.fecha_partido.localeCompare(b.fecha_partido));

  const loadExternalMatches = async () => {
    if (!selectedCategory) {
      alert("Selecciona una categoría");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await base44.functions.getUpcomingMatches({
        categoria: selectedCategory,
        temporada: "2024-2025",
        dias_adelante: 60,
        source: "rffm"
      });
      
      if (result.success) {
        setExternalMatches(result.matches);
        setShowExternal(true);
      } else {
        setError(result.error || "No se pudieron cargar los partidos");
      }
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    "Fútbol Pre-Benjamín (Mixto)",
    "Fútbol Benjamín (Mixto)",
    "Fútbol Alevín (Mixto)",
    "Fútbol Infantil (Mixto)",
    "Fútbol Cadete",
    "Fútbol Juvenil",
    "Fútbol Aficionado",
    "Fútbol Femenino"
  ];

  const displayMatches = showExternal ? externalMatches : internalMatches;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            Próximos Partidos
          </CardTitle>
          <div className="flex gap-2">
            {showExternal && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowExternal(false);
                  setExternalMatches([]);
                }}
              >
                Ver Convocatorias
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Importar desde RFFM */}
          {!showExternal && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription>
                <div className="space-y-3">
                  <p className="text-sm text-blue-900 font-medium">
                    📡 Importar calendario desde RFFM
                  </p>
                  <div className="flex gap-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={loadExternalMatches}
                      disabled={loading || !selectedCategory}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Importar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-900">{error}</AlertDescription>
            </Alert>
          )}

          {/* Lista de partidos */}
          {displayMatches.length === 0 && !loading ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                {showExternal ? "No se encontraron partidos próximos" : "No hay partidos próximos programados"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">
                  {showExternal ? (
                    <>📡 Calendario RFFM - {selectedCategory}</>
                  ) : (
                    <>🎓 Convocatorias internas ({displayMatches.length})</>
                  )}
                </p>
              </div>

              {displayMatches.map((match, idx) => (
                <div 
                  key={showExternal ? idx : match.id}
                  className="p-4 border-2 border-slate-200 rounded-lg hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className="bg-slate-900 text-white text-xs">
                          {match.categoria}
                        </Badge>
                        {match.tipo && (
                          <Badge variant="outline" className="text-xs">
                            {match.tipo}
                          </Badge>
                        )}
                        {match.local_visitante && (
                          <Badge 
                            className={`text-xs ${
                              match.local_visitante === "Local" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {match.local_visitante}
                          </Badge>
                        )}
                        {match.jornada && (
                          <Badge variant="outline" className="text-xs">
                            {match.jornada}
                          </Badge>
                        )}
                        {match.fuente === "rffm" && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            📡 RFFM
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-lg">
                        {match.titulo || `vs ${match.rival}`}
                      </h4>
                      {match.rival && (
                        <p className="text-slate-600 text-sm">vs {match.rival}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-orange-600" />
                      <span className="font-medium">
                        {format(new Date(match.fecha_partido || match.fecha), "EEEE, d 'de' MMMM", { locale: es })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span>
                        Partido: <strong>{match.hora_partido || match.hora}</strong>
                        {match.hora_concentracion && (
                          <span className="text-xs text-slate-500 ml-2">
                            • Concentración: {match.hora_concentracion}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span>{match.ubicacion || "Por confirmar"}</span>
                    </div>
                  </div>

                  {!showExternal && match.jugadores_convocados && match.jugadores_convocados.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        {match.jugadores_convocados.length} jugador{match.jugadores_convocados.length !== 1 ? 'es' : ''} convocado{match.jugadores_convocados.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}