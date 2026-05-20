import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const PRESETS = [
  { nombre: "Naranja Club", primario: "#ea580c", secundario: "#15803d" },
  { nombre: "Esmeralda", primario: "#10b981", secundario: "#06b6d4" },
  { nombre: "Violeta", primario: "#7c3aed", secundario: "#ec4899" },
  { nombre: "Azul", primario: "#3b82f6", secundario: "#06b6d4" },
  { nombre: "Rojo Pasión", primario: "#dc2626", secundario: "#f59e0b" },
  { nombre: "Mono Negro", primario: "#0f172a", secundario: "#475569" },
];

// Editor de branding global de la página.
export default function EditorBranding({ branding = {}, onChange }) {
  const update = (k, v) => onChange({ ...branding, [k]: v });

  const applyPreset = (preset) => {
    onChange({ ...branding, color_principal: preset.primario, color_secundario: preset.secundario });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-900 text-base mb-3">🎨 Branding</h3>

      <div>
        <Label className="mb-2 block">Paleta rápida</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.nombre}
              onClick={() => applyPreset(p)}
              className="group p-2 rounded-xl border-2 border-slate-200 hover:border-slate-900 transition-all"
            >
              <div className="flex gap-1 mb-1.5">
                <div className="flex-1 h-6 rounded" style={{ background: p.primario }} />
                <div className="flex-1 h-6 rounded" style={{ background: p.secundario }} />
              </div>
              <div className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                {p.nombre}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Color principal</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={branding.color_principal || "#ea580c"}
              onChange={(e) => update("color_principal", e.target.value)}
              className="h-10 w-14 p-1 cursor-pointer"
            />
            <Input
              value={branding.color_principal || "#ea580c"}
              onChange={(e) => update("color_principal", e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <div>
          <Label>Color secundario</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={branding.color_secundario || "#15803d"}
              onChange={(e) => update("color_secundario", e.target.value)}
              className="h-10 w-14 p-1 cursor-pointer"
            />
            <Input
              value={branding.color_secundario || "#15803d"}
              onChange={(e) => update("color_secundario", e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 space-y-3">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
          <div>
            <Label className="cursor-pointer">Mostrar logo del club</Label>
            <p className="text-xs text-slate-500">En la cabecera de la página</p>
          </div>
          <Switch
            checked={branding.mostrar_logo_club !== false}
            onCheckedChange={(v) => update("mostrar_logo_club", v)}
          />
        </div>
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
          <div>
            <Label className="cursor-pointer">Mostrar footer del club</Label>
            <p className="text-xs text-slate-500">Logo + enlaces al final</p>
          </div>
          <Switch
            checked={branding.mostrar_footer_club !== false}
            onCheckedChange={(v) => update("mostrar_footer_club", v)}
          />
        </div>
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
          <div>
            <Label className="cursor-pointer">Mostrar botón "Web del club"</Label>
            <p className="text-xs text-slate-500">Botón flotante arriba que lleva a cdbustarviejo.com</p>
          </div>
          <Switch
            checked={branding.mostrar_boton_web_club !== false}
            onCheckedChange={(v) => update("mostrar_boton_web_club", v)}
          />
        </div>
      </div>
    </div>
  );
}