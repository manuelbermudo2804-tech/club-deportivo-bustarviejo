import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, TrendingUp, PiggyBank } from "lucide-react";

const normalize = (s) => (s ? String(s).replace(/[^\d]/g, "") : "");

export default function SolidarityFundWidget({ activeSeason, payments = [] }) {
  const stats = useMemo(() => {
    const seasonKey = normalize(activeSeason?.temporada);
    const seasonPayments = payments.filter(
      (p) => normalize(p.temporada) === seasonKey && p.is_deleted !== true
    );

    // Total RECAUDADO (solo pagos en estado "Pagado")
    const recaudado = seasonPayments
      .filter((p) => p.estado === "Pagado")
      .reduce((sum, p) => sum + (Number(p.aportacion_solidaria) || 0), 0);

    // Total COMPROMETIDO (incluye pendientes y en revisión)
    const comprometido = seasonPayments.reduce(
      (sum, p) => sum + (Number(p.aportacion_solidaria) || 0),
      0
    );

    // Familias únicas que han aportado algo
    const familiasUnicas = new Set(
      seasonPayments
        .filter((p) => Number(p.aportacion_solidaria) > 0)
        .map((p) => p.jugador_id)
    );

    const pendiente = comprometido - recaudado;
    const mediaPorFamilia = familiasUnicas.size > 0 ? recaudado / familiasUnicas.size : 0;

    return {
      recaudado,
      comprometido,
      pendiente,
      familias: familiasUnicas.size,
      mediaPorFamilia,
    };
  }, [payments, activeSeason]);

  // Solo se muestra si el fondo está activo (DESPUÉS de hooks)
  if (!activeSeason?.fondo_solidario_activo) return null;

  return (
    <Card className="border-2 border-green-300 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">💚 Fondo Solidario de Becas</CardTitle>
              <p className="text-xs text-green-100 mt-0.5">
                Aportaciones voluntarias de las familias para becar a niños sin recursos
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border border-white/30">
            Activo
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Recaudado */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="w-4 h-4 text-green-600" />
              <span className="text-xs text-slate-600">Disponible</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats.recaudado.toFixed(2)}€</p>
            <p className="text-xs text-slate-500 mt-1">Ya cobrado</p>
          </div>

          {/* Pendiente de cobro */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-slate-600">Pendiente</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{stats.pendiente.toFixed(2)}€</p>
            <p className="text-xs text-slate-500 mt-1">Cuotas no pagadas</p>
          </div>

          {/* Familias aportantes */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-600">Familias</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.familias}</p>
            <p className="text-xs text-slate-500 mt-1">Han aportado</p>
          </div>

          {/* Media por familia */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-slate-600">Media</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {stats.mediaPorFamilia.toFixed(2)}€
            </p>
            <p className="text-xs text-slate-500 mt-1">Por familia</p>
          </div>
        </div>

        {/* Mensaje motivacional o estado */}
        <div className="mt-4 bg-white/70 rounded-lg p-3 border border-green-200">
          {stats.familias === 0 ? (
            <p className="text-sm text-slate-600 text-center">
              🌱 Aún no hay aportaciones. Cuando las familias activen la opción al pagar la cuota, las verás aquí.
            </p>
          ) : (
            <p className="text-sm text-green-800 text-center">
              ❤️ <strong>{stats.familias} familia{stats.familias === 1 ? "" : "s"}</strong> {stats.familias === 1 ? "ha aportado" : "han aportado"} ya{" "}
              <strong>{stats.comprometido.toFixed(2)}€</strong> al Fondo Solidario.
              {stats.recaudado > 0 && (
                <> Tienes <strong className="text-green-700">{stats.recaudado.toFixed(2)}€ disponibles</strong> para becar a niños/as del club.</>
              )}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}