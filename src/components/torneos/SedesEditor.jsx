import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, MapPin } from "lucide-react";

// Editor de sedes y sus campos para un torneo.
// value = array de sedes: { id, nombre, direccion, campos: [nombre...] }
// onChange devuelve el nuevo array completo.
const genId = () => `sede_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function SedesEditor({ value = [], onChange }) {
  const [nuevaSede, setNuevaSede] = useState("");

  const addSede = () => {
    if (!nuevaSede.trim()) return;
    onChange([...value, { id: genId(), nombre: nuevaSede.trim(), direccion: "", campos: [] }]);
    setNuevaSede("");
  };

  const updSede = (id, patch) =>
    onChange(value.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const delSede = (id) => onChange(value.filter((s) => s.id !== id));

  const addCampo = (sede) => updSede(sede.id, { campos: [...(sede.campos || []), `Campo ${(sede.campos?.length || 0) + 1}`] });
  const updCampo = (sede, i, nombre) => {
    const campos = [...(sede.campos || [])];
    campos[i] = nombre;
    updSede(sede.id, { campos });
  };
  const delCampo = (sede, i) => updSede(sede.id, { campos: (sede.campos || []).filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Sedes y campos</Label>

      {value.map((sede) => (
        <div key={sede.id} className="border rounded-lg p-3 space-y-2 bg-slate-50">
          <div className="flex items-center gap-2">
            <Input
              value={sede.nombre}
              onChange={(e) => updSede(sede.id, { nombre: e.target.value })}
              placeholder="Nombre de la sede"
              className="font-medium bg-white"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 flex-shrink-0" onClick={() => delSede(sede.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <Input
            value={sede.direccion || ""}
            onChange={(e) => updSede(sede.id, { direccion: e.target.value })}
            placeholder="Dirección (opcional)"
            className="text-sm bg-white"
          />
          <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
            {(sede.campos || []).map((campo, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={campo} onChange={(e) => updCampo(sede, i, e.target.value)} className="h-8 text-sm bg-white" placeholder="Campo" />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-300 flex-shrink-0" onClick={() => delCampo(sede, i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addCampo(sede)}>
              <Plus className="w-3 h-3 mr-1" /> Añadir campo
            </Button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          value={nuevaSede}
          onChange={(e) => setNuevaSede(e.target.value)}
          placeholder="Nueva sede (ej: Polideportivo Municipal)"
          onKeyDown={(e) => e.key === "Enter" && addSede()}
        />
        <Button variant="outline" onClick={addSede}>
          <Plus className="w-4 h-4 mr-1" /> Sede
        </Button>
      </div>
    </div>
  );
}