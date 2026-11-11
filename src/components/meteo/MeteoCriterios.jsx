import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GRUPOS, getUmbrales } from "@/lib/meteoRules";

const CAMPOS = [
  { key: "viento_ambar", label: "Viento 🟠 (km/h)" },
  { key: "viento_rojo", label: "Viento 🔴 (km/h)" },
  { key: "rachas_rojo", label: "Rachas 🔴 (km/h)" },
  { key: "temp_minima", label: "Temp. mínima (°)" },
  { key: "lluvia_ambar", label: "Lluvia 🟠 (%)" },
  { key: "lluvia_rojo", label: "Lluvia 🔴 (%)" },
];

const GRUPO_DESC = {
  pequenos: "Pre-Benjamín · Benjamín · Alevín (incl. femenino)",
  medianos: "Infantil · Cadete · Femenino",
  mayores: "Juvenil · Aficionado",
};

export default function MeteoCriterios({ config, onSaved }) {
  const [form, setForm] = useState(() => ({
    instalacion_semicubierta: config?.instalacion_semicubierta || "Pista semicubierta",
    hora_limite_aviso: config?.hora_limite_aviso || "16:30",
    umbrales: {
      pequenos: getUmbrales(config, "pequenos"),
      medianos: getUmbrales(config, "medianos"),
      mayores: getUmbrales(config, "mayores"),
    },
  }));
  const [saving, setSaving] = useState(false);

  const setUmbral = (grupo, key, value) => {
    setForm((f) => ({ ...f, umbrales: { ...f.umbrales, [grupo]: { ...f.umbrales[grupo], [key]: Number(value) } } }));
  };

  const guardar = async () => {
    setSaving(true);
    try {
      if (config?.id) await base44.entities.MeteoConfig.update(config.id, form);
      else await base44.entities.MeteoConfig.create({ activo: true, ...form });
      toast.success("Criterios guardados");
      onSaved?.();
    } catch {
      toast.error("No se pudieron guardar los criterios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Instalación semicubierta</Label>
            <Input
              value={form.instalacion_semicubierta}
              onChange={(e) => setForm((f) => ({ ...f, instalacion_semicubierta: e.target.value }))}
            />
          </div>
          <div>
            <Label>Hora límite de aviso a familias</Label>
            <Input
              type="time"
              value={form.hora_limite_aviso}
              onChange={(e) => setForm((f) => ({ ...f, hora_limite_aviso: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {Object.keys(GRUPOS).map((g) => (
        <Card key={g}>
          <CardContent className="p-4">
            <p className="font-bold text-slate-900">{GRUPOS[g]}</p>
            <p className="text-sm text-slate-500 mb-3">{GRUPO_DESC[g]}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {CAMPOS.map((c) => (
                <div key={c.key}>
                  <Label className="text-xs">{c.label}</Label>
                  <Input
                    type="number"
                    value={form.umbrales[g][c.key]}
                    onChange={(e) => setUmbral(g, c.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Guardar criterios"}</Button>
    </div>
  );
}