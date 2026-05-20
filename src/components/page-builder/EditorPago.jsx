import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CreditCard, Euro } from "lucide-react";

// Editor de configuración de pago con Stripe para una landing.
// El admin define opciones libres (nombre + precio) que el usuario elegirá al inscribirse.
export default function EditorPago({ pago, onChange }) {
  const update = (k, v) => onChange({ ...(pago || {}), [k]: v });
  const opciones = pago?.opciones || [];

  const addOpcion = () => {
    update("opciones", [
      ...opciones,
      {
        id: `op_${Date.now()}`,
        nombre: "",
        descripcion: "",
        precio: 0,
        permitir_cantidad: false,
        cantidad_max: 10,
      },
    ]);
  };

  const updateOpcion = (idx, k, v) => {
    const next = [...opciones];
    next[idx] = { ...next[idx], [k]: v };
    update("opciones", next);
  };

  const deleteOpcion = (idx) => {
    update("opciones", opciones.filter((_, i) => i !== idx));
  };

  const moveOpcion = (idx, dir) => {
    const next = [...opciones];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    update("opciones", next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-5 h-5 text-slate-700" />
        <h3 className="font-bold text-slate-900 text-base">Pago con tarjeta (Stripe)</h3>
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        Si activas el pago, el usuario solo podrá inscribirse después de pagar con tarjeta. Las plazas
        no se reservan hasta que el pago se confirme.
      </p>

      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <Label className="font-semibold cursor-pointer">Activar pago con Stripe</Label>
          <p className="text-xs text-slate-500 mt-0.5">El formulario redirigirá a la pasarela segura.</p>
        </div>
        <Switch
          checked={!!pago?.activo}
          onCheckedChange={(v) => update("activo", v)}
        />
      </div>

      {pago?.activo && (
        <>
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-bold">Opciones de pago ({opciones.length})</Label>
              <Button size="sm" onClick={addOpcion} className="gap-1">
                <Plus className="w-4 h-4" /> Añadir
              </Button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Puedes crear varias opciones (ej: "Individual 15€", "Pareja 25€"). Si solo creas una, se
              cobrará automáticamente. Si creas varias, el usuario podrá elegir cuál quiere pagar.
            </p>

            <div className="space-y-3">
              {opciones.length === 0 && (
                <div className="text-center py-6 px-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    ⚠️ Añade al menos una opción de pago para que el formulario funcione.
                  </p>
                </div>
              )}

              {opciones.map((op, idx) => (
                <div key={op.id} className="p-3 bg-white rounded-xl border-2 border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button onClick={() => moveOpcion(idx, -1)} className="text-slate-400 hover:text-slate-700 text-xs" disabled={idx === 0}>▲</button>
                      <button onClick={() => moveOpcion(idx, 1)} className="text-slate-400 hover:text-slate-700 text-xs" disabled={idx === opciones.length - 1}>▼</button>
                    </div>
                    <div className="flex-1 font-semibold text-sm text-slate-700">Opción {idx + 1}</div>
                    <Button variant="ghost" size="icon" onClick={() => deleteOpcion(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      value={op.nombre || ""}
                      onChange={(e) => updateOpcion(idx, "nombre", e.target.value)}
                      placeholder="Ej: Inscripción torneo de pádel"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Descripción (opcional)</Label>
                    <Textarea
                      value={op.descripcion || ""}
                      onChange={(e) => updateOpcion(idx, "descripcion", e.target.value)}
                      placeholder="Detalles que aparecen en pequeño bajo el nombre"
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Precio (€)</Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={op.precio ?? ""}
                        onChange={(e) => updateOpcion(idx, "precio", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="text-sm pl-9"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <Label className="text-xs cursor-pointer">Permitir elegir cantidad</Label>
                    <Switch
                      checked={!!op.permitir_cantidad}
                      onCheckedChange={(v) => updateOpcion(idx, "permitir_cantidad", v)}
                    />
                  </div>

                  {op.permitir_cantidad && (
                    <div>
                      <Label className="text-xs">Cantidad máxima por inscripción</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={op.cantidad_max ?? 10}
                        onChange={(e) => updateOpcion(idx, "cantidad_max", parseInt(e.target.value) || 1)}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-3">
            <Label className="font-bold">Textos personalizados</Label>
            <div>
              <Label className="text-xs">Texto del botón de pago</Label>
              <Input
                value={pago?.cta_pago || ""}
                onChange={(e) => update("cta_pago", e.target.value)}
                placeholder="Pagar e inscribirme"
                className="text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                Tip: se añade automáticamente el importe (ej: "Pagar e inscribirme · 15€")
              </p>
            </div>
            <div>
              <Label className="text-xs">Mensaje tras el pago exitoso</Label>
              <Textarea
                value={pago?.mensaje_exito_pago || ""}
                onChange={(e) => update("mensaje_exito_pago", e.target.value)}
                rows={2}
                placeholder="¡Pago confirmado! Te hemos enviado un email con todos los detalles."
                className="text-sm"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
            💡 <strong>Cómo funciona:</strong> Al rellenar y enviar el formulario, el usuario será
            redirigido a Stripe para pagar con tarjeta. Cuando el pago se confirme, su inscripción se
            registra automáticamente y recibe un email de confirmación. Si no completa el pago, la
            inscripción no se crea y la plaza queda libre.
          </div>
        </>
      )}
    </div>
  );
}