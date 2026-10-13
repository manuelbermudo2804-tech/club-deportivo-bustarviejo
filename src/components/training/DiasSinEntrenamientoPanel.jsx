import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, CalendarOff, Plus } from "lucide-react";
import { toast } from "sonner";

const formatoDia = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};

export default function DiasSinEntrenamientoPanel({ canEdit = false, categorias = [] }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [fecha, setFecha] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [cats, setCats] = useState([]);

  const { data: dias = [] } = useQuery({
    queryKey: ["sinEntrenamiento"],
    queryFn: () => base44.entities.SinEntrenamiento.list("-fecha", 200),
    initialData: [],
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["sinEntrenamiento"] });
  };

  const crear = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.SinEntrenamiento.create({
        fecha,
        fecha_fin: fechaFin || undefined,
        motivo: motivo || undefined,
        categorias: cats,
        creado_por: user?.email,
      });
    },
    onSuccess: () => {
      invalidar();
      setShowForm(false);
      setFecha(""); setFechaFin(""); setMotivo(""); setCats([]);
      toast.success("Día sin entrenamiento guardado");
    },
    onError: () => toast.error("No se pudo guardar"),
  });

  const borrar = useMutation({
    mutationFn: (id) => base44.entities.SinEntrenamiento.delete(id),
    onSuccess: () => { invalidar(); toast.success("Eliminado"); },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const hoyISO = new Date().toISOString().slice(0, 10);
  const proximos = dias.filter((d) => (d.fecha_fin || d.fecha).slice(0, 10) >= hoyISO);

  const toggleCat = (c) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  // Familias, jugadores y staff sin permiso: si no hay días marcados, no se muestra nada
  if (!canEdit && proximos.length === 0) return null;

  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
          <CalendarOff className="w-5 h-5 text-red-600" />
          Días sin entrenamiento
        </CardTitle>
        {canEdit && (
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 sm:w-auto">
            <Plus className="w-4 h-4 mr-1" /> Marcar días
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-3 sm:p-4">
        <p className="text-sm text-slate-500">
          {canEdit
            ? "Marca aquí las fiestas patronales, puentes o cierres de instalaciones. Esos días la app no avisará de entrenamientos a familias ni jugadores."
            : "Estos días no hay entrenamiento."}
        </p>

        {showForm && canEdit && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Desde</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <Label>Hasta (opcional)</Label>
                <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Motivo</Label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Fiestas patronales" />
            </div>
            {categorias.length > 0 && (
              <div>
                <Label className="mb-2 block">Categorías afectadas (ninguna = todas)</Label>
                <div className="flex flex-wrap gap-2">
                  {categorias.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCat(c)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        cats.includes(c)
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                onClick={() => crear.mutate()}
                disabled={!fecha || crear.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Guardar
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {proximos.length === 0 ? (
          <p className="text-sm text-slate-400">No hay días marcados próximamente.</p>
        ) : (
          <div className="space-y-2">
            {proximos.map((d) => (
              <div key={d.id} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 sm:gap-3 sm:p-3">
                <CalendarOff className="h-4 w-4 shrink-0 text-orange-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize leading-snug text-slate-800">
                    {formatoDia(d.fecha)}
                    {d.fecha_fin && d.fecha_fin !== d.fecha ? ` → ${formatoDia(d.fecha_fin)}` : ""}
                  </p>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-500">
                    {d.motivo || "Sin entrenamiento"}
                    {" · "}
                    {(d.categorias || []).length === 0 ? "Todas las categorías" : (d.categorias || []).join(", ")}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 rounded-lg text-red-600"
                    onClick={() => borrar.mutate(d.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}