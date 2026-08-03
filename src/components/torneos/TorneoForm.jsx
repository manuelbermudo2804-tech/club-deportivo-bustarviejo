import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SedesEditor from "./SedesEditor";
import OrganizadoresEditor from "./OrganizadoresEditor";

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
    formato_liguilla: initial?.formato_liguilla || "grupos",
    partidos_por_equipo: initial?.partidos_por_equipo ?? 3,
    fases_finales: initial?.fases_finales || [],
    puntos_victoria: initial?.puntos_victoria ?? 3,
    puntos_empate: initial?.puntos_empate ?? 1,
    puntos_derrota: initial?.puntos_derrota ?? 0,
    fecha_inicio: initial?.fecha_inicio || "",
    fecha_fin: initial?.fecha_fin || "",
    organizadores: initial?.organizadores || "",
    organizadores_logos: initial?.organizadores_logos || [],
    descripcion: initial?.descripcion || "",
    logo_url: initial?.logo_url || "",
    sedes: initial?.sedes || [],
  }));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleDeporte = (deporte) => {
    const preset = DEPORTE_PRESETS[deporte] || DEPORTE_PRESETS["Otro"];
    setForm((f) => ({ ...f, deporte, ...preset }));
  };

  // El nombre siempre se edita. El slug solo se autogenera al crear (torneo nuevo);
  // al editar un torneo existente el slug se toca manualmente en su propio campo.
  const handleNombre = (nombre) => {
    setForm((f) => ({
      ...f,
      nombre,
      slug: initial ? f.slug : slugify(nombre),
    }));
  };

  const setFase = (idx, k, v) => {
    setForm((f) => {
      const next = [...(f.fases_finales || [])];
      next[idx] = { ...next[idx], [k]: v };
      return { ...f, fases_finales: next };
    });
  };
  const addFase = () => {
    const claves = ["oro", "plata", "bronce"];
    const usadas = (form.fases_finales || []).map((x) => x.clave);
    const clave = claves.find((c) => !usadas.includes(c)) || "oro";
    const nombreFase = { oro: "Fase Oro", plata: "Fase Plata", bronce: "Fase Bronce" }[clave];
    set("fases_finales", [...(form.fases_finales || []), { clave, nombre: nombreFase, desde: 1, hasta: 8, sede_id: "" }]);
  };
  const delFase = (idx) => set("fases_finales", (form.fases_finales || []).filter((_, i) => i !== idx));

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

        <div className="pt-2 border-t space-y-3">
          <div>
            <Label>Formato de la liguilla</Label>
            <Select value={form.formato_liguilla} onValueChange={(v) => set("formato_liguilla", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grupos">Varios grupos (todos contra todos)</SelectItem>
                <SelectItem value="grupo_unico">Grupo único (partidos y horarios manuales)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1">
              {form.formato_liguilla === "grupo_unico"
                ? "Un solo grupo. Cada equipo juega N partidos que defines a mano (rival, sede y hora). Clasificación general única."
                : "Se crean grupos y todos juegan contra todos dentro de su grupo."}
            </p>
          </div>

          {form.formato_liguilla === "grupo_unico" && (
            <>
              <div>
                <Label>Partidos por equipo</Label>
                <Input type="number" min={1} value={form.partidos_por_equipo}
                  onChange={(e) => set("partidos_por_equipo", Number(e.target.value))} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fases finales (cortes de la clasificación)</Label>
                  <Button variant="outline" size="sm" onClick={addFase}>+ Añadir fase</Button>
                </div>
                {(form.fases_finales || []).length === 0 && (
                  <p className="text-xs text-slate-400">Ej: Oro 1º-16º · Plata 17º-24º</p>
                )}
                {(form.fases_finales || []).map((fase, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-lg border grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs">Nombre</Label>
                      <Input className="h-8 text-sm" value={fase.nombre || ""}
                        onChange={(e) => setFase(idx, "nombre", e.target.value)} placeholder="Fase Oro" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Desde</Label>
                      <Input className="h-8 text-sm" type="number" min={1} value={fase.desde ?? ""}
                        onChange={(e) => setFase(idx, "desde", Number(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Hasta</Label>
                      <Input className="h-8 text-sm" type="number" min={1} value={fase.hasta ?? ""}
                        onChange={(e) => setFase(idx, "hasta", Number(e.target.value))} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Sede</Label>
                      <Select value={fase.sede_id || "__none__"} onValueChange={(v) => setFase(idx, "sede_id", v === "__none__" ? "" : v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin definir</SelectItem>
                          {(form.sedes || []).map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <button onClick={() => delFase(idx)} className="col-span-1 text-red-400 hover:text-red-600 pb-2 text-sm">✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
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
          <Label>Organizadores (texto)</Label>
          <Input value={form.organizadores} onChange={(e) => set("organizadores", e.target.value)} placeholder="AD Miraflores · CD Bustarviejo" />
        </div>
        <div className="pt-2 border-t">
          <OrganizadoresEditor value={form.organizadores_logos} onChange={(v) => set("organizadores_logos", v)} />
        </div>
        <div>
          <Label>Descripción / presentación</Label>
          <Textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={3} />
        </div>

        <div className="pt-2 border-t">
          <SedesEditor value={form.sedes} onChange={(sedes) => set("sedes", sedes)} />
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