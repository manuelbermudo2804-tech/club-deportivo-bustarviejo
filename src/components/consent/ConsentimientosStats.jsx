import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function ConsentimientosStats({ items = [] }) {
  const activos = items.filter((i) => !i.revocado);
  const promos = activos.filter((i) => i.acepta_promociones).length;
  const patros = activos.filter((i) => i.acepta_patrocinadores).length;
  const revocados = items.filter((i) => i.revocado).length;

  const stats = [
    { label: "Contactos activos", value: activos.length, color: "text-slate-900" },
    { label: "Aceptan promociones del club", value: promos, color: "text-green-700" },
    { label: "Aceptan ofertas de patrocinadores", value: patros, color: "text-orange-700" },
    { label: "Han retirado el consentimiento", value: revocados, color: "text-slate-400" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}