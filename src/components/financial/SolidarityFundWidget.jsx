import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Users, TrendingUp, PiggyBank, Gift, ChevronDown, ChevronUp } from "lucide-react";
import GrantBecaModal from "./GrantBecaModal";
import BecasList from "./BecasList";

const normalize = (s) => (s ? String(s).replace(/[^\d]/g, "") : "");

export default function SolidarityFundWidget({ activeSeason, payments = [] }) {
  const [grantOpen, setGrantOpen] = useState(false);
  const [showBecas, setShowBecas] = useState(false);
  const queryClient = useQueryClient();
  const seasonKey = normalize(activeSeason?.temporada);

  // Cargar becas de la temporada activa
  const { data: becas = [], refetch: refetchBecas } = useQuery({
    queryKey: ["becas", activeSeason?.temporada],
    queryFn: () => base44.entities.Beca.filter({ temporada: activeSeason?.temporada }),
    enabled: !!activeSeason?.fondo_solidario_activo && !!activeSeason?.temporada,
    initialData: [],
  });

  // Cargar jugadores activos (solo cuando se abre el modal)
  const { data: players = [] } = useQuery({
    queryKey: ["players-for-beca"],
    queryFn: () => base44.entities.Player.filter({ activo: true }, "-created_date", 500),
    enabled: grantOpen,
    initialData: [],
    staleTime: 60000,
  });

  const stats = useMemo(() => {
    const seasonPayments = payments.filter(
      (p) => normalize(p.temporada) === seasonKey && p.is_deleted !== true
    );

    const recaudado = seasonPayments
      .filter((p) => p.estado === "Pagado")
      .reduce((sum, p) => sum + (Number(p.aportacion_solidaria) || 0), 0);

    const comprometido = seasonPayments.reduce(
      (sum, p) => sum + (Number(p.aportacion_solidaria) || 0),
      0
    );

    const familiasUnicas = new Set(
      seasonPayments
        .filter((p) => Number(p.aportacion_solidaria) > 0)
        .map((p) => p.jugador_id)
    );

    // Total ya becado (solo becas activas)
    const becado = (becas || [])
      .filter((b) => b.estado === "activa")
      .reduce((sum, b) => sum + (Number(b.importe) || 0), 0);

    const disponible = Math.max(0, recaudado - becado);
    const pendiente = comprometido - recaudado;
    const mediaPorFamilia = familiasUnicas.size > 0 ? recaudado / familiasUnicas.size : 0;

    return {
      recaudado,
      becado,
      disponible,
      comprometido,
      pendiente,
      familias: familiasUnicas.size,
      mediaPorFamilia,
      becasActivas: (becas || []).filter((b) => b.estado === "activa").length,
    };
  }, [payments, seasonKey, becas]);

  const handleBecaSuccess = () => {
    refetchBecas();
    queryClient.invalidateQueries({ queryKey: ["players"] });
  };

  if (!activeSeason?.fondo_solidario_activo) return null;

  return (
    <>
      <Card className="border-2 border-green-300 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
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
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border border-white/30">Activo</Badge>
              <Button
                size="sm"
                onClick={() => setGrantOpen(true)}
                disabled={stats.disponible <= 0}
                className="bg-white text-green-700 hover:bg-green-50"
                title={stats.disponible <= 0 ? "No hay disponible para becar" : "Conceder beca"}
              >
                <Gift className="w-4 h-4 mr-1" />
                Becar a jugador
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Disponible (Recaudado − Becado) */}
            <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-green-300">
              <div className="flex items-center gap-2 mb-1">
                <PiggyBank className="w-4 h-4 text-green-600" />
                <span className="text-xs text-slate-600">Disponible</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{stats.disponible.toFixed(2)}€</p>
              <p className="text-xs text-slate-500 mt-1">Para becar</p>
            </div>

            {/* Recaudado */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-slate-600">Recaudado</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{stats.recaudado.toFixed(2)}€</p>
              <p className="text-xs text-slate-500 mt-1">Ya cobrado</p>
            </div>

            {/* Becado */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-200">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 text-pink-600" />
                <span className="text-xs text-slate-600">Becado</span>
              </div>
              <p className="text-2xl font-bold text-pink-700">{stats.becado.toFixed(2)}€</p>
              <p className="text-xs text-slate-500 mt-1">{stats.becasActivas} beca{stats.becasActivas === 1 ? "" : "s"}</p>
            </div>

            {/* Pendiente */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span className="text-xs text-slate-600">Pendiente</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">{stats.pendiente.toFixed(2)}€</p>
              <p className="text-xs text-slate-500 mt-1">Cuotas no pagadas</p>
            </div>

            {/* Familias */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200 col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-slate-600">Familias</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{stats.familias}</p>
              <p className="text-xs text-slate-500 mt-1">Han aportado</p>
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
                {stats.disponible > 0 && (
                  <> Tienes <strong className="text-green-700">{stats.disponible.toFixed(2)}€ disponibles</strong> para becar a niños/as del club.</>
                )}
              </p>
            )}
          </div>

          {/* Toggle de lista de becas */}
          {stats.becasActivas > 0 && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBecas((v) => !v)}
                className="w-full justify-between text-green-800 hover:bg-green-100"
              >
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Becas concedidas ({stats.becasActivas})
                </span>
                {showBecas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              {showBecas && (
                <div className="mt-2">
                  <BecasList becas={becas} onChange={handleBecaSuccess} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <GrantBecaModal
        open={grantOpen}
        onOpenChange={setGrantOpen}
        temporada={activeSeason?.temporada}
        disponible={stats.disponible}
        players={players}
        onSuccess={handleBecaSuccess}
      />
    </>
  );
}