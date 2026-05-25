import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Shirt, Info } from "lucide-react";

/**
 * Banner para la página de Tienda.
 * - Si la familia/jugador ya tiene dorsales asignados, los muestra para que sepan
 *   qué dorsal personalizar en la equipación.
 * - Si no, muestra un aviso de que el club les avisará cuando lo asigne.
 */
export default function MyDorsalsBanner() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("getMyDorsals", {});
        if (cancelled) return;
        const data = res?.data || {};
        setAssignments(data.assignments || []);
      } catch (e) {
        console.error("[MyDorsalsBanner] error:", e);
        if (!cancelled) setAssignments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;

  // Caso 1: TIENE dorsales asignados
  if (assignments.length > 0) {
    return (
      <Card className="border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-green-900 text-base">
                ✅ {assignments.length === 1 ? "Tu dorsal ya está asignado" : "Dorsales asignados"}
              </h3>
              <p className="text-sm text-green-800">
                Personaliza la equipación con <strong>este dorsal</strong> y el <strong>nombre de pila</strong> del jugador/a:
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {assignments.map((a, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 bg-white border-2 border-green-300 rounded-xl p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 truncate">{a.jugador_nombre}</div>
                  <div className="text-xs text-slate-500 truncate">{a.categoria} · {a.temporada}</div>
                </div>
                <div className="flex-shrink-0 text-center">
                  <div className="text-[10px] uppercase font-semibold text-green-700">Dorsal</div>
                  <div className="text-3xl font-black text-green-700 leading-none">#{a.dorsal}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Importante:</strong> el dorsal lo asigna el club (el que ves arriba) y el <strong>nombre</strong> lo eliges tú al hacer el pedido — normalmente el <strong>nombre de pila</strong> del jugador/a. La equipación se fabrica personalizada y no admite cambios.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Caso 2: NO tiene dorsales asignados aún
  return (
    <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Shirt className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 text-base mb-1">
              ⏳ Espera a saber tu dorsal antes de personalizar
            </h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              El club te avisará por <strong>email y WhatsApp</strong> en cuanto tengas tu dorsal asignado para la próxima temporada. Personaliza la equipación solo cuando recibas la notificación con el número.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}