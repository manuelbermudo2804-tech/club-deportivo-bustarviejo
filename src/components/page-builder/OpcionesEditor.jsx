import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

// Editor de opciones para selectores/radio: una línea por opción con botón +Añadir.
// Reemplaza el textarea (que tenía problemas con Enter en móvil).
export default function OpcionesEditor({ opciones = [], onChange, label = "Opciones" }) {
  const list = Array.isArray(opciones) ? opciones : [];

  const setAt = (idx, val) => {
    const next = [...list];
    next[idx] = val;
    onChange(next);
  };

  const add = () => onChange([...list, ""]);
  const remove = (idx) => onChange(list.filter((_, i) => i !== idx));

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-slate-700">{label}</label>
        <Button size="sm" variant="outline" onClick={add} className="h-7 gap-1 text-xs">
          <Plus className="w-3 h-3" /> Añadir opción
        </Button>
      </div>
      {list.length === 0 && (
        <p className="text-xs text-slate-400 italic">Aún no hay opciones. Pulsa "Añadir opción".</p>
      )}
      <div className="space-y-1.5">
        {list.map((op, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={op}
              onChange={(e) => setAt(idx, e.target.value)}
              placeholder={`Opción ${idx + 1}`}
              className="text-sm flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(idx)}
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}