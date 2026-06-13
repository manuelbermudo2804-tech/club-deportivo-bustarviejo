import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Search, Download, Phone, Mail, Clock, MessageCircle } from "lucide-react";

// URL base pública de la app
const APP_BASE = 'https://app.cdbustarviejo.com';

// Construye el mensaje de WhatsApp para un participante pendiente (mismo texto que el panel de avisos)
const construirMensajeWhatsApp = (p) => {
  const nombre = (p.nombre || '').split(' ')[0] || 'crack';
  return `¡Hola ${nombre}! 👋

Perdona las molestias 🙏 Hemos actualizado tu porra del Mundial 2026 con los cruces oficiales de FIFA (octavos → final).

🔒 La fase de grupos, mejores terceros y predicciones especiales *ya están bloqueadas* (el Mundial ha empezado).

⚠️ Lo único que aún puedes ajustar es el *bracket de eliminatorias*, y tienes hasta el *domingo 28 de junio a las 18:00h* (luego se cierra para todo el mundo).

🔗 "${p.alias_equipo}": ${APP_BASE}/PorraMiPorra?token=${p.token_acceso}

👉 Entra en el enlace, repasa las eliminatorias y pulsa *"Confirmar y cerrar bracket"*. Si no lo haces antes del 28/06 a las 18:00, tu porra se quedará con las predicciones que tengas en ese momento.

¡Gracias por tu paciencia y mucha suerte! 🏆⚽

— CD Bustarviejo`;
};

const abrirWhatsApp = (p) => {
  const tel = String(p.telefono || '').replace(/[^\d]/g, '');
  const mensaje = encodeURIComponent(construirMensajeWhatsApp(p));
  window.open(`https://wa.me/${tel}?text=${mensaje}`, '_blank');
};

/**
 * Panel admin: lista completa con el estado de re-edición del bracket
 * de cada participante PAGADO. Permite ver de un vistazo quién ya
 * confirmó el bracket actualizado FIFA 2026 y quién falta.
 */
export default function PorraAdminEstadoBracket({ participantes }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos'); // todos | reeditados | pendientes

  const pagados = useMemo(
    () => participantes.filter(p => p.estado_pago === 'pagado'),
    [participantes]
  );

  const reeditados = pagados.filter(p => p.bracket_reeditado);
  const pendientes = pagados.filter(p => !p.bracket_reeditado);

  const lista = useMemo(() => {
    let base = pagados;
    if (filtro === 'reeditados') base = reeditados;
    if (filtro === 'pendientes') base = pendientes;

    if (busqueda) {
      const q = busqueda.toLowerCase();
      base = base.filter(p =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.alias_equipo || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.telefono || '').includes(q)
      );
    }

    return [...base].sort((a, b) => {
      // Pendientes primero (los reeditados al final)
      if (a.bracket_reeditado !== b.bracket_reeditado) {
        return a.bracket_reeditado ? 1 : -1;
      }
      return (a.alias_equipo || '').localeCompare(b.alias_equipo || '');
    });
  }, [pagados, reeditados, pendientes, filtro, busqueda]);

  const formatearFecha = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

  const exportarCSV = () => {
    const filas = [
      ['Alias', 'Nombre', 'Email', 'Telefono', 'Estado bracket', 'Fecha re-edicion'],
      ...lista.map(p => [
        p.alias_equipo || '',
        p.nombre || '',
        p.email || '',
        p.telefono || '',
        p.bracket_reeditado ? 'RE-EDITADO' : 'PENDIENTE',
        formatearFecha(p.fecha_bracket_reeditado),
      ]),
    ];
    const csv = filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estado_bracket_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pct = pagados.length > 0 ? Math.round((reeditados.length / pagados.length) * 100) : 0;

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <CheckCircle2 className="w-5 h-5" />
          Estado de re-edición del bracket (FIFA 2026)
        </CardTitle>
        <p className="text-sm text-blue-800 mt-1">
          Lista de todos los participantes pagados con su estado de confirmación
          del bracket actualizado al formato oficial FIFA 2026.
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Stats globales */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-slate-900">{pagados.length}</div>
            <div className="text-xs text-slate-500">Pagados totales</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-green-700">{reeditados.length}</div>
            <div className="text-xs text-green-600">Re-editados ✅</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-red-600">{pendientes.length}</div>
            <div className="text-xs text-red-500">Pendientes ❌</div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div>
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Progreso re-edición</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={filtro === 'todos' ? 'default' : 'outline'}
            onClick={() => setFiltro('todos')}
          >
            Todos ({pagados.length})
          </Button>
          <Button
            size="sm"
            variant={filtro === 'pendientes' ? 'default' : 'outline'}
            onClick={() => setFiltro('pendientes')}
            className={filtro === 'pendientes' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            Pendientes ({pendientes.length})
          </Button>
          <Button
            size="sm"
            variant={filtro === 'reeditados' ? 'default' : 'outline'}
            onClick={() => setFiltro('reeditados')}
            className={filtro === 'reeditados' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            Re-editados ({reeditados.length})
          </Button>
          <Button size="sm" variant="outline" onClick={exportarCSV} className="ml-auto">
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por alias, nombre, email o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista */}
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {lista.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">No hay resultados</p>
          ) : lista.map(p => (
            <div
              key={p.id}
              className={`rounded-lg border-2 p-3 ${
                p.bracket_reeditado
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.bracket_reeditado ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <p className="font-bold text-slate-900 truncate">{p.alias_equipo}</p>
                    <Badge className={p.bracket_reeditado ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}>
                      {p.bracket_reeditado ? 'Re-editado' : 'Pendiente'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-700 mt-0.5">{p.nombre}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-1">
                    {p.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {p.email}
                      </span>
                    )}
                    {p.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {p.telefono}
                      </span>
                    )}
                    {p.bracket_reeditado && p.fecha_bracket_reeditado && (
                      <span className="flex items-center gap-1 text-green-700 font-semibold">
                        <Clock className="w-3 h-3" /> {formatearFecha(p.fecha_bracket_reeditado)}
                      </span>
                    )}
                  </div>
                </div>
                {!p.bracket_reeditado && p.telefono && p.token_acceso && (
                  <Button
                    size="sm"
                    onClick={() => abrirWhatsApp(p)}
                    className="bg-green-600 hover:bg-green-700 flex-shrink-0"
                    title="Enviar recordatorio por WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}