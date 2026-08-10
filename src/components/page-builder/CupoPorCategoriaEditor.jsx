import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Editor de cupos por categoría dentro de Ajustes → Plazas.
// Enlaza con un campo de tipo "select" o "radio" del formulario (la categoría).
// Cada opción de ese campo puede tener su propio límite de plazas.
export default function CupoPorCategoriaEditor({ formulario, limites, onChange }) {
  const camposCategoria = (formulario?.campos || []).filter(
    (c) => (c.tipo === "select" || c.tipo === "radio") && (c.opciones || []).length > 0
  );

  const cupos = limites?.cupos_categoria || {};
  const activo = !!limites?.cupos_categoria_activo;
  const campoId = limites?.cupos_categoria_campo || "";
  const campoElegido = camposCategoria.find((c) => c.id === campoId);

  const setCupo = (opcion, valor) => {
    onChange({
      cupos_categoria: {
        ...cupos,
        [opcion]: valor === "" ? null : Math.max(0, parseInt(valor) || 0),
      },
    });
  };

  return (
    <div className="pt-3 border-t border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-bold">🎾 Cupo por categoría</Label>
          <p className="text-xs text-slate-500 mt-0.5">
            Define un máximo de plazas para cada categoría por separado.
          </p>
        </div>
        <Switch
          checked={activo}
          onCheckedChange={(v) => onChange({ cupos_categoria_activo: v })}
        />
      </div>

      {activo && (
        <>
          {camposCategoria.length === 0 ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Necesitas un campo tipo <strong>Selector</strong> u <strong>Opciones (radio)</strong> con opciones en el formulario para asignar los cupos (ej: un campo "Categoría" con A, B, C).
            </p>
          ) : (
            <>
              <div>
                <Label className="text-xs">Campo que define la categoría</Label>
                <Select
                  value={campoId}
                  onValueChange={(v) => onChange({ cupos_categoria_campo: v })}
                >
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Elige el campo…" /></SelectTrigger>
                  <SelectContent>
                    {camposCategoria.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.etiqueta}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {campoElegido && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Plazas máximas por categoría (deja vacío = sin límite en esa categoría):</p>
                  {(campoElegido.opciones || []).map((op) => (
                    <div key={op} className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-slate-700 truncate">{op}</span>
                      <Input
                        type="number"
                        min="0"
                        value={cupos[op] ?? ""}
                        onChange={(e) => setCupo(op, e.target.value)}
                        placeholder="Ej: 12"
                        className="w-28 text-sm h-9"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}