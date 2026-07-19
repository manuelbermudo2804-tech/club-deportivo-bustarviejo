import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Botón MANUAL para recalcular los descuentos de 25€ por hermanos.
 * Sustituye a la antigua automatización (que gastaba muchos créditos).
 * Recorre las familias con 2+ jugadores activos y llama a recalcSiblingDiscounts
 * una sola vez por familia (por email del padre).
 */
export default function RecalcSiblingDiscountsButton({ players = [] }) {
  const [running, setRunning] = useState(false);

  const handleRecalc = async () => {
    // Reunir emails de familias con 2+ jugadores activos que no se dan de baja
    const activos = players.filter(
      (p) => p.activo === true && p.estado_renovacion !== "no_renueva" && p.email_padre
    );
    const counts = {};
    activos.forEach((p) => {
      const email = String(p.email_padre).toLowerCase();
      counts[email] = (counts[email] || 0) + 1;
    });
    const familias = Object.keys(counts).filter((email) => counts[email] >= 2);

    if (familias.length === 0) {
      toast.info("No hay familias con hermanos activos para recalcular");
      return;
    }

    setRunning(true);
    let totalActualizados = 0;
    let errores = 0;
    for (const email of familias) {
      try {
        const res = await base44.functions.invoke("recalcSiblingDiscounts", { email_padre: email });
        const results = res?.data?.results || [];
        results.forEach((r) => { totalActualizados += r.updated || 0; });
      } catch {
        errores += 1;
      }
    }
    setRunning(false);

    if (errores > 0) {
      toast.warning(`Recálculo terminado con ${errores} error(es). ${totalActualizados} cuota(s) actualizada(s).`);
    } else {
      toast.success(`✅ ${familias.length} familia(s) revisada(s), ${totalActualizados} cambio(s) aplicado(s)`);
    }
  };

  return (
    <Card className="border-2 border-indigo-300 hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Descuentos hermanos</h3>
            <p className="text-sm text-slate-600">Recalcula el descuento de 25€ del hermano menor tras las renovaciones</p>
          </div>
          <Button
            onClick={handleRecalc}
            disabled={running}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {running ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Recalculando...</>
            ) : (
              "Recalcular ahora"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}