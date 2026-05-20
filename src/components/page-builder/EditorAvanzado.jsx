import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Tag, BellRing, Link2, MailPlus } from "lucide-react";

// Tab "Avanzado": cupones, lista de espera, integraciones externas, notificaciones admin
export default function EditorAvanzado({ config, panel, onConfigChange, onPanelChange }) {
  const cupones = config?.cupones || [];
  const listaEspera = config?.lista_espera || {};
  const integraciones = config?.integraciones || {};

  const updateCupon = (idx, k, v) => {
    const next = [...cupones];
    next[idx] = { ...next[idx], [k]: v };
    onConfigChange("cupones", next);
  };

  const addCupon = () => {
    onConfigChange("cupones", [
      ...cupones,
      { codigo: "", tipo: "porcentaje", valor: 10, max_usos: null, activo: true },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* CUPONES */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-base">Cupones de descuento</h3>
        </div>
        <p className="text-xs text-slate-500">
          Los cupones se aplican solo si el pago está activo. El usuario los introduce al pagar.
        </p>

        <div className="space-y-2">
          {cupones.map((c, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-xl border space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={c.codigo}
                  onChange={(e) => updateCupon(idx, "codigo", e.target.value.toUpperCase())}
                  placeholder="EARLYBIRD20"
                  className="text-sm uppercase"
                />
                <Button
                  variant="ghost" size="icon"
                  onClick={() => onConfigChange("cupones", cupones.filter((_, i) => i !== idx))}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={c.tipo || "porcentaje"} onValueChange={(v) => updateCupon(idx, "tipo", v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentaje">% Porcentaje</SelectItem>
                    <SelectItem value="fijo">€ Fijo</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={c.valor ?? ""}
                  onChange={(e) => updateCupon(idx, "valor", parseFloat(e.target.value) || 0)}
                  placeholder={c.tipo === "porcentaje" ? "20" : "5"}
                  className="text-xs h-8"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Máx usos (vacío = ∞)</Label>
                  <Input
                    type="number"
                    value={c.max_usos ?? ""}
                    onChange={(e) => updateCupon(idx, "max_usos", e.target.value ? parseInt(e.target.value) : null)}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Caducidad</Label>
                  <Input
                    type="date"
                    value={c.fecha_expiracion ? c.fecha_expiracion.slice(0, 10) : ""}
                    onChange={(e) => updateCupon(idx, "fecha_expiracion", e.target.value || null)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Switch
                  checked={c.activo !== false}
                  onCheckedChange={(v) => updateCupon(idx, "activo", v)}
                />
                Activo
              </label>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addCupon} className="w-full gap-1">
            <Plus className="w-3 h-3" /> Añadir cupón
          </Button>
        </div>
      </section>

      {/* LISTA DE ESPERA */}
      <section className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-base">Lista de espera</h3>
        </div>
        <p className="text-xs text-slate-500">
          Cuando se agoten las plazas, mostrar un mini-formulario para apuntarse a la lista de espera.
        </p>
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <Label className="font-semibold cursor-pointer">Activar lista de espera</Label>
          <Switch
            checked={!!listaEspera.activa}
            onCheckedChange={(v) => onConfigChange("lista_espera", { ...listaEspera, activa: v })}
          />
        </div>
        {listaEspera.activa && (
          <>
            <div>
              <Label className="text-xs">Título</Label>
              <Input
                value={listaEspera.titulo || ""}
                onChange={(e) => onConfigChange("lista_espera", { ...listaEspera, titulo: e.target.value })}
                placeholder="Lista de espera"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea
                value={listaEspera.descripcion || ""}
                onChange={(e) => onConfigChange("lista_espera", { ...listaEspera, descripcion: e.target.value })}
                placeholder="Si se libera una plaza te avisaremos por email."
                rows={2}
                className="text-sm"
              />
            </div>
          </>
        )}
      </section>

      {/* NOTIFICACIONES ADMIN */}
      <section className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <MailPlus className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-base">Notificaciones al admin</h3>
        </div>
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <Label className="font-semibold cursor-pointer">Push al recibir inscripción</Label>
            <p className="text-xs text-slate-500 mt-0.5">A los emails autorizados en el panel</p>
          </div>
          <Switch
            checked={panel?.notificar_push !== false}
            onCheckedChange={(v) => onPanelChange({ ...(panel || {}), notificar_push: v })}
          />
        </div>
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <Label className="font-semibold cursor-pointer">Avisar a todos los admins</Label>
            <p className="text-xs text-slate-500 mt-0.5">Además de los gestores configurados</p>
          </div>
          <Switch
            checked={!!panel?.notificar_admins}
            onCheckedChange={(v) => onPanelChange({ ...(panel || {}), notificar_admins: v })}
          />
        </div>
      </section>

      {/* INTEGRACIONES */}
      <section className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-base">Integraciones externas</h3>
        </div>
        <div>
          <Label className="text-xs">Google Sheet ID (sync automático)</Label>
          <Input
            value={integraciones.google_sheet_id || ""}
            onChange={(e) => onConfigChange("integraciones", { ...integraciones, google_sheet_id: e.target.value })}
            placeholder="1aBcDeFgH..."
            className="text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            ID del Google Sheets donde duplicar cada inscripción. Lee el ID de la URL de la hoja.
          </p>
        </div>
        <div>
          <Label className="text-xs">Webhook personalizado (URL)</Label>
          <Input
            value={integraciones.webhook_url || ""}
            onChange={(e) => onConfigChange("integraciones", { ...integraciones, webhook_url: e.target.value })}
            placeholder="https://hooks.zapier.com/..."
            className="text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            Se hará POST con los datos de cada inscripción nueva (útil para Zapier, Make…).
          </p>
        </div>
      </section>

      {/* ANTI-SPAM */}
      <section className="space-y-3 pt-4 border-t border-slate-200">
        <h3 className="font-bold text-slate-900 text-base">🛡️ Anti-spam</h3>
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <Label className="font-semibold cursor-pointer">Honeypot anti-bot</Label>
            <p className="text-xs text-slate-500 mt-0.5">Campo invisible que solo rellenan bots</p>
          </div>
          <Switch
            checked={config?.anti_spam?.honeypot !== false}
            onCheckedChange={(v) => onConfigChange("anti_spam", { ...(config?.anti_spam || {}), honeypot: v })}
          />
        </div>
      </section>
    </div>
  );
}