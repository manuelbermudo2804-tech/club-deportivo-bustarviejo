import React from "react";
import { AlertTriangle, Users, Receipt, Info } from "lucide-react";

/**
 * Muestra el impacto de un cambio de correo antes de confirmarlo:
 * jugadores afectados, pagos que se migran (sin tocar importes) y aviso
 * si el correo nuevo ya está en uso por otra familia.
 */
export default function EmailChangeImpact({ loading, duplicado, jugadoresAfectados = [], pagosAfectados = 0 }) {
  if (loading) {
    return <p className="text-xs text-slate-500">Comprobando a quién afecta este cambio...</p>;
  }

  return (
    <div className="space-y-2">
      {duplicado && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Ese correo ya está en uso</strong> en la ficha de: {duplicado}. Si continúas, dos
            familias distintas compartirán el mismo acceso. Revísalo antes de guardar.
          </span>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs text-slate-700">
        <p className="flex items-center gap-2 font-semibold text-slate-800">
          <Info className="w-4 h-4 text-orange-600" /> Resumen del cambio
        </p>
        <p className="flex items-start gap-2">
          <Users className="w-3.5 h-3.5 mt-0.5 text-slate-500" />
          {jugadoresAfectados.length > 0
            ? <span>Afecta a: <strong>{jugadoresAfectados.join(", ")}</strong></span>
            : <span>Solo afecta a este jugador</span>}
        </p>
        <p className="flex items-start gap-2">
          <Receipt className="w-3.5 h-3.5 mt-0.5 text-slate-500" />
          <span>
            {pagosAfectados > 0
              ? <>Se actualizará el correo de <strong>{pagosAfectados} pago(s)</strong></>
              : <>No hay pagos que actualizar</>}
            . Los importes y estados de pago <strong>no cambian</strong>.
          </span>
        </p>
      </div>
    </div>
  );
}