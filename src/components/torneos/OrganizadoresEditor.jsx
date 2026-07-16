import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import EscudoUploadButton from "./EscudoUploadButton";

// Gestiona la lista de clubes organizadores (nombre + escudo).
// Útil para torneos organizados en común por más de un club.
export default function OrganizadoresEditor({ value = [], onChange }) {
  const lista = Array.isArray(value) ? value : [];

  const update = (i, patch) =>
    onChange(lista.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const add = () => onChange([...lista, { nombre: "", escudo_url: "" }]);
  const remove = (i) => onChange(lista.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Clubes organizadores (escudos)</p>
          <p className="text-xs text-slate-400">Añade cada club con su escudo. Aparecerán juntos en la portada pública.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4 mr-1" /> Añadir
        </Button>
      </div>

      {lista.map((org, i) => (
        <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
          <EscudoUploadButton value={org.escudo_url} onChange={(url) => update(i, { escudo_url: url })} />
          <Input
            value={org.nombre}
            onChange={(e) => update(i, { nombre: e.target.value })}
            placeholder="Nombre del club"
            className="flex-1 h-8"
          />
          <button type="button" onClick={() => remove(i)} className="text-slate-300 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}