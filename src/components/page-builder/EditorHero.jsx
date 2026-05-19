import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Editor del bloque Hero (cabecera principal).
export default function EditorHero({ hero, onChange }) {
  const update = (k, v) => onChange({ ...hero, [k]: v });

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-900 text-base mb-3">🎬 Hero principal</h3>

      <div>
        <Label>Tipo de fondo</Label>
        <Select value={hero?.tipo || "imagen"} onValueChange={(v) => update("tipo", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="imagen">🖼️ Imagen</SelectItem>
            <SelectItem value="gradient">🎨 Degradado de color</SelectItem>
            <SelectItem value="color">⬛ Color sólido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hero?.tipo === "imagen" && (
        <div>
          <Label>URL de imagen de fondo</Label>
          <Input
            value={hero?.imagen_url || ""}
            onChange={(e) => update("imagen_url", e.target.value)}
            placeholder="https://..."
          />
          <p className="text-xs text-slate-500 mt-1">Recomendado: 1600x900px o superior.</p>
        </div>
      )}

      {(hero?.tipo === "gradient" || hero?.tipo === "color") && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Color principal</Label>
            <Input
              type="color"
              value={hero?.color_primario || "#ea580c"}
              onChange={(e) => update("color_primario", e.target.value)}
              className="h-10"
            />
          </div>
          {hero?.tipo === "gradient" && (
            <div>
              <Label>Color secundario</Label>
              <Input
                type="color"
                value={hero?.color_secundario || "#15803d"}
                onChange={(e) => update("color_secundario", e.target.value)}
                className="h-10"
              />
            </div>
          )}
        </div>
      )}

      <div>
        <Label>Badge (etiqueta superior)</Label>
        <Input
          value={hero?.badge || ""}
          onChange={(e) => update("badge", e.target.value)}
          placeholder="EVENTO 2026"
        />
      </div>

      <div>
        <Label>Título principal</Label>
        <Input
          value={hero?.titulo || ""}
          onChange={(e) => update("titulo", e.target.value)}
          placeholder="Nombre del evento"
        />
      </div>

      <div>
        <Label>Subtítulo</Label>
        <Textarea
          value={hero?.subtitulo || ""}
          onChange={(e) => update("subtitulo", e.target.value)}
          placeholder="Breve descripción..."
          rows={2}
        />
      </div>

      <div>
        <Label>Texto del botón</Label>
        <Input
          value={hero?.cta_texto || ""}
          onChange={(e) => update("cta_texto", e.target.value)}
          placeholder="Inscríbete ahora"
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
        <div>
          <Label className="cursor-pointer">⏰ Cuenta atrás</Label>
          <p className="text-xs text-slate-500">Mostrar reloj con tiempo restante</p>
        </div>
        <Switch
          checked={!!hero?.mostrar_cuenta_atras}
          onCheckedChange={(v) => update("mostrar_cuenta_atras", v)}
        />
      </div>

      {hero?.mostrar_cuenta_atras && (
        <div>
          <Label>Fecha y hora del evento</Label>
          <Input
            type="datetime-local"
            value={hero?.fecha_evento ? hero.fecha_evento.slice(0, 16) : ""}
            onChange={(e) => update("fecha_evento", e.target.value ? new Date(e.target.value).toISOString() : "")}
          />
        </div>
      )}
    </div>
  );
}