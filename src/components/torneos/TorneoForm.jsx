import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Presets de puntuación por deporte
const DEPORTE_PRESETS = {
  "Fútbol": { tipo_puntuacion: "goles", puntos_victoria: 3, puntos_empate: 1, puntos_derrota: 0 },
  "Fútbol Sala": { tipo_puntuacion: "goles", puntos_victoria: 3, puntos_empate: 1, puntos_derrota: 0 },
  "Baloncesto": { tipo_puntuacion: "goles", puntos_victoria: 2, puntos_empate: 0, puntos_derrota: 1 },
  "Pádel": { tipo_puntuacion: "sets", puntos_victoria: 2, puntos_empate: 0, puntos_derrota: 0 },
  "Voleibol": { tipo_puntuacion: "sets", puntos_victoria: 3, puntos_empate: 0, puntos_derrota: 0 },
  "Otro": { tipo_puntuacion: "goles", puntos_victoria: 3, puntos_empate: 1, puntos_derrota: 0 },
};

const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function TorneoForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(() => ({
    nombre: initial?.nombre || "",
    slug: initial?.slug || "",
    deporte: initial?.deporte || "Fútbol",
    tipo_puntuacion: initial?.tipo_puntuacion || "goles",
    puntos_victoria: initial?.puntos_victoria ?? 3,
    puntos_empate: initial?.puntos_empate ?? 1,
    puntos_derrota: initial?.puntos_derrota ?? 0,
    fecha_inicio: initial?.fecha_inicio || "",
    fecha_fin: initial?.fecha_fin || "",
    organizadores: initial?.organizadores || "",
    descripcion: initial?.descripcion || "",
    logo_url: initial?.logo_url || "",
  }));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleDeporte = (deporte) => {
    const preset = DEPORTE_PRESETS[deporte] || DEPORTE_PRESETS["Otro"];
    setForm((f) => ({ ...f, deporte, ...preset }));
  };

  const handleNombre = (nombre) => {
    setForm((f) => ({
      ...f,
      nombre,
      slug: f.slug && initial ? f.slug : slugify(nombre),
    }));
  };

  const handleSubmit = () => {
    if (!form.nombre.trim()) return;
    onSave({ ...form, slug: form.slug || slugify(form.nombre) });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <Label>Nombre del torneo</Label>
          <Input value={form.nombre} onChange={(e) => handleNombre(e.target.value)} placeholder="Sierra Norte Madrid Cup 2026" />
        </div>
        <div>
          <Label>URL pública (slug)</Label>
          <Input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="sierra-norte-cup" />
          <p className="text-xs text-slate-400 mt-1">Se verá en /torneo/{form.slug || "..."}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Deporte</Label>
            <Select value={form.deporte} onValueChange={handleDeporte}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(DEPORTE_PRESETS).map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Puntúa por</Label>
            <Select value={form.tipo_puntuacion} onValueChange={(v) => set("tipo_puntuacion", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="goles">Goles / puntos</SelectItem>
                <SelectItem value="sets">Sets / juegos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Pts victoria</Label>
            <Input type="number" value={form.puntos_victoria} onChange={(e) => set("puntos_victoria", Number(e.target.value))} />
          </div>
          <div>
            <Label>Pts empate</Label>
            <Input type="number" value={form.puntos_empate} onChange={(e) => set("puntos_empate", Number(e.target.value))} />
          </div>
          <div>
            <Label>Pts derrota</Label>
            <Input type="number" value={form.puntos_derrota} onChange={(e) => set("puntos_derrota", Number(e.target.value))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha inicio</Label>
            <Input type="date" value={form.fecha_inicio} onChange={(e) => set("fecha_inicio", e.target.value)} />
          </div>
          <div>
            <Label>Fecha fin</Label>
            <Input type="date" value={form.fecha_fin} onChange={(e) => set("fecha_fin", e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Organizadores</Label>
          <Input value={form.organizadores} onChange={(e) => set("organizadores", e.target.value)} placeholder="AD Miraflores · CD Bustarviejo" />
        </div>
        <div>
          <Label>Descripción / presentación</Label>
          <Textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={3} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          {onCancel && <Button variant="outline" onClick={onCancel}>Cancelar</Button>}
          <Button onClick={handleSubmit} disabled={isSaving || !form.nombre.trim()}>
            {isSaving ? "Guardando..." : "Guardar torneo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}