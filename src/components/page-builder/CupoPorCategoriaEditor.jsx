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
  const reservas = limites?.reservas_categoria || {};
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

  const setReserva = (opcion, valor) => {
    onChange({
      reservas_categoria: {
        ...reservas,
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
                  <div className="flex items-center gap-2 px-1">
                    <span className="flex-1" />
                    <span className="w-24 text-[10px] font-semibold text-slate-400 text-center uppercase">Máx.</span>
                    <span className="w-24 text-[10px] font-semibold text-slate-400 text-center uppercase">Reservadas</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    <strong>Máx.</strong> = plazas totales de esa categoría (vacío = sin límite). <strong>Reservadas</strong> = plazas ya ocupadas fuera de la web (teléfono, en persona…).
                  </p>
                  {(campoElegido.opciones || []).map((op) => (
                    <div key={op} className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-slate-700 truncate">{op}</span>
                      <Input
                        type="number"
                        min="0"
                        value={cupos[op] ?? ""}
                        onChange={(e) => setCupo(op, e.target.value)}
                        placeholder="Ej: 12"
                        className="w-24 text-sm h-9"
                      />
                      <Input
                        type="number"
                        min="0"
                        value={reservas[op] ?? ""}
                        onChange={(e) => setReserva(op, e.target.value)}
                        placeholder="0"
                        className="w-24 text-sm h-9"
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