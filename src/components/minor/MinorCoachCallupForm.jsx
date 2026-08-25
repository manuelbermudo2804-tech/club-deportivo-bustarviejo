import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Formulario simple para que un entrenador en prácticas con acceso completo
// pueda crear una convocatoria del equipo. Se guarda SIN publicar: la publica
// un entrenador adulto.
export default function MinorCoachCallupForm({ onCreated }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    titulo: "", rival: "", fecha_partido: "", hora_partido: "",
    hora_concentracion: "", ubicacion: "", descripcion: "",
  });
  const [seleccionados, setSeleccionados] = useState([]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { data: rosterData } = useQuery({
    queryKey: ["minorCoachRoster"],
    queryFn: async () => {
      const res = await base44.functions.invoke("minorCoachTeam", { action: "roster" });
      return res.data;
    },
    retry: false,
  });
  const roster = rosterData?.roster || [];

  const crear = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("minorCoachTeam", {
        action: "createCallup",
        convocatoria: { ...form, jugadores_ids: seleccionados },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practicasCallups"] });
      setForm({ titulo: "", rival: "", fecha_partido: "", hora_partido: "", hora_concentracion: "", ubicacion: "", descripcion: "" });
      setSeleccionados([]);
      toast.success("Convocatoria creada (pendiente de publicar por un entrenador)");
      onCreated?.();
    },
    onError: () => toast.error("No se pudo crear la convocatoria"),
  });

  const listo = form.titulo && form.fecha_partido && form.hora_partido && form.ubicacion && seleccionados.length > 0;

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="p-4 space-y-2.5">
        <h2 className="font-bold text-slate-900 text-sm">✍️ Nueva convocatoria</h2>
        <Input placeholder="Título (ej: Partido vs Miraflores)" value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
        <Input placeholder="Rival (opcional)" value={form.rival} onChange={(e) => set("rival", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={form.fecha_partido} onChange={(e) => set("fecha_partido", e.target.value)} />
          <Input type="time" value={form.hora_partido} onChange={(e) => set("hora_partido", e.target.value)} />
        </div>
        <Input type="time" placeholder="Hora de concentración" value={form.hora_concentracion} onChange={(e) => set("hora_concentracion", e.target.value)} />
        <Input placeholder="Lugar" value={form.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} />
        <Input placeholder="Notas (opcional)" value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} />

        <div className="pt-1">
          <p className="text-xs font-semibold text-slate-600 mb-1">
            Convocados ({seleccionados.length}/{roster.length})
          </p>
          <div className="max-h-52 overflow-y-auto space-y-1">
            {roster.map((p) => (
              <label key={p.id} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                <Checkbox
                  checked={seleccionados.includes(p.id)}
                  onCheckedChange={(v) =>
                    setSeleccionados((prev) => (v ? [...prev, p.id] : prev.filter((id) => id !== p.id)))
                  }
                />
                <span className="text-sm text-slate-800 truncate">{p.nombre}</span>
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={() => crear.mutate()}
          disabled={!listo || crear.isPending}
          className="w-full h-11 bg-green-600 hover:bg-green-700"
        >
          {crear.isPending ? "Creando…" : "Crear convocatoria"}
        </Button>
        <p className="text-[11px] text-slate-500">
          Se guarda como borrador: un entrenador adulto la revisa y la publica.
        </p>
      </CardContent>
    </Card>
  );
}