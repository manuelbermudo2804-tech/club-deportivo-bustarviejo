import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import MatchReportModal from "./MatchReportModal";

export default function ResultsList({ categoryFullName, isAdmin, onDelete }) {
  const [showAll, setShowAll] = React.useState(false);
  const [selectedMatch, setSelectedMatch] = React.useState(null);
  const queryClient = useQueryClient();
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['resultados', categoryFullName],
    queryFn: () => base44.entities.Resultado.filter({ categoria: categoryFullName }, '-jornada', 200),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });

  if (isLoading && results.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
          <p className="text-slate-600 text-sm">Cargando resultados...</p>
        </CardContent>
      </Card>
    );
  }

  const grouped = results.reduce((acc, r) => {
    const key = `${r.temporada}|${r.jornada}`;
    if (!acc[key]) acc[key] = { temporada: r.temporada, jornada: r.jornada, data: [] };
    acc[key].data.push(r);
    return acc;
  }, {});

  const allGroups = Object.values(grouped).sort((a, b) => (b.jornada ?? 0) - (a.jornada ?? 0));
  // By default show only latest 2 jornadas, expand to all on demand
  const groups = showAll ? allGroups : allGroups.slice(0, 2);

  const initials = (s) => {
    const str = String(s || '').trim();
    if (!str) return '';
    const parts = str.split(/\s+/);
    return (parts[0][0] || '').toUpperCase();
  };

  const isBustarviejo = (name) => /bustarviejo/i.test(String(name || ''));

  if (groups.length === 0) {
    return (
      <Card className="border-2 border-dashed border-slate-300">
        <CardContent className="p-12 text-center text-slate-500">
          No hay resultados guardados todavía
        </CardContent>
      </Card>
    );
  }

  // Calcular resumen de Bustarviejo para banner
  const bustResults = results.filter(m => isBustarviejo(m.local) || isBustarviejo(m.visitante));
  const bustStats = bustResults.reduce((acc, m) => {
    const hasScore = Number.isFinite(m.goles_local) && Number.isFinite(m.goles_visitante);
    if (!hasScore) return acc;
    const isLocal = isBustarviejo(m.local);
    const gf = isLocal ? m.goles_local : m.goles_visitante;
    const gc = isLocal ? m.goles_visitante : m.goles_local;
    acc.played++;
    acc.gf += gf;
    acc.gc += gc;
    if (gf > gc) acc.wins++;
    else if (gf === gc) acc.draws++;
    else acc.losses++;
    return acc;
  }, { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, gc: 0 });

  return (
    <div className="space-y-4">
      {/* Resumen Bustarviejo */}
      {bustStats.played > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-lg border-2 border-orange-500/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚽</span>
            <span className="font-bold text-lg">CD Bustarviejo — Resumen de Resultados</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-lg font-bold">{bustStats.played}</p>
              <p className="text-[10px] text-slate-400 uppercase">Jugados</p>
            </div>
            <div className="bg-green-500/20 rounded-lg p-2">
              <p className="text-lg font-bold text-green-400">{bustStats.wins}</p>
              <p className="text-[10px] text-green-300 uppercase">Victorias</p>
            </div>
            <div className="bg-yellow-500/20 rounded-lg p-2">
              <p className="text-lg font-bold text-yellow-400">{bustStats.draws}</p>
              <p className="text-[10px] text-yellow-300 uppercase">Empates</p>
            </div>
            <div className="bg-red-500/20 rounded-lg p-2">
              <p className="text-lg font-bold text-red-400">{bustStats.losses}</p>
              <p className="text-[10px] text-red-300 uppercase">Derrotas</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-lg font-bold">{bustStats.gf}</p>
              <p className="text-[10px] text-slate-400 uppercase">Goles F</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-lg font-bold">{bustStats.gc}</p>
              <p className="text-[10px] text-slate-400 uppercase">Goles C</p>
            </div>
          </div>
          {/* Racha últimos 5 */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-400">Últimos partidos:</span>
            <div className="flex gap-1">
              {bustResults
                .filter(m => Number.isFinite(m.goles_local) && Number.isFinite(m.goles_visitante))
                .sort((a, b) => (b.jornada ?? 0) - (a.jornada ?? 0))
                .slice(0, 5)
                .reverse()
                .map((m, i) => {
                  const isLocal = isBustarviejo(m.local);
                  const gf = isLocal ? m.goles_local : m.goles_visitante;
                  const gc = isLocal ? m.goles_visitante : m.goles_local;
                  const result = gf > gc ? 'V' : gf === gc ? 'E' : 'D';
                  const color = result === 'V' ? 'bg-green-500' : result === 'E' ? 'bg-yellow-500' : 'bg-red-500';
                  return (
                    <div key={i} className={`${color} w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow`} title={`J${m.jornada}: ${m.local} ${m.goles_local}-${m.goles_visitante} ${m.visitante}`}>
                      {result}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Toggle historial */}
      {allGroups.length > 2 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="gap-2 rounded-xl border-2 border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAll ? 'Ver solo últimas jornadas' : `Ver historial completo (${allGroups.length} jornadas)`}
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((g, idx) => (
          <Card key={idx} className="hover:shadow-lg transition-shadow border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-600 text-white font-bold">J{g.jornada ?? '-'}</Badge>
                  <Badge variant="outline" className="text-slate-600">{g.temporada}</Badge>
                </div>
                {isAdmin && onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`¿Eliminar resultados de Jornada ${g.jornada}?`)) {
                        onDelete({ temporada: g.temporada, jornada: g.jornada });
                      }
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {g.data
                .sort((a, b) => {
                  // Bustarviejo matches first
                  const aBust = isBustarviejo(a.local) || isBustarviejo(a.visitante);
                  const bBust = isBustarviejo(b.local) || isBustarviejo(b.visitante);
                  if (aBust && !bBust) return -1;
                  if (!aBust && bBust) return 1;
                  return (a.local || '').localeCompare(b.local || '');
                })
                .map((m) => {
                  const hasScore = Number.isFinite(m.goles_local) && Number.isFinite(m.goles_visitante);
                  const isBust = isBustarviejo(m.local) || isBustarviejo(m.visitante);
                  
                  // Determine Bustarviejo result
                  let bustResult = null;
                  if (isBust && hasScore) {
                    const isLocal = isBustarviejo(m.local);
                    const gf = isLocal ? m.goles_local : m.goles_visitante;
                    const gc = isLocal ? m.goles_visitante : m.goles_local;
                    bustResult = gf > gc ? 'win' : gf === gc ? 'draw' : 'loss';
                  }

                  const borderColor = bustResult === 'win' ? 'border-green-400 bg-green-50' : 
                                     bustResult === 'draw' ? 'border-yellow-400 bg-yellow-50' :
                                     bustResult === 'loss' ? 'border-red-300 bg-red-50' : '';
                  
                  return (
                    <div key={m.id} className={`grid grid-cols-[1fr_auto_1fr] items-center py-2.5 px-2 gap-2 rounded-xl border ${isBust ? `${borderColor} border-2 shadow-sm` : 'border-slate-100'}`}>
                      <div className={`pr-1 text-xs sm:text-sm whitespace-normal break-words font-medium text-left ${isBustarviejo(m.local) ? 'text-orange-700 font-bold' : 'text-slate-800'}`}>
                        {isBustarviejo(m.local) && '⚽ '}{m.local}
                      </div>

                      <div className="px-2 text-center flex-shrink-0 min-w-[56px]">
                        <div className={`text-base font-extrabold whitespace-nowrap ${hasScore ? (isBust ? 'text-orange-700' : 'text-slate-900') : 'text-slate-400'}`}>
                          {hasScore ? `${m.goles_local} - ${m.goles_visitante}` : 'vs'}
                        </div>
                        {bustResult && (
                          <div className={`text-[10px] font-bold mt-0.5 ${bustResult === 'win' ? 'text-green-600' : bustResult === 'draw' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {bustResult === 'win' ? '✅ Victoria' : bustResult === 'draw' ? '🤝 Empate' : '❌ Derrota'}
                          </div>
                        )}
                      </div>

                      <div className={`pl-1 text-xs sm:text-sm whitespace-normal break-words font-medium text-right ${isBustarviejo(m.visitante) ? 'text-orange-700 font-bold' : 'text-slate-800'}`}>
                        {m.visitante}{isBustarviejo(m.visitante) && ' ⚽'}
                      </div>
                      {m.acta_url && isBust && (() => {
                        // Convert intranet URL to public URL
                        let publicUrl = m.acta_url;
                        if (publicUrl.includes('intranet.ffmadrid.es')) {
                          publicUrl = publicUrl.replace('intranet.ffmadrid.es', 'publicad.ffmadrid.es');
                        }
                        return (
                          <div className="col-span-3 flex justify-center pt-1">
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                              <FileText className="w-3 h-3" />
                              Ficha del partido
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}