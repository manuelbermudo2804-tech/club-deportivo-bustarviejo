import React from "react";
import { Badge } from "@/components/ui/badge";

/** Muestra plazas ocupadas / disponibles de una categoría. */
export default function PlazasBadge({ estado }) {
  if (!estado) return null;
  if (estado.cerrada) {
    return <Badge className="bg-slate-600 text-white text-xs">Inscripciones cerradas</Badge>;
  }
  if (estado.limite === 0) {
    return <Badge className="bg-slate-100 text-slate-600 text-xs">Sin límite · {estado.ocupadas} inscritos</Badge>;
  }
  if (estado.completa) {
    return <Badge className="bg-red-600 text-white text-xs">Completa · {estado.ocupadas}/{estado.limite}</Badge>;
  }
  return (
    <Badge className="bg-green-100 text-green-800 text-xs">
      {estado.disponibles} {estado.disponibles === 1 ? "plaza libre" : "plazas libres"} · {estado.ocupadas}/{estado.limite}
    </Badge>
  );
}