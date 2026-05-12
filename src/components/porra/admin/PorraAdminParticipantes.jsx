import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Copy, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// Lista administrativa de participantes con búsqueda, exportación y enlaces directos
export default function PorraAdminParticipantes({ participantes = [] }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos | pagado | pendiente

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return participantes
      .filter(p => {
        if (filtroEstado !== 'todos' && p.estado_pago !== filtroEstado) return false;
        if (!q) return true;
        return (
          (p.nombre || '').toLowerCase().includes(q) ||
          (p.alias_equipo || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.telefono || '').includes(q)
        );
      })
      .sort((a, b) => (b.puntos_total || 0) - (a.puntos_total || 0));
  }, [participantes, busqueda, filtroEstado]);

  const pagados = participantes.filter(p => p.estado_pago === 'pagado');
  const totalRecaudado = pagados.reduce((s, p) => s + (p.cantidad_pagada || 0), 0);

  const copiarEnlace = (token) => {
    if (!token) return toast.error('Sin token');
    const url = `${window.location.origin}/PorraMiPorra?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace mágico copiado');
  };

  const exportarCSV = () => {
    const cabecera = ['Nombre', 'Alias', 'Email', 'Teléfono', 'Estado', 'Pagado (€)', 'Puntos', '% Completado', 'Ligas', 'Fecha registro'];
    const filas = filtrados.map(p => [
      p.nombre || '',
      p.alias_equipo || '',
      p.email || '',
      p.telefono || '',
      p.estado_pago || '',
      p.cantidad_pagada || 0,
      p.puntos_total || 0,
      p.porcentaje_completado || 0,
      (p.mini_liga_codigos || []).join('|'),
      p.created_date ? new Date(p.created_date).toLocaleString('es-ES') : '',
    ]);
    const csv = [cabecera, ...filas]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes-porra-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtrados.length} participantes exportados`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle>👥 Participantes</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              {participantes.length} totales · <strong className="text-green-700">{pagados.length} pagados</strong> · <strong className="text-orange-600">{totalRecaudado}€</strong> recaudados
            </p>
          </div>
          <Button onClick={exportarCSV} variant="outline" size="sm" disabled={filtrados.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Exportar CSV ({filtrados.length})
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, alias, email, teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {[
              { v: 'todos', l: 'Todos' },
              { v: 'pagado', l: 'Pagados' },
              { v: 'pendiente', l: 'Pendientes' },
            ].map(f => (
              <Button
                key={f.v}
                size="sm"
                variant={filtroEstado === f.v ? 'default' : 'outline'}
                onClick={() => setFiltroEstado(f.v)}
              >
                {f.l}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filtrados.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">{participantes.length === 0 ? 'Aún no hay participantes' : 'Sin resultados con el filtro actual'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="text-left p-2">Nombre</th>
                  <th className="text-left p-2">Alias</th>
                  <th className="text-left p-2 hidden md:table-cell">Email</th>
                  <th className="text-left p-2 hidden lg:table-cell">Tel.</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-right p-2 hidden sm:table-cell">€</th>
                  <th className="text-right p-2">Pts</th>
                  <th className="text-right p-2 hidden md:table-cell">%</th>
                  <th className="text-center p-2 hidden lg:table-cell">Ligas</th>
                  <th className="text-center p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium">
                      {p.nombre}
                      {p.bloqueada && <Badge variant="outline" className="ml-1 text-[9px] bg-red-50 text-red-700">🔒</Badge>}
                    </td>
                    <td className="p-2 font-bold text-orange-700">{p.alias_equipo}</td>
                    <td className="p-2 text-slate-600 hidden md:table-cell text-xs">{p.email}</td>
                    <td className="p-2 text-slate-600 hidden lg:table-cell text-xs">{p.telefono || '-'}</td>
                    <td className="p-2">
                      <Badge
                        variant={p.estado_pago === 'pagado' ? 'default' : 'outline'}
                        className={p.estado_pago === 'pagado' ? 'bg-green-600' : p.estado_pago === 'pendiente' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                      >
                        {p.estado_pago}
                      </Badge>
                    </td>
                    <td className="p-2 text-right hidden sm:table-cell">{p.cantidad_pagada ? `${p.cantidad_pagada}€` : '-'}</td>
                    <td className="p-2 text-right font-black text-orange-600">{p.puntos_total || 0}</td>
                    <td className="p-2 text-right hidden md:table-cell">
                      <span className={`font-bold ${(p.porcentaje_completado || 0) === 100 ? 'text-green-600' : 'text-slate-500'}`}>
                        {p.porcentaje_completado || 0}%
                      </span>
                    </td>
                    <td className="p-2 text-center hidden lg:table-cell text-xs">
                      {(p.mini_liga_codigos || []).length || '-'}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => copiarEnlace(p.token_acceso)}
                          title="Copiar enlace mágico"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        {p.estado_pago === 'pagado' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => window.open(`/PorraMiPorra?token=${p.token_acceso}`, '_blank')}
                            title="Abrir porra en nueva pestaña"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}