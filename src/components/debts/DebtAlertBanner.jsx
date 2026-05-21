import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Banner reutilizable que detecta deudas pendientes y obliga a aceptar
 * que se sumarán a la primera cuota.
 *
 * Props:
 *  - email: email a comprobar (opcional, por defecto el del usuario logueado)
 *  - dniJugador: DNI del jugador (opcional)
 *  - dniTutor: DNI del tutor (opcional)
 *  - onDebtDetected: callback({ total, deudas, accepted }) — se llama cuando cambia el estado
 *  - requireAcceptance: si true muestra checkbox obligatorio (default true)
 */
export default function DebtAlertBanner({ email, dniJugador, dniTutor, onDebtDetected, requireAcceptance = true }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!email && !dniJugador && !dniTutor) return;
      setLoading(true);
      try {
        const res = await base44.functions.invoke("checkPendingDebts", { email, dni_jugador: dniJugador, dni_tutor: dniTutor });
        if (cancelled) return;
        setData(res.data);
      } catch (e) {
        console.error("Error checkPendingDebts:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [email, dniJugador, dniTutor]);

  useEffect(() => {
    if (!data) return;
    onDebtDetected?.({ total: data.total, deudas: data.deudas, accepted: requireAcceptance ? accepted : true, has_debt: data.has_debt });
  }, [data, accepted, requireAcceptance]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 p-3">
        <Loader2 className="w-4 h-4 animate-spin" /> Comprobando deudas pendientes...
      </div>
    );
  }

  if (!data || !data.has_debt) return null;

  return (
    <Card className="border-2 border-red-400 bg-red-50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-bold text-red-900 text-lg">⚠️ Deuda pendiente de temporadas anteriores</h3>
              <p className="text-sm text-red-800 mt-1">
                Tenemos registrada una deuda pendiente asociada a esta familia. Hasta que no se salde,
                el jugador <strong>no podrá ser convocado a partidos ni participar en entrenamientos oficiales</strong>.
              </p>
            </div>

            <div className="bg-white rounded-lg p-3 border border-red-200">
              <p className="text-xs font-semibold text-red-900 mb-2">DETALLE DE LA DEUDA:</p>
              <ul className="space-y-1.5">
                {data.deudas.map(d => (
                  <li key={d.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">
                      <strong>{d.concepto}</strong>
                      <span className="text-slate-500"> · Temp. {d.temporada_origen}</span>
                      {d.jugador_nombre && <span className="text-slate-500"> · {d.jugador_nombre}</span>}
                    </span>
                    <span className="font-bold text-red-700">{Number(d.importe).toFixed(2)} €</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-red-200 flex justify-between">
                <span className="font-bold text-red-900">TOTAL A AÑADIR A LA PRIMERA CUOTA:</span>
                <span className="font-bold text-red-700 text-lg">+ {Number(data.total).toFixed(2)} €</span>
              </div>
            </div>

            {requireAcceptance && (
              <label className="flex items-start gap-2 cursor-pointer p-2 bg-white rounded border border-red-200">
                <Checkbox checked={accepted} onCheckedChange={setAccepted} className="mt-0.5" />
                <span className="text-sm text-slate-800">
                  <strong>Acepto</strong> que la deuda de <strong>{Number(data.total).toFixed(2)} €</strong> se sume a la primera cuota
                  de la nueva temporada y entiendo que mi hijo/a (o yo, si soy jugador adulto) no podrá jugar
                  oficialmente hasta abonar la cuota completa.
                </span>
              </label>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}