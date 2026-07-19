import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Mail, Lock, CheckCircle, Loader2, Send, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";

// Pestaña de cierre de la porra: muestra podio, reparto del bote y permite
// enviar email a ganadores + marcar porra como finalizada.
export default function PorraAdminCierre({ config, participantes, onUpdate }) {
  const [enviando, setEnviando] = useState(false);
  const [enviandoTest, setEnviandoTest] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const pagados = useMemo(
    () => participantes.filter(p => p.estado_pago === 'pagado'),
    [participantes]
  );

  // Orden por posición del ranking (ya trae los desempates resueltos). Si algún
  // participante no tuviera posición, cae al final ordenado por puntos.
  const top3 = useMemo(
    () => [...pagados].sort((a, b) => {
      const pa = a.posicion_ranking || 9999;
      const pb = b.posicion_ranking || 9999;
      if (pa !== pb) return pa - pb;
      return (b.puntos_total || 0) - (a.puntos_total || 0);
    }).slice(0, 3),
    [pagados]
  );

  // Construye el enlace de WhatsApp con un mensaje personalizado para cada ganador.
  const whatsappLink = (p, premio) => {
    const tel = (p.telefono || '').replace(/\D/g, '');
    if (!tel) return null;
    const telInternacional = tel.startsWith('34') ? tel : `34${tel}`;
    const msg = `¡Hola ${p.nombre}! 🎉 Has quedado ${premio.pos}º (${premio.label}) en la ${config?.nombre_torneo || 'Porra'} con ${p.puntos_total || 0} puntos. Tu premio es de ${premio.importe.toFixed(2)}€. Escríbenos para coordinar el pago. ¡Enhorabuena! — CD Bustarviejo`;
    return `https://wa.me/${telInternacional}?text=${encodeURIComponent(msg)}`;
  };

  const recaudado = pagados.length * (config?.precio_entrada || 15);
  const comision = recaudado * (config?.comision_club_porcentaje || 10) / 100;
  const bote = recaudado - comision;
  const reparto = config?.reparto_premios || { primero_porcentaje: 60, segundo_porcentaje: 25, tercero_porcentaje: 15 };

  // Importes de premio FIJOS acordados para este cierre.
  const premios = [
    { pos: 1, emoji: '🥇', color: 'from-yellow-400 to-yellow-600', label: 'Campeón', importe: 839.40 },
    { pos: 2, emoji: '🥈', color: 'from-slate-300 to-slate-500', label: 'Subcampeón', importe: 349.75 },
    { pos: 3, emoji: '🥉', color: 'from-orange-400 to-orange-600', label: 'Tercer puesto', importe: 209.85 },
  ];

  const podioListo = top3.length >= 3 && config?.campeon_real;
  const yaFinalizada = config?.estado === 'finalizada';

  const enviarEmails = async (test = false) => {
    if (!podioListo) return toast.error('Falta definir el campeón en Resultados');
    const setter = test ? setEnviandoTest : setEnviando;
    setter(true);
    try {
      const res = await base44.functions.invoke('porraNotificarGanadores', { test });
      if (res.data?.success) {
        toast.success(test ? '✅ Test enviado a tu email' : `📧 Emails enviados a ${res.data.enviados.length} ganadores`);
      } else {
        toast.error(res.data?.error || 'Error');
      }
    } catch (e) {
      toast.error('Error enviando emails');
    } finally {
      setter(false);
    }
  };

  const finalizarPorra = async () => {
    if (!confirm('¿Marcar la porra como FINALIZADA? Esta acción cierra oficialmente el torneo.')) return;
    setFinalizando(true);
    try {
      await base44.entities.PorraConfig.update(config.id, { estado: 'finalizada' });
      toast.success('🏁 Porra marcada como finalizada');
      onUpdate?.();
    } catch (e) {
      toast.error('Error al finalizar');
    } finally {
      setFinalizando(false);
    }
  };

  if (!podioListo) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="font-bold text-lg">Aún no hay podio definitivo</h3>
          <p className="text-slate-600 mt-2">
            Para cerrar la porra primero define el <strong>Campeón, Subcampeón y 3er puesto</strong> reales en la pestaña <strong>🏆 Resultados</strong> y pulsa "Recalcular puntos".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Podio visual */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6" /> 🏆 Podio Final de la Porra
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-4">
            {top3.map((p, idx) => {
              const premio = premios[idx];
              return (
                <div key={p.id} className={`rounded-xl p-5 bg-gradient-to-br ${premio.color} text-white shadow-lg`}>
                  <div className="text-5xl text-center">{premio.emoji}</div>
                  <div className="text-center text-xs font-bold uppercase mt-1 opacity-90">{premio.label}</div>
                  <div className="text-center font-black text-lg mt-2 truncate" title={p.alias_equipo}>{p.alias_equipo}</div>
                  <div className="text-center text-sm opacity-90 truncate">{p.nombre}</div>
                  <div className="text-center text-xs opacity-80 mt-1">{p.puntos_total || 0} pts</div>
                  <div className="bg-white/20 rounded-lg mt-3 p-3 text-center">
                    <div className="text-xs opacity-90 uppercase font-bold">Premio</div>
                    <div className="text-2xl font-black">{premio.importe.toFixed(2)}€</div>
                  </div>
                  <div className="text-xs mt-3 space-y-1 opacity-90">
                    <div className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" /> {p.email}</div>
                    {p.telefono && (
                      <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.telefono}</div>
                    )}
                  </div>
                  {whatsappLink(p, premio) ? (
                    <a href={whatsappLink(p, premio)} target="_blank" rel="noopener noreferrer" className="block mt-3">
                      <div className="bg-green-600 hover:bg-green-700 transition-colors rounded-lg py-2 px-3 flex items-center justify-center gap-2 text-sm font-bold">
                        <MessageCircle className="w-4 h-4" /> Avisar por WhatsApp
                      </div>
                    </a>
                  ) : (
                    <div className="mt-3 text-center text-xs bg-white/20 rounded-lg py-2">Sin teléfono para WhatsApp</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reparto del bote */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💰 Reparto del bote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase font-bold">Recaudado</div>
              <div className="text-xl font-black">{recaudado.toFixed(0)}€</div>
              <div className="text-xs text-slate-500">{pagados.length} x {config?.precio_entrada || 15}€</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-xs text-orange-700 uppercase font-bold">Para el club</div>
              <div className="text-xl font-black text-orange-700">{comision.toFixed(0)}€</div>
              <div className="text-xs text-orange-600">{config?.comision_club_porcentaje || 10}%</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-xs text-purple-700 uppercase font-bold">Bote premios</div>
              <div className="text-xl font-black text-purple-700">{bote.toFixed(0)}€</div>
              <div className="text-xs text-purple-600">{reparto.primero_porcentaje}/{reparto.segundo_porcentaje}/{reparto.tercero_porcentaje}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-green-700 uppercase font-bold">Total a pagar</div>
              <div className="text-xl font-black text-green-700">{premios.reduce((s, p) => s + p.importe, 0).toFixed(0)}€</div>
              <div className="text-xs text-green-600">A 3 ganadores</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📨 Notificar a los ganadores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Envía un email automático a los 3 ganadores con su posición, premio en € y datos para coordinar el pago.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => enviarEmails(true)} disabled={enviandoTest} variant="outline">
              {enviandoTest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Enviar test a mi email
            </Button>
            <Button onClick={() => enviarEmails(false)} disabled={enviando} className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
              {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              📧 Enviar emails a los 3 ganadores
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cerrar porra */}
      <Card className={yaFinalizada ? "border-green-300 bg-green-50" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {yaFinalizada ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Lock className="w-5 h-5" />}
            🏁 Cerrar la porra oficialmente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {yaFinalizada ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600">FINALIZADA</Badge>
              <span className="text-sm text-green-700">La porra ya está marcada como finalizada.</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-3">
                Marca la porra como <strong>finalizada</strong>. El ranking se mantiene visible pero el torneo queda cerrado oficialmente.
              </p>
              <Button onClick={finalizarPorra} disabled={finalizando} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                {finalizando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Marcar como finalizada
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}