import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, AlertCircle, Search, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

// URL base pública de la app
const APP_BASE = 'https://app.cdbustarviejo.com';

/**
 * Panel admin: envía un WhatsApp a cada participante pagado con los enlaces a
 * sus porras (acumula todas las que tenga si comparte teléfono) para que
 * revise el bracket actualizado al formato oficial FIFA 2026 antes del 28/06.
 *
 * - Filtra solo participantes con estado_pago === 'pagado' Y teléfono.
 * - Agrupa por teléfono normalizado (varias porras = un solo WhatsApp).
 * - Excluye automáticamente los que ya hayan re-editado el bracket.
 */
export default function PorraAdminAvisoBracket({ participantes }) {
  const [busqueda, setBusqueda] = useState('');
  const [enviadosLocal, setEnviadosLocal] = useState(new Set());

  // Normaliza teléfono: solo dígitos, añade +34 si es número español de 9 dígitos
  const normalizarTelefono = (tel) => {
    if (!tel) return null;
    let limpio = String(tel).replace(/[^\d+]/g, '');
    if (limpio.startsWith('+')) {
      limpio = '+' + limpio.slice(1).replace(/\D/g, '');
    } else {
      limpio = limpio.replace(/\D/g, '');
      if (limpio.length === 9) limpio = '+34' + limpio;
      else if (limpio.length === 11 && limpio.startsWith('34')) limpio = '+' + limpio;
      else if (!limpio.startsWith('+')) limpio = '+' + limpio;
    }
    return limpio;
  };

  // Agrupar por teléfono normalizado
  const grupos = useMemo(() => {
    const map = new Map();
    participantes.forEach(p => {
      if (p.estado_pago !== 'pagado') return;
      if (p.bracket_reeditado) return; // ya re-editó, no molestar
      const tel = normalizarTelefono(p.telefono);
      if (!tel) return;
      if (!map.has(tel)) {
        map.set(tel, { telefono: tel, nombre: p.nombre, porras: [] });
      }
      map.get(tel).porras.push({
        id: p.id,
        alias: p.alias_equipo,
        token: p.token_acceso,
        nombre: p.nombre,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [participantes]);

  // Estadísticas
  const totalPagados = participantes.filter(p => p.estado_pago === 'pagado').length;
  const yaReeditaron = participantes.filter(p => p.estado_pago === 'pagado' && p.bracket_reeditado).length;
  const sinTelefono = participantes.filter(p => p.estado_pago === 'pagado' && !p.bracket_reeditado && !normalizarTelefono(p.telefono)).length;

  const filtrados = grupos.filter(g => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return g.nombre.toLowerCase().includes(q) ||
      g.telefono.includes(q) ||
      g.porras.some(p => p.alias.toLowerCase().includes(q));
  });

  // Construye el mensaje WhatsApp para un grupo
  const construirMensaje = (grupo) => {
    const linksPorras = grupo.porras
      .map(p => `🔗 "${p.alias}": ${APP_BASE}/PorraMiPorra?token=${p.token}`)
      .join('\n');

    const intro = grupo.porras.length === 1
      ? `Hemos actualizado tu porra del Mundial 2026 con los cruces oficiales de FIFA (octavos → final).`
      : `Hemos actualizado tus ${grupo.porras.length} porras del Mundial 2026 con los cruces oficiales de FIFA (octavos → final).`;

    return `¡Hola ${grupo.nombre.split(' ')[0]}! 👋

${intro}

🔒 La fase de grupos, mejores terceros y predicciones especiales *ya están bloqueadas* (el Mundial ha empezado).

⚠️ Lo único que aún puedes ajustar es el *bracket de eliminatorias*, y tienes hasta el *domingo 28 de junio a las 18:00h* (luego se cierra para todo el mundo).

${linksPorras}

📲 *IMPORTANTE:* Antes de entrar, *cierra la app y vuelve a abrirla* (o refresca el navegador con el icono 🔄) para asegurarte de ver la versión actualizada. Si no, puede que veas los cruces antiguos.

Luego entra, repasa las eliminatorias y pulsa *"Confirmar y cerrar bracket"*. Si no lo haces antes del 28/06 a las 18:00, tu porra se quedará con las predicciones que tengas en ese momento.

¡Mucha suerte! 🏆⚽

— CD Bustarviejo`;
  };

  const abrirWhatsApp = (grupo) => {
    const mensaje = encodeURIComponent(construirMensaje(grupo));
    const tel = grupo.telefono.replace(/[^\d]/g, '');
    const url = `https://wa.me/${tel}?text=${mensaje}`;
    window.open(url, '_blank');
    // Marcar como enviado localmente
    setEnviadosLocal(prev => new Set([...prev, grupo.telefono]));
  };

  const copiarMensaje = (grupo) => {
    navigator.clipboard.writeText(construirMensaje(grupo));
    toast.success('Mensaje copiado al portapapeles');
  };

  const abrirTodosSinEnviar = () => {
    const pendientes = filtrados.filter(g => !enviadosLocal.has(g.telefono));
    if (pendientes.length === 0) {
      toast.info('No quedan pendientes');
      return;
    }
    if (pendientes.length > 10) {
      if (!confirm(`¿Abrir ${pendientes.length} ventanas de WhatsApp? El navegador puede bloquear algunas.`)) return;
    }
    pendientes.forEach((g, i) => {
      setTimeout(() => abrirWhatsApp(g), i * 600);
    });
  };

  return (
    <Card className="border-2 border-amber-200">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <MessageCircle className="w-5 h-5" />
          Avisar a participantes — Re-edición del bracket
        </CardTitle>
        <p className="text-sm text-amber-800 mt-1">
          Envía un WhatsApp a cada participante pagado con los enlaces a sus porras
          para que revisen el bracket actualizado al formato FIFA 2026 antes del 28/06.
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-slate-900">{totalPagados}</div>
            <div className="text-xs text-slate-500">Pagados totales</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-green-700">{yaReeditaron}</div>
            <div className="text-xs text-green-600">Ya re-editaron ✅</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-amber-700">{grupos.length}</div>
            <div className="text-xs text-amber-600">A avisar (con tel.)</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-red-600">{sinTelefono}</div>
            <div className="text-xs text-red-500">Sin teléfono ⚠️</div>
          </div>
        </div>

        {sinTelefono > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">
              Hay <strong>{sinTelefono}</strong> participantes pagados pendientes de re-editar
              que NO tienen teléfono guardado. Deberás avisarles por email u otro canal.
            </p>
          </div>
        )}

        {/* Buscador + botón masivo */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, teléfono o alias..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            onClick={abrirTodosSinEnviar}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={filtrados.length === 0}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Abrir todos ({filtrados.filter(g => !enviadosLocal.has(g.telefono)).length})
          </Button>
        </div>

        {/* Lista */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">
              No hay participantes para avisar 🎉
            </p>
          ) : filtrados.map(grupo => {
            const enviado = enviadosLocal.has(grupo.telefono);
            return (
              <div
                key={grupo.telefono}
                className={`rounded-lg border-2 p-3 transition-all ${
                  enviado ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 truncate">{grupo.nombre}</p>
                      {enviado && (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Enviado
                        </Badge>
                      )}
                      {grupo.porras.length > 1 && (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          {grupo.porras.length} porras
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {grupo.telefono}
                    </p>
                    <div className="mt-1.5 text-xs text-slate-600 space-y-0.5">
                      {grupo.porras.map(p => (
                        <p key={p.id} className="truncate">• {p.alias}</p>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copiarMensaje(grupo)}
                      title="Copiar mensaje"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => abrirWhatsApp(grupo)}
                      className={enviado ? 'bg-slate-500 hover:bg-slate-600' : 'bg-green-600 hover:bg-green-700'}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      {enviado ? 'Re-enviar' : 'WhatsApp'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}