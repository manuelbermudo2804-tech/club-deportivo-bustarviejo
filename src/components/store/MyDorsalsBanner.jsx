import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Shirt, Info } from "lucide-react";

export default function MyDorsalsBanner() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [onlyBasketball, setOnlyBasketball] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [res, players] = await Promise.all([
          base44.functions.invoke("getMyDorsals", {}),
          base44.entities.Player.list().catch(() => []),
        ]);
        if (cancelled) return;
        const data = res?.data || {};
        setAssignments(data.assignments || []);
        const activos = (players || []).filter(p => p.activo !== false);
        const isBasket = (p) => {
          const cats = [p.categoria_principal, p.deporte, ...(p.categorias || [])].filter(Boolean).join(" ").toLowerCase();
          return cats.includes("baloncesto");
        };
        if (activos.length > 0 && activos.every(isBasket)) setOnlyBasketball(true);
      } catch (e) {
        console.error("[MyDorsalsBanner] error:", e);
        if (!cancelled) setAssignments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || onlyBasketball) return null;

  if (assignments.length > 0) {
    return (
      <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Shirt className="w-5 h-5 text-orange-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-base">
                {assignments.length === 1 ? "Tu dorsal ya está asignado" : "Dorsales asignados"}
              </h3>
              <p className="text-sm text-slate-600">
                Personaliza la equipación con <strong>este dorsal</strong> y el <strong>nombre de pila</strong> del jugador/a:
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {assignments.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 truncate">{a.jugador_nombre}</div>
                  <div className="text-xs text-slate-500 truncate">{a.categoria} · {a.temporada}</div>
                </div>
                <div className="flex-shrink-0 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Dorsal</div>
                  <div className="text-3xl font-black text-orange-700 leading-none">#{a.dorsal}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-orange-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Importante:</strong> el dorsal lo asigna el club (el que ves arriba) y el <strong>nombre</strong> lo eliges tú al hacer el pedido — normalmente el <strong>nombre de pila</strong> del jugador/a. La equipación se fabrica personalizada y no admite cambios.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-orange-200 bg-orange-50/70 shadow-sm rounded-2xl">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Shirt className="w-5 h-5 text-orange-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-orange-950 text-base mb-1">
              Espera a saber tu dorsal antes de personalizar
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              El club te avisará por <strong>email y WhatsApp</strong> en cuanto tengas tu dorsal asignado para la próxima temporada. Personaliza la equipación solo cuando recibas la notificación con el número.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}