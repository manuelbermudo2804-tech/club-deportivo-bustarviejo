import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Copy, Download, ExternalLink, Smartphone, Globe, Users } from "lucide-react";
import { toast } from "sonner";

// Devuelve el origen del participante: 'app' | 'web' | 'desconocido'.
// 1) si tiene el campo 'origen' guardado → usar ese (los nuevos lo traen)
// 2) si no, inferir del user_agent (los participantes antiguos):
//    - 'wv' (Android WebView), 'CDBustarviejo' o flags PWA → app
//    - resto → web
function detectarOrigen(p) {
  if (p.origen === 'app' || p.origen === 'web') return p.origen;
  const ua = (p.user_agent || '').toLowerCase();
  if (!ua) return 'desconocido';
  if (ua.includes('cdbustarviejo') || ua.includes('; wv)') || ua.includes('webview') || ua.includes('standalone')) {
    return 'app';
  }
  return 'web';
}

// Lista administrativa de participantes con búsqueda, exportación y enlaces directos
export default function PorraAdminParticipantes({ participantes = [] }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos | pagado | pendiente | multiples

  // Contar cuántas porras tiene cada email
  const porrasPorEmail = useMemo(() => {
    const conteo = {};
    participantes.forEach(p => {
      const email = (p.email || '').trim().toLowerCase();
      if (!email) return;
      conteo[email] = (conteo[email] || 0) + 1;
    });
    return conteo;
  }, [participantes]);

  // Emails con más de una porra
  const emailsConVarias = useMemo(() => {
    return new Set(Object.keys(porrasPorEmail).filter(e => porrasPorEmail[e] > 1));
  }, [porrasPorEmail]);

  // Nº de usuarios distintos que han hecho más de una porra
  const usuariosConVarias = emailsConVarias.size;
  // Nº total de porras que pertenecen a esos usuarios
  const porrasDeUsuariosConVarias = useMemo(() => {
    return participantes.filter(p => {
      const email = (p.email || '').trim().toLowerCase();
      return email && emailsConVarias.has(email);
    }).length;
  }, [participantes, emailsConVarias]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return participantes
      .filter(p => {
        if (filtroEstado === 'multiples') {
          const email = (p.email || '').trim().toLowerCase();
          if (!email || !emailsConVarias.has(email)) return false;
        } else if (filtroEstado !== 'todos' && p.estado_pago !== filtroEstado) {
          return false;
        }
        if (!q) return true;
        return (
          (p.nombre || '').toLowerCase().includes(q) ||
          (p.alias_equipo || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.telefono || '').includes(q)
        );
      })
      .sort((a, b) => {
        // Si filtramos por múltiples, agrupar por email para verlos juntos
        if (filtroEstado === 'multiples') {
          const ea = (a.email || '').toLowerCase();
          const eb = (b.email || '').toLowerCase();
          if (ea !== eb) return ea.localeCompare(eb);
          return new Date(a.created_date || 0) - new Date(b.created_date || 0);
        }
        return (b.puntos_total || 0) - (a.puntos_total || 0);
      });
  }, [participantes, busqueda, filtroEstado, emailsConVarias]);

  const pagados = participantes.filter(p => p.estado_pago === 'pagado');
  const totalRecaudado = pagados.reduce((s, p) => s + (p.cantidad_pagada || 0), 0);

  // KPIs de origen (sobre pagados, que es lo que importa para saber por dónde entran de verdad)
  const origenStats = useMemo(() => {
    const stats = { app: 0, web: 0, desconocido: 0 };
    pagados.forEach(p => { stats[detectarOrigen(p)]++; });
    return stats;
  }, [pagados]);

  const copiarEnlace = (token) => {
    if (!token) return toast.error('Sin token');
    const url = `${window.location.origin}/PorraMiPorra?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace mágico copiado');
  };

  const exportarCSV = () => {
    const cabecera = ['Nombre', 'Alias', 'Email', 'Teléfono', 'Estado', 'Pagado (€)', 'Puntos', '% Completado', 'Ligas', 'Origen', 'Fecha registro'];
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
      detectarOrigen(p),
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
            {pagados.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <span className="text-slate-500">De los pagados:</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Smartphone className="w-3 h-3 mr-1" /> App: <strong className="ml-1">{origenStats.app}</strong>
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Globe className="w-3 h-3 mr-1" /> Web: <strong className="ml-1">{origenStats.web}</strong>
                </Badge>
                {origenStats.desconocido > 0 && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                    ? Desconocido: <strong className="ml-1">{origenStats.desconocido}</strong>
                  </Badge>
                )}
              </div>
            )}
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
            <Button
              size="sm"
              variant={filtroEstado === 'multiples' ? 'default' : 'outline'}
              onClick={() => setFiltroEstado('multiples')}
              className={filtroEstado === 'multiples' ? 'bg-purple-600 hover:bg-purple-700' : usuariosConVarias > 0 ? 'border-purple-400 text-purple-700 hover:bg-purple-50' : ''}
              disabled={usuariosConVarias === 0}
              title={usuariosConVarias === 0 ? 'Nadie ha hecho más de una porra' : `${usuariosConVarias} usuarios con varias porras (${porrasDeUsuariosConVarias} porras en total)`}
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              Con varias porras {usuariosConVarias > 0 && `(${usuariosConVarias})`}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filtroEstado === 'multiples' && usuariosConVarias > 0 && (
          <div className="mb-4 p-3 bg-purple-50 border-2 border-purple-300 rounded-lg flex items-start gap-3">
            <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-purple-900">👥 Usuarios con varias porras</p>
              <p className="text-purple-700 mt-1">
                <strong>{usuariosConVarias}</strong> {usuariosConVarias === 1 ? 'usuario ha creado' : 'usuarios han creado'} más de una porra, sumando <strong>{porrasDeUsuariosConVarias}</strong> porras en total. Están agrupadas por email y ordenadas por fecha de creación.
              </p>
            </div>
          </div>
        )}
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
                  <th className="text-center p-2 hidden md:table-cell">Origen</th>
                  <th className="text-center p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const emailLc = (p.email || '').trim().toLowerCase();
                  const numPorras = emailLc ? (porrasPorEmail[emailLc] || 1) : 1;
                  const tieneVarias = numPorras > 1;
                  return (
                  <tr key={p.id} className={`border-b hover:bg-slate-50 ${tieneVarias ? 'bg-purple-50/40' : ''}`}>
                    <td className="p-2 font-medium">
                      {p.nombre}
                      {p.bloqueada && <Badge variant="outline" className="ml-1 text-[9px] bg-red-50 text-red-700">🔒</Badge>}
                    </td>
                    <td className="p-2 font-bold text-orange-700">{p.alias_equipo}</td>
                    <td className="p-2 hidden md:table-cell text-xs">
                      <span className="text-slate-600">{p.email}</span>
                      {tieneVarias && (
                        <Badge variant="outline" className="ml-1 text-[9px] bg-purple-100 text-purple-700 border-purple-300" title={`Este email tiene ${numPorras} porras`}>
                          ×{numPorras}
                        </Badge>
                      )}
                    </td>
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
                    <td className="p-2 text-center hidden md:table-cell">
                      {(() => {
                        const o = detectarOrigen(p);
                        if (o === 'app') return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"><Smartphone className="w-3 h-3 mr-1" /> App</Badge>;
                        if (o === 'web') return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"><Globe className="w-3 h-3 mr-1" /> Web</Badge>;
                        return <span className="text-slate-400 text-xs">?</span>;
                      })()}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}