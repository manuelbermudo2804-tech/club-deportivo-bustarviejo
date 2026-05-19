import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUploadInput from "./ImageUploadInput";

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
        <>
          <div>
            <Label>Imagen de fondo</Label>
            <ImageUploadInput
              value={hero?.imagen_url}
              onChange={(v) => update("imagen_url", v)}
            />
            <p className="text-xs text-slate-500 mt-1">Recomendado: 1600x900px (horizontal). En móvil se recorta automáticamente, ajusta el encuadre abajo.</p>
          </div>
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex-1 mr-3">
              <Label className="cursor-pointer">📱 Mostrar imagen ENTERA en móvil</Label>
              <p className="text-xs text-slate-600 mt-0.5">Activa esto si no quieres que se recorte. La imagen aparecerá completa arriba y el texto debajo. (Solo afecta a móvil)</p>
            </div>
            <Switch
              checked={!!hero?.imagen_entera_movil}
              onCheckedChange={(v) => update("imagen_entera_movil", v)}
            />
          </div>

          {hero?.imagen_entera_movil && (
            <div>
              <Label>Color de fondo (relleno alrededor)</Label>
              <Input
                type="color"
                value={hero?.color_fondo_entera || "#0f172a"}
                onChange={(e) => update("color_fondo_entera", e.target.value)}
                className="h-10"
              />
              <p className="text-xs text-slate-500 mt-1">Se usa para rellenar el espacio si la imagen no ocupa todo el ancho.</p>
            </div>
          )}

          {!hero?.imagen_entera_movil && (
            <div>
              <Label>Encuadre en móvil</Label>
              <Select
                value={hero?.posicion_imagen_movil || "center"}
                onValueChange={(v) => update("posicion_imagen_movil", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">🎯 Centro (por defecto)</SelectItem>
                  <SelectItem value="top">⬆️ Arriba (caras / cielo)</SelectItem>
                  <SelectItem value="bottom">⬇️ Abajo (pies / suelo)</SelectItem>
                  <SelectItem value="left">⬅️ Izquierda</SelectItem>
                  <SelectItem value="right">➡️ Derecha</SelectItem>
                  <SelectItem value="top left">↖️ Arriba-Izquierda</SelectItem>
                  <SelectItem value="top right">↗️ Arriba-Derecha</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Si la imagen sale cortada por la parte importante, prueba a cambiar el encuadre o activa "Mostrar imagen entera" arriba.</p>
            </div>
          )}
        </>
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
        <div className="space-y-3 p-3 bg-slate-50 rounded-xl">
          <div>
            <Label>Tipo de evento</Label>
            <Select
              value={hero?.tipo_fecha || "un_dia"}
              onValueChange={(v) => update("tipo_fecha", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="un_dia">📅 Un día concreto (con hora)</SelectItem>
                <SelectItem value="rango">🗓️ Varios días (rango de fechas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(!hero?.tipo_fecha || hero?.tipo_fecha === "un_dia") && (
            <div>
              <Label>Fecha y hora del evento</Label>
              <Input
                type="datetime-local"
                value={hero?.fecha_evento ? hero.fecha_evento.slice(0, 16) : ""}
                onChange={(e) => update("fecha_evento", e.target.value ? new Date(e.target.value).toISOString() : "")}
              />
              <p className="text-xs text-slate-500 mt-1">La cuenta atrás contará hasta esta fecha y hora.</p>
            </div>
          )}

          {hero?.tipo_fecha === "rango" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha de inicio</Label>
                <Input
                  type="date"
                  value={hero?.fecha_inicio || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...hero,
                      fecha_inicio: v,
                      // mantener fecha_evento sincronizada (inicio a las 00:00) para la cuenta atrás
                      fecha_evento: v ? new Date(`${v}T00:00:00`).toISOString() : "",
                    });
                  }}
                />
              </div>
              <div>
                <Label>Fecha de fin</Label>
                <Input
                  type="date"
                  value={hero?.fecha_fin || ""}
                  onChange={(e) => update("fecha_fin", e.target.value)}
                />
              </div>
              <p className="col-span-2 text-xs text-slate-500">
                Se mostrará la fecha completa (ej: "3, 4 y 5 de Julio de 2026"). La cuenta atrás contará hasta el día de inicio.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}