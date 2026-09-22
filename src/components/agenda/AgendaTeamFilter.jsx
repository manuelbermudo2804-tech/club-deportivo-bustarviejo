import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Filtro de equipos de la agenda.
 * Con pocos equipos (familias, jugadores) muestra botoncitos.
 * Con muchos (entrenadores, coordinadores, admin) muestra un desplegable
 * para no comerse media pantalla en el móvil.
 */
export default function AgendaTeamFilter({ categorias, valor, onChange, limiteBotones = 4 }) {
  if (categorias.length <= 1) return null;

  if (categorias.length <= limiteBotones) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant={valor === "all" ? "default" : "outline"}
          onClick={() => onChange("all")}
          className={valor === "all" ? "bg-blue-600 hover:bg-blue-700 h-8 text-xs" : "h-8 text-xs"}
        >
          Todos los equipos
        </Button>
        {categorias.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={valor === c ? "default" : "outline"}
            onClick={() => onChange(c)}
            className={valor === c ? "bg-blue-600 hover:bg-blue-700 h-8 text-xs" : "h-8 text-xs"}
          >
            {c}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs w-full sm:w-64 bg-white">
        <SelectValue placeholder="Todos los equipos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los equipos</SelectItem>
        {categorias.map((c) => (
          <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}