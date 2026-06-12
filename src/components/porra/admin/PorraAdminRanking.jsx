import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trophy, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";

// Vista de ranking en vivo para el admin: lee directamente los participantes
// ya cargados en el panel y los ordena por puntos. Sin llamadas extra.
export default function PorraAdminRanking({ participantes = [] }) {
  const [busqueda, setBusqueda] = useState("");

  const ranking = useMemo(() => {
    const pagados = participantes.filter(p => p.estado_pago === 'pagado');
    const ordenados = [...pagados].sort((a, b) => {
      const pa = a.puntos_total || 0;
      const pb = b.puntos_total || 0;
      if (pb !== pa) return pb - pa;
      // Desempate básico por fecha de pago (antes = mejor)
      const fa = a.fecha_pago ? new Date(a.fecha_pago).getTime() : Infinity;
      const fb = b.fecha_pago ? new Date(b.fecha_pago).getTime() : Infinity;
      return fa - fb;
    });
    return ordenados.map((p, idx) => ({ ...p, _pos: idx + 1 }));
  }, [participantes]);

  const filtrado = useMemo(() => {
    if (!busqueda.trim()) return ranking;
    const q = busqueda.toLowerCase();
    return ranking.filter(p =>
      (p.alias_equipo || '').toLowerCase().includes(q) ||
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  }, [ranking, busqueda]);

  const renderMovimiento = (p) => {
    const ant = p.posicion_anterior;
    const act = p._pos;
    if (!ant || ant === act) return <Minus className="w-3 h-3 text-slate-400" />;
    if (ant > act) {
      return (
        <span className="flex items-center gap-0.5 text-green-600 text-xs font-bold">
          <TrendingUp className="w-3 h-3" /> {ant - act}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-0.5 text-red-600 text-xs font-bold">
        <TrendingDown className="w-3 h-3" /> {act - ant}
      </span>
    );
  };

  const medallaPos = (pos) => {
    if (pos === 1) return "🥇";
    if (pos === 2) return "🥈";
    if (pos === 3) return "🥉";
    return `#${pos}`;
  };

  return (
    <Card className="bg-white shadow">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ranking en vivo ({ranking.length} pagados)
          </CardTitle>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar alias, nombre o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtrado.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {ranking.length === 0
              ? 'Aún no hay participantes pagados con puntos.'
              : 'Sin resultados para esa búsqueda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500 text-xs uppercase">
                  <th className="py-2 pr-2 w-14">Pos</th>
                  <th className="py-2 pr-2 w-10">Mov</th>
                  <th className="py-2 pr-2">Alias / Nombre</th>
                  <th className="py-2 pr-2 text-center">Grupos</th>
                  <th className="py-2 pr-2 text-center">3eros</th>
                  <th className="py-2 pr-2 text-center">Bracket</th>
                  <th className="py-2 pr-2 text-center">3.º P</th>
                  <th className="py-2 pr-2 text-center">Camp</th>
                  <th className="py-2 pr-2 text-center">Esp</th>
                  <th className="py-2 pr-2 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.slice(0, 200).map((p) => (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 pr-2 font-bold text-slate-700">
                      {medallaPos(p._pos)}
                    </td>
                    <td className="py-2 pr-2">{renderMovimiento(p)}</td>
                    <td className="py-2 pr-2">
                      <div className="font-semibold text-slate-900 truncate max-w-[220px]">
                        {p.alias_equipo || '—'}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[220px]">
                        {p.nombre}
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-center text-slate-600">{p.puntos_grupos || 0}</td>
                    <td className="py-2 pr-2 text-center text-slate-600">{p.puntos_terceros || 0}</td>
                    <td className="py-2 pr-2 text-center text-slate-600">{p.puntos_eliminatorias || 0}</td>
                    <td className="py-2 pr-2 text-center text-slate-600">{p.puntos_tercer_puesto || 0}</td>
                    <td className="py-2 pr-2 text-center text-slate-600">{p.puntos_campeon || 0}</td>
                    <td className="py-2 pr-2 text-center text-slate-600">{p.puntos_especiales || 0}</td>
                    <td className="py-2 pr-2 text-right">
                      <Badge className="bg-orange-100 text-orange-800 font-black text-base">
                        {p.puntos_total || 0}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrado.length > 200 && (
              <p className="text-xs text-slate-500 text-center mt-3">
                Mostrando los primeros 200 de {filtrado.length}. Filtra para ver más.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}