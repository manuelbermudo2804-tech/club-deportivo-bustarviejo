import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { OTRO_PREFIX, isOtroInteres, getInteresLabel } from "./conectaIntereses";

export default function OtroInteresInput({ intereses, onAdd, onRemove }) {
  const [texto, setTexto] = useState("");
  const propios = intereses.filter(isOtroInteres);

  const add = () => {
    const t = texto.trim();
    if (!t) return;
    const id = OTRO_PREFIX + t;
    if (!intereses.includes(id)) onAdd(id);
    setTexto("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="¿Otra afición? Escríbela aquí (ej: pesca, cocina, running nocturno)"
        />
        <Button type="button" variant="outline" onClick={add} disabled={!texto.trim()}>
          <Plus className="w-4 h-4 mr-1" /> Añadir
        </Button>
      </div>
      {propios.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {propios.map(id => (
            <span key={id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-green-600 text-white">
              {getInteresLabel(id)}
              <button type="button" onClick={() => onRemove(id)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}