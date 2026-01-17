import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ExtraChargeBanner({ charge, onOpen }) {
  if (!charge?.publicado || !charge?.banner_activo) return null;
  return (
    <div className="mx-4 mb-4">
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 p-4 rounded-2xl shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-orange-900">Pago disponible</p>
            <p className="text-lg font-extrabold text-slate-900">{charge.titulo}</p>
            {Array.isArray(charge.items) && charge.items.some(i => i.obligatorio) && (
              <p className="text-xs text-slate-700 mt-1">Incluye conceptos obligatorios</p>
            )}
            {charge.fecha_limite && (
              <p className="text-xs text-orange-700 mt-1">Vence: {new Date(charge.fecha_limite).toLocaleDateString('es-ES')}</p>
            )}
          </div>
          <Button onClick={onOpen} className="bg-orange-600 hover:bg-orange-700">Pagar ahora</Button>
        </div>
      </Card>
    </div>
  );
}