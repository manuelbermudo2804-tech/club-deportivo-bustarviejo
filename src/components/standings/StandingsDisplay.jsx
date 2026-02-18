import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StandingsStats from "./StandingsStats";
import NextMatchStats from "./NextMatchStats";
import TeamComparison from "./TeamComparison";
import TeamSummaryBanner from "./TeamSummaryBanner";
import PositionEvolutionChart from "./PositionEvolutionChart";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function StandingsDisplay({ data, onClose, fullPage = false }) {
  const navigate = useNavigate();
  const sortedData = [...data.data].sort((a, b) => a.posicion - b.posicion);

  const content = (
    <>
      <div className="mb-6 cursor-pointer" onClick={() => navigate(createPageUrl('ParentCallups'))}>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-slate-900">{data.categoria}</h2>
        </div>
        <div className="flex gap-3 text-sm text-slate-600">
          <Badge variant="outline">Temporada {data.temporada}</Badge>
          <Badge variant="outline">Jornada {data.jornada}</Badge>
        </div>
      </div>

      {/* Resumen visual del equipo */}
      <TeamSummaryBanner standings={sortedData} categoria={data.categoria} />

      {/* Próximo partido y comparativa */}
      <NextMatchStats categoria={data.categoria} standings={sortedData} />

      {/* Estadísticas calculadas */}
      <StandingsStats data={data} />

      {/* Comparador de equipos */}
      <TeamComparison standings={sortedData} categoria={data.categoria} />

      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full text-xs sm:text-sm min-w-[600px]">
          <thead className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
            <tr>
              <th className="text-left p-2 sm:p-3 rounded-tl-lg">Pos</th>
              <th className="text-left p-2 sm:p-3">Equipo</th>
              <th className="text-center p-2 sm:p-3">PJ</th>
              <th className="text-center p-2 sm:p-3">G</th>
              <th className="text-center p-2 sm:p-3">E</th>
              <th className="text-center p-2 sm:p-3">P</th>
              <th className="text-center p-2 sm:p-3">GF</th>
              <th className="text-center p-2 sm:p-3">GC</th>
              <th className="text-center p-2 sm:p-3 font-bold">Pts</th>
              <th className="p-2 sm:p-3 rounded-tr-lg hidden sm:table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const maxPts = sortedData.length > 0 ? Math.max(...sortedData.map(s => s.puntos || 0)) : 1;
              return sortedData.map((standing, index) => {
                const diff = (standing.goles_favor || 0) - (standing.goles_contra || 0);
                const isBustarviejo = standing.nombre_equipo.toLowerCase().includes('bustarviejo') || 
                                     standing.nombre_equipo.toLowerCase().includes('bustar');
                const ptsPct = maxPts > 0 ? ((standing.puntos || 0) / maxPts) * 100 : 0;

                return (
                  <tr 
                    key={index}
                    className={`border-b hover:bg-slate-50 transition-colors ${
                      isBustarviejo ? 'bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100 font-bold ring-2 ring-orange-400 ring-inset shadow-sm' :
                      standing.posicion === 1 ? 'bg-yellow-50' :
                      standing.posicion === 2 ? 'bg-slate-100' :
                      standing.posicion === 3 ? 'bg-orange-50' :
                      ''
                    }`}
                  >
                    <td className="p-2 sm:p-3 font-bold">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {standing.posicion === 1 ? '🥇' : standing.posicion === 2 ? '🥈' : standing.posicion === 3 ? '🥉' : standing.posicion}
                        {isBustarviejo && <span className="text-orange-600">⚽</span>}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">
                      <span className={isBustarviejo ? 'text-orange-700' : ''}>{standing.nombre_equipo}</span>
                    </td>
                    <td className="text-center p-2 sm:p-3">{standing.partidos_jugados || '-'}</td>
                    <td className="text-center p-2 sm:p-3 text-green-600 font-semibold">{standing.ganados || '-'}</td>
                    <td className="text-center p-2 sm:p-3 text-slate-500">{standing.empatados || '-'}</td>
                    <td className="text-center p-2 sm:p-3 text-red-500 font-semibold">{standing.perdidos || '-'}</td>
                    <td className="text-center p-2 sm:p-3">{standing.goles_favor || '-'}</td>
                    <td className="text-center p-2 sm:p-3">{standing.goles_contra || '-'}</td>
                    <td className="text-center p-2 sm:p-3 font-bold text-base sm:text-lg text-orange-600">{standing.puntos}</td>
                    <td className="p-2 sm:p-3 hidden sm:table-cell w-24">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isBustarviejo ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                            standing.posicion === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                            standing.posicion <= 3 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                            standing.posicion > sortedData.length - 3 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                            'bg-gradient-to-r from-slate-400 to-slate-500'
                          }`}
                          style={{ width: `${ptsPct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500 mt-4 text-center">
        Actualizado: {new Date(data.fecha_actualizacion).toLocaleString('es-ES')}
      </div>
    </>
  );

  if (fullPage) {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="w-6 h-6 text-yellow-500" />
            {data.categoria}
          </DialogTitle>
          <div className="flex gap-3 text-sm text-slate-600 mt-2">
            <Badge variant="outline">Temporada {data.temporada}</Badge>
            <Badge variant="outline">Jornada {data.jornada}</Badge>
          </div>
        </DialogHeader>
        <StandingsStats data={data} />
        {content}
      </DialogContent>
    </Dialog>
  );
}