import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";

// Tipos de sub-campo permitidos dentro de un bloque repetidor (ej: jugadores)
const SUB_TIPOS = [
  { v: "texto", l: "📝 Texto" },
  { v: "email", l: "📧 Email" },
  { v: "telefono", l: "📞 Teléfono" },
  { v: "dni", l: "🆔 DNI" },
  { v: "fecha", l: "📅 Fecha" },
  { v: "numero", l: "🔢 Número" },
];

// Editor de la plantilla de campos que se repetirá por cada jugador.
export default function SubCamposEditor({ subCampos = [], onChange }) {
  const list = Array.isArray(subCampos) ? subCampos : [];

  const add = () => {
    const id = `sub_${Date.now()}`;
    onChange([...list, { id, tipo: "texto", etiqueta: "Nombre y apellidos", requerido: true }]);
  };
  const updateAt = (idx, key, val) => {
    const next = [...list];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };
  const remove = (idx) => onChange(list.filter((_, i) => i !== idx));

  return (
    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-800">Campos por jugador</label>
        <Button size="sm" variant="outline" onClick={add} className="h-7 gap-1 text-xs">
          <Plus className="w-3 h-3" /> Añadir campo
        </Button>
      </div>
      {list.length === 0 && (
        <p className="text-xs text-slate-400 italic">Añade los campos a rellenar por cada jugador (ej: Nombre, DNI...).</p>
      )}
      <div className="space-y-2">
        {list.map((sc, idx) => (
          <div key={sc.id || idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-1.5">
              <Input
                value={sc.etiqueta}
                onChange={(e) => updateAt(idx, "etiqueta", e.target.value)}
                placeholder="Etiqueta"
                className="text-sm flex-1"
              />
              <Select value={sc.tipo} onValueChange={(v) => updateAt(idx, "tipo", v)}>
                <SelectTrigger className="text-sm w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUB_TIPOS.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)} className="h-8 w-8 text-red-500 hover:bg-red-50 flex-shrink-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={!!sc.requerido} onCheckedChange={(v) => updateAt(idx, "requerido", v)} />
              Obligatorio
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}