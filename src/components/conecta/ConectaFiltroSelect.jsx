import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { INTERESES } from "./conectaIntereses";

export default function ConectaFiltroSelect({ value, onChange, counts = {} }) {
  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <Select value={value || "todos"} onValueChange={(v) => onChange(v === "todos" ? null : v)}>
        <SelectTrigger className="w-full sm:w-72 bg-white">
          <SelectValue placeholder="Filtrar por interés" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los intereses</SelectItem>
          {INTERESES.map(i => (
            <SelectItem key={i.id} value={i.id}>
              {i.label}{counts[i.id] ? ` · ${counts[i.id]}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}