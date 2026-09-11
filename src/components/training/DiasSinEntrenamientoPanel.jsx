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

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
          <CalendarOff className="w-5 h-5 text-red-600" />
          Días sin entrenamiento
        </CardTitle>
        {canEdit && (
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-slate-800 hover:bg-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Marcar días
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          Marca aquí las fiestas patronales, puentes o cierres de instalaciones. Esos días la app no
          avisará de entrenamientos a familias ni jugadores.
        </p>

        {showForm && canEdit && (
          <div className="border rounded-xl p-4 space-y-3 bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className={`text-xs px-3 py-1 rounded-full border ${
                        cats.includes(c)
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-white text-slate-600 border-slate-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
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
              <div key={d.id} className="flex items-center gap-3 border rounded-lg p-3">
                <CalendarOff className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm capitalize">
                    {formatoDia(d.fecha)}
                    {d.fecha_fin && d.fecha_fin !== d.fecha ? ` → ${formatoDia(d.fecha_fin)}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {d.motivo || "Sin entrenamiento"}
                    {" · "}
                    {(d.categorias || []).length === 0 ? "Todas las categorías" : (d.categorias || []).join(", ")}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
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