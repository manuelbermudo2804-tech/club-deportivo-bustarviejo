import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StandingsDisplay({ data, onClose }) {
  const sortedData = [...data.data].sort((a, b) => a.posicion - b.posicion);

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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
              <tr>
                <th className="text-left p-3 rounded-tl-lg">Pos</th>
                <th className="text-left p-3">Equipo</th>
                <th className="text-center p-3">PJ</th>
                <th className="text-center p-3">G</th>
                <th className="text-center p-3">E</th>
                <th className="text-center p-3">P</th>
                <th className="text-center p-3">GF</th>
                <th className="text-center p-3">GC</th>
                <th className="text-center p-3 rounded-tr-lg font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((standing, index) => (
                <tr 
                  key={index}
                  className={`border-b hover:bg-slate-50 ${
                    standing.posicion === 1 ? 'bg-yellow-50' :
                    standing.posicion === 2 ? 'bg-slate-100' :
                    standing.posicion === 3 ? 'bg-orange-50' :
                    ''
                  }`}
                >
                  <td className="p-3 font-bold">
                    <div className="flex items-center gap-2">
                      {standing.posicion}
                      {standing.posicion === 1 && <Trophy className="w-4 h-4 text-yellow-500" />}
                      {standing.posicion <= 3 && standing.posicion > 1 && (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      )}
                      {standing.posicion > sortedData.length - 3 && (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-medium">{standing.nombre_equipo}</td>
                  <td className="text-center p-3">{standing.partidos_jugados || '-'}</td>
                  <td className="text-center p-3">{standing.ganados || '-'}</td>
                  <td className="text-center p-3">{standing.empatados || '-'}</td>
                  <td className="text-center p-3">{standing.perdidos || '-'}</td>
                  <td className="text-center p-3">{standing.goles_favor || '-'}</td>
                  <td className="text-center p-3">{standing.goles_contra || '-'}</td>
                  <td className="text-center p-3 font-bold text-lg">{standing.puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-slate-500 mt-4 text-center">
          Actualizado: {new Date(data.fecha_actualizacion).toLocaleString('es-ES')}
        </div>
      </DialogContent>
    </Dialog>
  );
}